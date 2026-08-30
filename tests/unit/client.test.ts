import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FortniteAPI } from '../../src/fortnite/client.js';
import { Language, ResponseFlags } from '../../src/fortnite/enums.js';
import { ApiClient, VERSION } from '../../src/index.js';
import { DEFAULT_BASE_URL } from '../../src/fortnite/routes.js';
import type { FortniteAPIOptions } from '../../src/fortnite/options.js';
import { bannerFixture, shopFixture } from '../helpers/fixtures.js';
import { createMockFetch, envelope, type MockFetch } from '../helpers/mockFetch.js';
const here = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(
  readFileSync(resolve(here, '../../package.json'), 'utf8'),
) as { version: string };

function createClient(mock: MockFetch, options: FortniteAPIOptions = {}): FortniteAPI {
  return new FortniteAPI({ ...options, fetch: mock.fetch, retry: false });
}

function bannersMock(): MockFetch {
  return createMockFetch({ status: 200, body: envelope([bannerFixture]) });
}

describe('FortniteAPI construction', () => {
  it('constructs without options', () => {
    const client = new FortniteAPI();

    expect(client.apiKey).toBeNull();
    expect(client.baseUrl).toBe(DEFAULT_BASE_URL);
  });

  it('exposes every endpoint namespace', () => {
    const client = new FortniteAPI();

    expect(client.rest).toBeDefined();
    expect(client.aes).toBeDefined();
    expect(client.banners).toBeDefined();
    expect(client.cosmetics).toBeDefined();
    expect(client.creatorCode).toBeDefined();
    expect(client.map).toBeDefined();
    expect(client.news).toBeDefined();
    expect(client.playlists).toBeDefined();
    expect(client.shop).toBeDefined();
    expect(client.stats).toBeDefined();
  });

  it('aliases sac to the creator code endpoint', () => {
    const client = new FortniteAPI();

    expect(client.sac).toBe(client.creatorCode);
  });

  it('normalizes a custom base url', () => {
    const client = new FortniteAPI({ baseUrl: 'https://proxy.example.com/api/' });

    expect(client.baseUrl).toBe('https://proxy.example.com/api');
  });

  it('uses a custom base url for requests', async () => {
    const mock = bannersMock();
    const client = createClient(mock, { baseUrl: 'https://proxy.example.com/api' });

    await client.banners.all();

    expect(mock.lastRequest().url).toBe('https://proxy.example.com/api/v1/banners');
    expect(mock.lastRequest().path).toBe('/api/v1/banners');
  });
});

describe('FortniteAPI api key', () => {
  it('reads the configured api key', () => {
    const client = new FortniteAPI({ apiKey: 'configured-key' });

    expect(client.apiKey).toBe('configured-key');
  });

  it('sets and clears the api key and the authorization header follows', async () => {
    const mock = bannersMock();
    const client = createClient(mock);

    await client.banners.all();
    expect(mock.lastRequest().headers['authorization']).toBeUndefined();

    client.setApiKey('runtime-key');
    expect(client.apiKey).toBe('runtime-key');

    await client.banners.all();
    expect(mock.lastRequest().headers['authorization']).toBe('runtime-key');

    client.setApiKey(null);
    expect(client.apiKey).toBeNull();

    await client.banners.all();
    expect(mock.lastRequest().headers['authorization']).toBeUndefined();
  });
});

describe('FortniteAPI defaults', () => {
  it('applies setLanguage to subsequent requests', async () => {
    const mock = bannersMock();
    const client = createClient(mock);

    await client.banners.all();
    expect(mock.lastRequest().query.get('language')).toBeNull();

    client.setLanguage(Language.PortugueseBrazil);
    expect(client.language).toBe(Language.PortugueseBrazil);

    await client.banners.all();
    expect(mock.lastRequest().query.get('language')).toBe('pt-BR');

    client.setLanguage(undefined);
    await client.banners.all();
    expect(mock.lastRequest().query.get('language')).toBeNull();
  });

  it('applies setResponseFlags to subsequent requests', async () => {
    const mock = createMockFetch({ status: 200, body: envelope(shopFixture) });
    const client = createClient(mock);

    await client.shop.get();
    expect(mock.lastRequest().query.get('responseFlags')).toBeNull();

    client.setResponseFlags(ResponseFlags.Paths | ResponseFlags.ShopHistory);

    await client.shop.get();
    expect(mock.lastRequest().query.get('responseFlags')).toBe('0x5');
  });

  it('adds a default header to requests', async () => {
    const mock = bannersMock();
    const client = createClient(mock);

    client.setHeader('x-test-header', 'test-value');
    await client.banners.all();

    expect(mock.lastRequest().headers['x-test-header']).toBe('test-value');
  });

  it('clears the response cache', async () => {
    const mock = bannersMock();
    const client = createClient(mock, { cache: true });

    await client.banners.all();
    await client.banners.all();
    expect(mock.calls).toBe(1);

    client.clearCache();

    await client.banners.all();
    expect(mock.calls).toBe(2);
  });

  it('returns this from every setter', () => {
    const client = new FortniteAPI();

    expect(client.setApiKey('key')).toBe(client);
    expect(client.setLanguage(Language.English)).toBe(client);
    expect(client.setResponseFlags(ResponseFlags.Paths)).toBe(client);
    expect(client.setHeader('x-chain', 'value')).toBe(client);
    expect(client.clearCache()).toBe(client);
  });
});

describe('package exports', () => {
  it('exports ApiClient as an alias of FortniteAPI', () => {
    expect(ApiClient).toBe(FortniteAPI);
  });

  it('exports a VERSION matching package.json', () => {
    expect(VERSION).toBe(packageJson.version);
  });
});
