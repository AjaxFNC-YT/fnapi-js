import { describe, expect, it } from 'vitest';
import { FortniteAPI } from '../../src/fortnite/client.js';
import { Language, ALL_RESPONSE_FLAGS, ResponseFlags } from '../../src/fortnite/enums.js';
import { ValidationError } from '../../src/core/errors.js';
import type { FortniteAPIOptions } from '../../src/fortnite/options.js';
import type { Shop, ShopEntry } from '../../src/fortnite/types.js';
import {
  brCosmeticFixture,
  carFixture,
  instrumentFixture,
  legoKitFixture,
  secondBrCosmeticFixture,
  secondShopEntryFixture,
  shopEntryFixture,
  shopFixture,
  trackFixture,
} from '../helpers/fixtures.js';
import { createMockFetch, envelope, type MockFetch } from '../helpers/mockFetch.js';
interface TestClient {
  client: FortniteAPI;
  mock: MockFetch;
}

function createClient(shop: Shop, options: FortniteAPIOptions = {}): TestClient {
  const mock = createMockFetch({ body: envelope(shop) });
  const client = new FortniteAPI({ fetch: mock.fetch, retry: false, ...options });
  return { client, mock };
}

function withEntries(entries: ShopEntry[]): Shop {
  return { ...shopFixture, entries };
}

function entryWithoutLayout(): ShopEntry {
  const entry: ShopEntry = {
    ...shopEntryFixture,
    offerId: 'v2:/offer-no-layout',
    layoutId: 'Fallback.1',
  };
  delete entry.layout;
  return entry;
}

const trackEntryFixture: ShopEntry = {
  ...shopEntryFixture,
  offerId: 'v2:/offer-track',
  brItems: [],
  tracks: [trackFixture],
};

const instrumentEntryFixture: ShopEntry = {
  ...shopEntryFixture,
  offerId: 'v2:/offer-instrument',
  brItems: [],
  instruments: [instrumentFixture],
};

const carEntryFixture: ShopEntry = {
  ...shopEntryFixture,
  offerId: 'v2:/offer-car',
  brItems: [],
  cars: [carFixture],
};

const legoKitEntryFixture: ShopEntry = {
  ...shopEntryFixture,
  offerId: 'v2:/offer-legokit',
  brItems: [],
  legoKits: [legoKitFixture],
};

describe('ShopEndpoint.get', () => {
  it('requests /v2/shop and unwraps data', async () => {
    const { client, mock } = createClient(shopFixture);

    const result = await client.shop.get();

    expect(mock.calls).toBe(1);
    expect(mock.lastRequest().path).toBe('/v2/shop');
    expect(result).toEqual(shopFixture);
  });

  it('sends the client language and response flags', async () => {
    const { client, mock } = createClient(shopFixture, {
      language: Language.German,
      responseFlags: ALL_RESPONSE_FLAGS,
    });

    await client.shop.get();

    expect(mock.lastRequest().query.get('language')).toBe('de');
    expect(mock.lastRequest().query.get('responseFlags')).toBe('0x7');
  });

  it('honours per-call language and response flags', async () => {
    const { client, mock } = createClient(shopFixture, { language: Language.German });

    await client.shop.get({ language: Language.French, responseFlags: ResponseFlags.ShopHistory });

    expect(mock.lastRequest().query.get('language')).toBe('fr');
    expect(mock.lastRequest().query.get('responseFlags')).toBe('0x4');
  });

  it('omits language and response flags when nothing is configured', async () => {
    const { client, mock } = createClient(shopFixture);

    await client.shop.get();

    expect(mock.lastRequest().query.get('language')).toBeNull();
    expect(mock.lastRequest().query.get('responseFlags')).toBeNull();
  });
});

describe('ShopEndpoint.entries', () => {
  it('returns the shop entries', async () => {
    const { client, mock } = createClient(shopFixture);

    const entries = await client.shop.entries();

    expect(mock.lastRequest().path).toBe('/v2/shop');
    expect(entries).toEqual(shopFixture.entries);
  });
});

