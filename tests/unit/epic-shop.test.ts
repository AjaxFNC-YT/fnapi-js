import { describe, expect, it, vi } from 'vitest';
import { Shop, ShopEntry, Gifting } from '../../src/epic/shop.js';
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
} {
  const mcp = vi.fn().mockResolvedValue({ profileRevision: 2, profileChanges: [] });
  const byDisplayName = vi
    .fn()
    .mockImplementation((name: string) => Promise.resolve({ id: 'a'.repeat(32), displayName: name }));
  const storefront = vi.fn().mockResolvedValue(catalog);
  const session = {
    accountId: 'ACC',
    mcpOperation: mcp,
    accountByDisplayName: byDisplayName,
    storefrontCatalog: storefront,
  } as unknown as EpicAuthSession;
  return { session, mcp, byDisplayName, storefront };
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
