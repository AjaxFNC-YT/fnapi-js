import { describe, expect, it } from 'vitest';
import { CosmeticSearchBuilder } from '../../src/fortnite/search.js';
import { FortniteAPI } from '../../src/fortnite/client.js';
import { Language, MatchMethod, ALL_RESPONSE_FLAGS, ResponseFlags } from '../../src/fortnite/enums.js';
import { ValidationError, NotFoundError, ServerError } from '../../src/core/errors.js';
import type { FortniteAPIOptions } from '../../src/fortnite/options.js';
import {
  allCosmeticsFixture,
  beanFixture,
  brCosmeticFixture,
  carFixture,
  instrumentFixture,
  legoFixture,
  legoKitFixture,
  newCosmeticsFixture,
  secondBrCosmeticFixture,
  trackFixture,
} from '../helpers/fixtures.js';
import {
  createMockFetch,
  envelope,
  errorEnvelope,
  type MockFetch,
  type MockResponseInit,
} from '../helpers/mockFetch.js';
interface TestClient {
  client: FortniteAPI;
  mock: MockFetch;
}

function createClient(response: MockResponseInit, options: FortniteAPIOptions = {}): TestClient {
  const mock = createMockFetch(response);
  const client = new FortniteAPI({ fetch: mock.fetch, retry: false, ...options });
  return { client, mock };
}

function okClient(payload: unknown, options: FortniteAPIOptions = {}): TestClient {
  return createClient({ body: envelope(payload) }, options);
}

const collectionCases: Array<{
  method: string;
  path: string;
  payload: unknown;
  call: (client: FortniteAPI) => Promise<unknown>;
}> = [
  {
    method: 'all',
    path: '/v2/cosmetics',
    payload: allCosmeticsFixture,
    call: (client) => client.cosmetics.all(),
  },
  {
    method: 'newCosmetics',
    path: '/v2/cosmetics/new',
    payload: newCosmeticsFixture,
    call: (client) => client.cosmetics.newCosmetics(),
  },
  {
    method: 'br',
    path: '/v2/cosmetics/br',
    payload: [brCosmeticFixture, secondBrCosmeticFixture],
    call: (client) => client.cosmetics.br(),
  },
  {
    method: 'tracks',
    path: '/v2/cosmetics/tracks',
    payload: [trackFixture],
    call: (client) => client.cosmetics.tracks(),
  },
  {
    method: 'instruments',
    path: '/v2/cosmetics/instruments',
    payload: [instrumentFixture],
    call: (client) => client.cosmetics.instruments(),
  },
  {
    method: 'cars',
    path: '/v2/cosmetics/cars',
    payload: [carFixture],
    call: (client) => client.cosmetics.cars(),
  },
  {
    method: 'lego',
    path: '/v2/cosmetics/lego',
    payload: [legoFixture],
    call: (client) => client.cosmetics.lego(),
  },
  {
    method: 'legoKits',
    path: '/v2/cosmetics/lego/kits',
    payload: [legoKitFixture],
    call: (client) => client.cosmetics.legoKits(),
  },
  {
    method: 'beans',
    path: '/v2/cosmetics/beans',
    payload: [beanFixture],
    call: (client) => client.cosmetics.beans(),
  },
];

describe('CosmeticsEndpoint collections', () => {
  for (const collection of collectionCases) {
    it(`${collection.method}() requests ${collection.path} and unwraps data`, async () => {
      const { client, mock } = okClient(collection.payload);

      const result = await collection.call(client);

      expect(mock.calls).toBe(1);
      expect(mock.lastRequest().path).toBe(collection.path);
      expect(result).toEqual(collection.payload);
    });
  }
});

describe('CosmeticsEndpoint.byId', () => {
  it('requests the single cosmetic route and unwraps data', async () => {
    const { client, mock } = okClient(brCosmeticFixture);

    const result = await client.cosmetics.byId('CID_028_Athena_Commando_F');

    expect(mock.lastRequest().path).toBe('/v2/cosmetics/br/CID_028_Athena_Commando_F');
    expect(result).toEqual(brCosmeticFixture);
  });

  it('url-encodes the cosmetic id', async () => {
    const { client, mock } = okClient(brCosmeticFixture);

    await client.cosmetics.byId('CID 028/Athena?Commando');

    expect(mock.lastRequest().path).toBe('/v2/cosmetics/br/CID%20028%2FAthena%3FCommando');
  });

  it.each([
    ['empty', ''],
    ['blank', '   '],
  ])('rejects with ValidationError for an %s id without making a request', async (_label, cosmeticId) => {
    const { client, mock } = okClient(brCosmeticFixture);

    await expect(client.cosmetics.byId(cosmeticId)).rejects.toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });

  it('rejects with ValidationError for a non-string id without making a request', async () => {
    const { client, mock } = okClient(brCosmeticFixture);

    await expect(client.cosmetics.byId(42 as unknown as string)).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(mock.calls).toBe(0);
  });
});

