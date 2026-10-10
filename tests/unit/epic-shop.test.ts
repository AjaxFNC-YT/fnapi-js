import { describe, expect, it, vi } from 'vitest';
import { Shop, ShopEntry, Gifting, ShopError, parsePurchaseHistory, shopErrorReason } from '../../src/epic/shop.js';
import { EpicApiError } from '../../src/epic/errors.js';
import { ValidationError } from '../../src/core/errors.js';
import type { EpicAuthSession } from '../../src/epic/session.js';
import type { StorefrontCatalog } from '../../src/epic/shop.js';

const catalog: StorefrontCatalog = {
  expiration: '2026-08-23T00:00:00.000Z',
  refreshIntervalHrs: 24,
  storefronts: [
    {
      name: 'BRWeeklyStorefront',
      catalogEntries: [
        {
          offerId: 'v2:/offer_renegade',
          devName: '[VIRTUAL]1 x Renegade Raider for 1200 MtxCurrency',
          offerType: 'StaticPage',
          title: 'Renegade Raider',
          categories: ['Panel 01'],
          prices: [
            {
              currencyType: 'MtxCurrency',
              currencySubType: 'Currency',
              regularPrice: 1200,
              finalPrice: 1200,
              basePrice: 1200,
            },
          ],
          giftInfo: { bIsEnabled: true },
          itemGrants: [{ templateId: 'AthenaCharacter:CID_028_Athena_Commando_F', quantity: 1 }],
        },
        {
          offerId: 'v2:/offer_floss',
          devName: '[VIRTUAL]1 x Floss for 500 MtxCurrency',
          offerType: 'StaticPage',
          metaInfo: [{ key: 'DisplayName', value: 'Floss' }],
          prices: [
            {
              currencyType: 'MtxCurrency',
              currencySubType: 'Currency',
              regularPrice: 500,
              finalPrice: 500,
              basePrice: 500,
            },
          ],
          giftInfo: { bIsEnabled: false },
          itemGrants: [{ templateId: 'AthenaDance:EID_Floss', quantity: 1 }],
        },
      ],
    },
  ],
};

function mockSession(): {
  session: EpicAuthSession;
  mcp: ReturnType<typeof vi.fn>;
  byDisplayName: ReturnType<typeof vi.fn>;
  storefront: ReturnType<typeof vi.fn>;
  eligibility: ReturnType<typeof vi.fn>;
} {
  const mcp = vi.fn().mockResolvedValue({ profileRevision: 2, profileChanges: [] });
  const byDisplayName = vi
    .fn()
    .mockImplementation((name: string) => Promise.resolve({ id: 'a'.repeat(32), displayName: name }));
  const storefront = vi.fn().mockResolvedValue(catalog);
  const eligibility = vi.fn().mockResolvedValue({
    price: { currencyType: 'MtxCurrency', currencySubType: '', finalPrice: 1200, regularPrice: 1200 },
    items: [{ templateId: 'AthenaCharacter:cid_028_athena_commando_f', quantity: 1 }],
    ownership: [],
  });
  const session = {
    accountId: 'ACC',
    mcpOperation: mcp,
    accountByDisplayName: byDisplayName,
    storefrontCatalog: storefront,
    giftEligibility: eligibility,
  } as unknown as EpicAuthSession;
  return { session, mcp, byDisplayName, storefront, eligibility };
}

describe('Shop parsing', () => {
  it('parses catalog entries into ShopEntry objects', () => {
    const { session } = mockSession();
    const shop = new Shop(session, catalog);

    expect(shop.entries).toHaveLength(2);
    const renegade = shop.byOfferId('v2:/offer_renegade')!;
    expect(renegade).toBeInstanceOf(ShopEntry);
    expect(renegade.displayName).toBe('Renegade Raider');
    expect(renegade.storefront).toBe('BRWeeklyStorefront');
    expect(renegade.giftable).toBe(true);
    expect(renegade.price?.finalPrice).toBe(1200);
    expect(renegade.items[0]).toEqual({
      templateId: 'AthenaCharacter:CID_028_Athena_Commando_F',
      quantity: 1,
    });
  });

  it('reads a display name out of metaInfo when there is no title', () => {
    const { session } = mockSession();
    const shop = new Shop(session, catalog);
    expect(shop.byOfferId('v2:/offer_floss')?.displayName).toBe('Floss');
  });

  it('exposes the expiration and only giftable entries', () => {
    const { session } = mockSession();
    const shop = new Shop(session, catalog);
    expect(shop.expiration).toBe('2026-08-23T00:00:00.000Z');
    expect(shop.giftable.map((entry) => entry.offerId)).toEqual(['v2:/offer_renegade']);
  });
});