describe('ShopEndpoint.sections', () => {
  it('groups entries by layout name', async () => {
    const { client } = createClient(shopFixture);

    const sections = await client.shop.sections();

    expect(sections).toBeInstanceOf(Map);
    expect([...sections.keys()]).toEqual(['Outfits', 'Emotes']);
    expect(sections.get('Outfits')).toEqual([shopEntryFixture]);
    expect(sections.get('Emotes')).toEqual([secondShopEntryFixture]);
  });

  it('collects multiple entries under the same layout name', async () => {
    const extraOutfit: ShopEntry = { ...shopEntryFixture, offerId: 'v2:/offer-3' };
    const { client } = createClient(withEntries([shopEntryFixture, extraOutfit]));

    const sections = await client.shop.sections();

    expect(sections.size).toBe(1);
    expect(sections.get('Outfits')).toEqual([shopEntryFixture, extraOutfit]);
  });

  it('falls back to the layoutId when the layout is absent', async () => {
    const fallbackEntry = entryWithoutLayout();
    const { client } = createClient(withEntries([fallbackEntry]));

    const sections = await client.shop.sections();

    expect([...sections.keys()]).toEqual(['Fallback.1']);
    expect(sections.get('Fallback.1')).toEqual([fallbackEntry]);
  });
});

describe('ShopEndpoint.byOfferId', () => {
  it('returns the matching entry', async () => {
    const { client } = createClient(shopFixture);

    const entry = await client.shop.byOfferId(secondShopEntryFixture.offerId);

    expect(entry).toEqual(secondShopEntryFixture);
  });

  it('returns null when no entry matches', async () => {
    const { client } = createClient(shopFixture);

    await expect(client.shop.byOfferId('v2:/missing')).resolves.toBeNull();
  });

  it('rejects with a ValidationError for a blank offerId', async () => {
    const { client, mock } = createClient(shopFixture);

    await expect(client.shop.byOfferId('   ')).rejects.toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });
});

describe('ShopEndpoint.containing', () => {
  const cosmeticCases: Array<{ label: string; entry: ShopEntry; cosmeticId: string }> = [
    { label: 'brItems', entry: shopEntryFixture, cosmeticId: brCosmeticFixture.id },
    { label: 'tracks', entry: trackEntryFixture, cosmeticId: trackFixture.id },
    { label: 'instruments', entry: instrumentEntryFixture, cosmeticId: instrumentFixture.id },
    { label: 'cars', entry: carEntryFixture, cosmeticId: carFixture.id },
    { label: 'legoKits', entry: legoKitEntryFixture, cosmeticId: legoKitFixture.id },
  ];

  for (const cosmeticCase of cosmeticCases) {
    it(`matches cosmetic ids inside ${cosmeticCase.label}`, async () => {
      const { client } = createClient(
        withEntries([secondShopEntryFixture, cosmeticCase.entry]),
      );

      const matches = await client.shop.containing(cosmeticCase.cosmeticId);

      expect(matches).toEqual([cosmeticCase.entry]);
    });
  }

  it('returns every entry that contains the cosmetic', async () => {
    const duplicate: ShopEntry = { ...shopEntryFixture, offerId: 'v2:/offer-duplicate' };
    const { client } = createClient(
      withEntries([shopEntryFixture, secondShopEntryFixture, duplicate]),
    );

    const matches = await client.shop.containing(brCosmeticFixture.id);

    expect(matches).toEqual([shopEntryFixture, duplicate]);
  });

  it('returns an empty array when nothing matches', async () => {
    const { client } = createClient(shopFixture);

    await expect(client.shop.containing('CID_Unknown')).resolves.toEqual([]);
  });

  it('rejects with a ValidationError for a blank cosmeticId', async () => {
    const { client, mock } = createClient(shopFixture);

    await expect(client.shop.containing('')).rejects.toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });
});

describe('ShopEndpoint.isInShop', () => {
  it('returns true when the cosmetic is in the shop', async () => {
    const { client } = createClient(shopFixture);

    await expect(client.shop.isInShop(secondBrCosmeticFixture.id)).resolves.toBe(true);
  });

  it('returns true for a cosmetic found outside brItems', async () => {
    const { client } = createClient(withEntries([trackEntryFixture]));

    await expect(client.shop.isInShop(trackFixture.id)).resolves.toBe(true);
  });

  it('returns false when the cosmetic is not in the shop', async () => {
    const { client } = createClient(shopFixture);

    await expect(client.shop.isInShop('CID_Unknown')).resolves.toBe(false);
  });
});