describe('CosmeticsEndpoint.byIds', () => {
  it('requests the ids route and repeats the id parameter', async () => {
    const { client, mock } = okClient([brCosmeticFixture, secondBrCosmeticFixture]);
    const ids = [brCosmeticFixture.id, secondBrCosmeticFixture.id];

    const result = await client.cosmetics.byIds(ids);

    expect(mock.lastRequest().path).toBe('/v2/cosmetics/br/search/ids');
    expect(mock.lastRequest().query.getAll('id')).toEqual(ids);
    expect(result).toEqual([brCosmeticFixture, secondBrCosmeticFixture]);
  });

  it('rejects with ValidationError for an empty array without making a request', async () => {
    const { client, mock } = okClient([]);

    await expect(client.cosmetics.byIds([])).rejects.toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });

  it('rejects with ValidationError for a non-array value without making a request', async () => {
    const { client, mock } = okClient([]);

    await expect(client.cosmetics.byIds('CID_028' as unknown as string[])).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(mock.calls).toBe(0);
  });
});

describe('CosmeticsEndpoint search', () => {
  it('search() requests the search route with the normalized params', async () => {
    const { client, mock } = okClient(brCosmeticFixture);

    const result = await client.cosmetics.search({
      name: 'Renegade Raider',
      matchMethod: MatchMethod.Contains,
    });

    expect(mock.lastRequest().path).toBe('/v2/cosmetics/br/search');
    expect(mock.lastRequest().query.get('name')).toBe('Renegade Raider');
    expect(mock.lastRequest().query.get('matchMethod')).toBe('contains');
    expect(result).toEqual(brCosmeticFixture);
  });

  it('searchAll() requests the search-all route with the normalized params', async () => {
    const { client, mock } = okClient([brCosmeticFixture, secondBrCosmeticFixture]);

    const result = await client.cosmetics.searchAll({ type: 'outfit', hasVariants: false });

    expect(mock.lastRequest().path).toBe('/v2/cosmetics/br/search/all');
    expect(mock.lastRequest().query.get('type')).toBe('outfit');
    expect(mock.lastRequest().query.get('hasVariants')).toBe('false');
    expect(result).toEqual([brCosmeticFixture, secondBrCosmeticFixture]);
  });

  it('accepts a CosmeticSearchBuilder instance', async () => {
    const { client, mock } = okClient(brCosmeticFixture);

    await client.cosmetics.search(new CosmeticSearchBuilder().name('Ghoul Trooper').hasSeries());

    expect(mock.lastRequest().path).toBe('/v2/cosmetics/br/search');
    expect(mock.lastRequest().query.get('name')).toBe('Ghoul Trooper');
    expect(mock.lastRequest().query.get('hasSeries')).toBe('true');
  });
});