describe('Shop lookup', () => {
  it('finds entries by offerId, devName and display name', () => {
    const { session } = mockSession();
    const shop = new Shop(session, catalog);

    expect(shop.find('v2:/offer_renegade')?.offerId).toBe('v2:/offer_renegade');
    expect(shop.find('Renegade Raider')?.offerId).toBe('v2:/offer_renegade');
    expect(shop.find('floss')?.offerId).toBe('v2:/offer_floss');
    expect(shop.search('raider')).toHaveLength(1);
  });

  it('re-fetches the catalog on refresh', async () => {
    const { session, storefront } = mockSession();
    const shop = new Shop(session, catalog);
    await shop.refresh();
    expect(storefront).toHaveBeenCalledTimes(1);
    expect(shop.entries).toHaveLength(2);
  });
});

describe('Gifting via ShopEntry', () => {
  it('issues a GiftCatalogEntry payload for a single receiver', async () => {
    const { session, mcp } = mockSession();
    const shop = new Shop(session, catalog);
    const receiver = 'b'.repeat(32);

    const [result] = await shop.gift('Renegade Raider', receiver, { message: 'gg' });

    expect(mcp).toHaveBeenCalledWith('GiftCatalogEntry', {
      profileId: 'common_core',
      payload: {
        offerId: 'v2:/offer_renegade',
        currency: 'MtxCurrency',
        currencySubType: 'Currency',
        expectedTotalPrice: 1200,
        gameContext: 'Frontend.CatabaScreen',
        receiverAccountIds: [receiver],
        giftWrapTemplateId: '',
        personalMessage: 'gg',
      },
    });
    expect(result!.totalPrice).toBe(1200);
    expect(result!.receiverAccountIds).toEqual([receiver]);
  });

  it('resolves display names to account ids and multiplies the price per receiver', async () => {
    const { session, mcp, byDisplayName } = mockSession();
    const shop = new Shop(session, catalog);
    const entry = shop.byOfferId('v2:/offer_renegade')!;

    await entry.gift(['SomeFriend', 'c'.repeat(32)]);

    expect(byDisplayName).toHaveBeenCalledWith('SomeFriend', undefined);
    const payload = mcp.mock.calls[0]?.[1].payload;
    expect(payload.receiverAccountIds).toEqual(['a'.repeat(32), 'c'.repeat(32)]);
    expect(payload.expectedTotalPrice).toBe(2400);
  });

  it('dedupes repeated receivers', async () => {
    const { session, mcp } = mockSession();
    const shop = new Shop(session, catalog);
    const id = 'd'.repeat(32);

    await shop.byOfferId('v2:/offer_renegade')!.gift([id, id]);
    expect(mcp.mock.calls[0]?.[1].payload.receiverAccountIds).toEqual([id]);
  });
});

describe('Gifting standalone', () => {
  it('gifts an arbitrary offer with an explicit price', async () => {
    const { session, mcp } = mockSession();
    const gifting = new Gifting(session);
    const id = 'e'.repeat(32);

    await gifting.gift('v2:/some_offer', id, { price: 800, currencySubType: 'Currency' });

    expect(mcp.mock.calls[0]?.[1].payload).toMatchObject({
      offerId: 'v2:/some_offer',
      expectedTotalPrice: 800,
      receiverAccountIds: [id],
    });
  });

  it('toggles gift receiving', async () => {
    const { session, mcp } = mockSession();
    await new Gifting(session).setReceiveGiftsEnabled(true);

    expect(mcp).toHaveBeenCalledWith('SetReceiveGiftsEnabled', {
      profileId: 'common_core',
      payload: { bReceiveGifts: true },
    });
  });

  it('rejects an empty gift target', async () => {
    const { session } = mockSession();
    await expect(new Gifting(session).gift('v2:/x', [])).rejects.toBeInstanceOf(ValidationError);
  });
});

function epicError(errorCode: string, status = 400): EpicApiError {
  return new EpicApiError(errorCode, {
    status,
    method: 'POST',
    url: 'https://fngw-mcp-gc-livefn.ol.epicgames.com/x',
    body: { errorCode, errorMessage: errorCode, numericErrorCode: 1, messageVars: [] },
    headers: {},
  });
}