describe('CosmeticsEndpoint find helpers', () => {
  it('find() returns null when the API responds with 404', async () => {
    const { client } = createClient({
      status: 404,
      body: errorEnvelope(404, 'Cosmetic not found'),
    });

    await expect(client.cosmetics.find({ name: 'Missing' })).resolves.toBeNull();
  });

  it('find() rethrows server errors', async () => {
    const { client } = createClient({
      status: 500,
      body: errorEnvelope(500, 'Internal Server Error'),
    });

    await expect(client.cosmetics.find({ name: 'Missing' })).rejects.toBeInstanceOf(ServerError);
  });

  it('findById() returns null when the API responds with 404', async () => {
    const { client } = createClient({
      status: 404,
      body: errorEnvelope(404, 'Cosmetic not found'),
    });

    await expect(client.cosmetics.findById('CID_Unknown')).resolves.toBeNull();
  });

  it('findById() rethrows server errors', async () => {
    const { client } = createClient({
      status: 500,
      body: errorEnvelope(500, 'Internal Server Error'),
    });

    await expect(client.cosmetics.findById('CID_Unknown')).rejects.toBeInstanceOf(ServerError);
  });

  it('findById() resolves the cosmetic when the request succeeds', async () => {
    const { client } = okClient(brCosmeticFixture);

    await expect(client.cosmetics.findById(brCosmeticFixture.id)).resolves.toEqual(
      brCosmeticFixture,
    );
  });

  it('surfaces a 404 as NotFoundError from byId()', async () => {
    const { client } = createClient({
      status: 404,
      body: errorEnvelope(404, 'Cosmetic not found'),
    });

    await expect(client.cosmetics.byId('CID_Unknown')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('CosmeticsEndpoint language handling', () => {
  it('sends the client language on every request', async () => {
    const { client, mock } = okClient(allCosmeticsFixture, { language: Language.German });

    await client.cosmetics.all();
    expect(mock.lastRequest().query.get('language')).toBe('de');

    await client.cosmetics.byId(brCosmeticFixture.id);
    expect(mock.lastRequest().query.get('language')).toBe('de');
  });

  it('omits the language when no default is configured', async () => {
    const { client, mock } = okClient(allCosmeticsFixture);

    await client.cosmetics.all();

    expect(mock.lastRequest().query.get('language')).toBeNull();
  });

  it('lets a per-call language override the client default', async () => {
    const { client, mock } = okClient(allCosmeticsFixture, { language: Language.German });

    await client.cosmetics.all({ language: Language.French });

    expect(mock.lastRequest().query.get('language')).toBe('fr');
  });

  it('applies setLanguage() to subsequent requests', async () => {
    const { client, mock } = okClient(allCosmeticsFixture, { language: Language.German });

    await client.cosmetics.all();
    expect(mock.lastRequest().query.get('language')).toBe('de');

    client.setLanguage(Language.Japanese);
    await client.cosmetics.all();

    expect(mock.lastRequest().query.get('language')).toBe('ja');
  });
});

describe('CosmeticsEndpoint responseFlags handling', () => {
  const flagCases: Array<{ label: string; input: number | string; expected: string | null }> = [
    { label: 'a numeric value as lowercase hex', input: 3, expected: '0x3' },
    { label: 'ResponseFlags.None', input: ResponseFlags.None, expected: null },
    { label: 'zero', input: 0, expected: null },
    { label: 'ALL_RESPONSE_FLAGS', input: ALL_RESPONSE_FLAGS, expected: '0x7' },
    { label: 'a hex string', input: '0x5', expected: '0x5' },
  ];

  for (const flagCase of flagCases) {
    it(`serializes ${flagCase.label}`, async () => {
      const { client, mock } = okClient(allCosmeticsFixture);

      await client.cosmetics.all({ responseFlags: flagCase.input });

      expect(mock.lastRequest().query.get('responseFlags')).toBe(flagCase.expected);
    });
  }

  it('omits the parameter when no flags are configured', async () => {
    const { client, mock } = okClient(allCosmeticsFixture);

    await client.cosmetics.all();

    expect(mock.lastRequest().query.get('responseFlags')).toBeNull();
  });

  it('applies the client default to every request', async () => {
    const { client, mock } = okClient(allCosmeticsFixture, { responseFlags: ALL_RESPONSE_FLAGS });

    await client.cosmetics.br();
    expect(mock.lastRequest().query.get('responseFlags')).toBe('0x7');

    await client.cosmetics.byId(brCosmeticFixture.id);
    expect(mock.lastRequest().query.get('responseFlags')).toBe('0x7');
  });

  it('lets a per-call value override the client default', async () => {
    const { client, mock } = okClient(allCosmeticsFixture, { responseFlags: ALL_RESPONSE_FLAGS });

    await client.cosmetics.all({ responseFlags: ResponseFlags.Paths });

    expect(mock.lastRequest().query.get('responseFlags')).toBe('0x1');
  });

  it('lets a per-call ResponseFlags.None drop the client default', async () => {
    const { client, mock } = okClient(allCosmeticsFixture, { responseFlags: ALL_RESPONSE_FLAGS });

    await client.cosmetics.all({ responseFlags: ResponseFlags.None });

    expect(mock.lastRequest().query.get('responseFlags')).toBeNull();
  });
});