describe('Shop errors and pre-checks', () => {
  it('maps Epic error codes to shop error reasons', () => {
    expect(shopErrorReason('errors.com.epicgames.modules.gameplayutils.not_enough_mtx')).toBe('not-enough-vbucks');
    expect(shopErrorReason('errors.com.epicgames.modules.gamesubcatalog.receiver_will_not_accept_gifts')).toBe('gifts-disabled');
    expect(shopErrorReason('errors.com.epicgames.modules.gamesubcatalog.gift_limit_reached')).toBe('gift-limit-reached');
    expect(shopErrorReason('something.else')).toBe('unknown');
  });

  it('refuses a gift before sending it when a receiver is not eligible', async () => {
    const { session, mcp, eligibility } = mockSession();
    eligibility.mockRejectedValueOnce(epicError('errors.com.epicgames.modules.gamesubcatalog.purchase_not_allowed', 403));
    const shop = new Shop(session, catalog);
    const error = await shop.byOfferId('v2:/offer_renegade')!.gift('a'.repeat(32)).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ShopError);
    expect((error as ShopError).reason).toBe('already-owned');
    expect((error as ShopError).accountIds).toEqual(['a'.repeat(32)]);
    expect(mcp).not.toHaveBeenCalled();
  });

  it('reports eligibility per receiver', async () => {
    const { session, eligibility } = mockSession();
    eligibility.mockRejectedValueOnce(epicError('errors.com.epicgames.modules.gamesubcatalog.gift_recipient_is_not_eligible_friend'));
    const shop = new Shop(session, catalog);
    const checks = await shop.byOfferId('v2:/offer_renegade')!.checkGift(['a'.repeat(32), 'b'.repeat(32)]);
    expect(checks.map((check) => [check.eligible, check.reason])).toEqual([
      [false, 'not-friends'],
      [true, null],
    ]);
    expect(checks[1]?.price?.finalPrice).toBe(1200);
  });

  it('skips the pre-check on request and turns a rejected gift into a ShopError', async () => {
    const { session, mcp, eligibility } = mockSession();
    mcp.mockRejectedValueOnce(epicError('errors.com.epicgames.modules.gamesubcatalog.gift_limit_reached'));
    const shop = new Shop(session, catalog);
    const error = await shop
      .byOfferId('v2:/offer_renegade')!
      .gift('a'.repeat(32), { precheck: false })
      .catch((caught: unknown) => caught);
    expect(eligibility).not.toHaveBeenCalled();
    expect(error).toMatchObject({ name: 'ShopError', reason: 'gift-limit-reached' });
  });
});

describe('Purchasing', () => {
  it('sends PurchaseCatalogEntry with the entry price times quantity', async () => {
    const { session, mcp } = mockSession();
    mcp.mockResolvedValueOnce({
      profileRevision: 3,
      profileChanges: [],
      notifications: [
        { type: 'CatalogPurchase', lootResult: { items: [{ itemType: 'AthenaCharacter:cid_028', itemGuid: 'g', itemProfile: 'athena', quantity: 1 }] } },
      ],
    });
    const shop = new Shop(session, catalog);
    const result = await shop.purchase('v2:/offer_renegade', { quantity: 2 });
    const [operation, options] = mcp.mock.calls[0]!;
    expect(operation).toBe('PurchaseCatalogEntry');
    expect(options.payload).toMatchObject({ offerId: 'v2:/offer_renegade', purchaseQuantity: 2, expectedTotalPrice: 2400 });
    expect(result.items).toEqual([{ templateId: 'AthenaCharacter:cid_028', quantity: 1, itemGuid: 'g', profileId: 'athena' }]);
  });

  it('turns not enough V-Bucks into a ShopError', async () => {
    const { session, mcp } = mockSession();
    mcp.mockRejectedValueOnce(epicError('errors.com.epicgames.modules.gameplayutils.not_enough_mtx'));
    const shop = new Shop(session, catalog);
    await expect(shop.purchase('v2:/offer_renegade')).rejects.toMatchObject({ reason: 'not-enough-vbucks' });
  });

  it('parses the purchase history newest first', () => {
    const history = parsePurchaseHistory({
      mtx_purchase_history: {
        refundCredits: 2,
        refundsUsed: 13,
        tokenRefreshReferenceTime: '2026-09-28T00:00:00.000Z',
        purchases: [
          { purchaseId: 'old', offerId: 'o1', purchaseDate: '2026-01-01T00:00:00.000Z', totalMtxPaid: 800, lootResult: [] },
          {
            purchaseId: 'new',
            offerId: 'o2',
            purchaseDate: '2026-09-28T00:13:49.985Z',
            totalMtxPaid: 1200,
            refundType: 'UserRefundable',
            lootResult: [{ itemType: 'AthenaPickaxe:pickaxe_id_376_fncs', quantity: 1, itemGuid: 'g', itemProfile: 'athena' }],
          },
        ],
      },
    });
    expect(history).toMatchObject({ refundCredits: 2, refundsUsed: 13 });
    expect(history.purchases.map((purchase) => purchase.purchaseId)).toEqual(['new', 'old']);
    expect(history.purchases[0]?.items[0]?.templateId).toBe('AthenaPickaxe:pickaxe_id_376_fncs');
  });
});
