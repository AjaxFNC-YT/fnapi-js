import { describe, expect, it } from 'vitest';
import { DillyAPI } from '../../src/dilly/index.js';
import { ValidationError, NotFoundError } from '../../src/core/errors.js';
import type { DillyAPIOptions } from '../../src/dilly/options.js';
import { createMockFetch, type MockFetch } from '../helpers/mockFetch.js';

const DILLY_HOST = 'https://api.fortniteapi.com';

function createClient(mock: MockFetch, options: DillyAPIOptions = {}): DillyAPI {
  return new DillyAPI({ ...options, fetch: mock.fetch, retry: false });
}

function ok(body: unknown): MockFetch {
  return createMockFetch({ status: 200, body });
}

function fail(status: number): MockFetch {
  return createMockFetch({ status, body: { error: 'nope' } });
}

describe('DillyAPI aes', () => {
  it('requests /v1/aes on the fortniteapi.com host and returns the raw body', async () => {
    const body = { version: '30.00', mainKey: '0x00', dynamicKeys: [], unloaded: [] };
    const mock = ok(body);
    const client = createClient(mock);

    const result = await client.aes.keys();

    expect(result).toEqual(body);
    expect(mock.lastRequest().url.startsWith(DILLY_HOST)).toBe(true);
    expect(mock.lastRequest().path).toBe('/v1/aes');
  });

  it('forwards the version query param', async () => {
    const mock = ok({});
    const client = createClient(mock);

    await client.aes.keys({ version: '30.10' });

    expect(mock.lastRequest().query.get('version')).toBe('30.10');
  });

  it('url-encodes the pak id in the path', async () => {
    const mock = ok({});
    const client = createClient(mock);

    await client.aes.forPak('pakchunk10/foo');

    expect(mock.lastRequest().path).toBe('/v1/aes/pakchunk10%2Ffoo');
  });

  it('rejects a blank pak id without a request', async () => {
    const mock = ok({});
    const client = createClient(mock);

    await expect(client.aes.cosmetics('  ')).rejects.toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });
});

describe('DillyAPI list endpoints', () => {
  it('returns a plain array for versions', async () => {
    const body = [{ version: { id: '1', build: '30.00', platform: 'Windows' } }];
    const mock = ok(body);
    const client = createClient(mock);

    const result = await client.common.versions();

    expect(result).toEqual(body);
    expect(mock.lastRequest().path).toBe('/v1/versions');
  });

  it('exposes a top-level versions shortcut', async () => {
    const mock = ok([]);
    const client = createClient(mock);

    await client.versions();

    expect(mock.lastRequest().path).toBe('/v1/versions');
  });

  it('requests manifests and a single manifest by id', async () => {
    const mock = ok([]);
    const client = createClient(mock);

    await client.manifests.list();
    expect(mock.lastRequest().path).toBe('/v1/manifests');

    await client.manifests.get('abc-123');
    expect(mock.lastRequest().path).toBe('/v1/manifests/abc-123');
  });

  it('requests mappings and legacy mappings', async () => {
    const mock = ok([]);
    const client = createClient(mock);

    await client.mappings.list();
    expect(mock.lastRequest().path).toBe('/v1/mappings');

    await client.mappings.legacy();
    expect(mock.lastRequest().path).toBe('/v1/mappings/legacy');
  });
});

describe('DillyAPI cosmetics', () => {
  it('forwards the Type filter', async () => {
    const mock = ok({ hash: 'x', entries: 0, bytes: 0, data: [] });
    const client = createClient(mock);

    await client.cosmetics.list({ type: 'AthenaCharacter' });

    expect(mock.lastRequest().path).toBe('/v1/cosmetics');
    expect(mock.lastRequest().query.get('Type')).toBe('AthenaCharacter');
  });

  it('requests bundles from a date', async () => {
    const mock = ok({ hash: 'x', entries: 0, bytes: 0, data: [] });
    const client = createClient(mock);

    await client.cosmetics.bundlesFrom('2025-01-01');

    expect(mock.lastRequest().path).toBe('/v1/cosmetics/bundles/2025-01-01');
  });
});

describe('DillyAPI cloud storage', () => {
  it('forwards the lang query param to hotfixes', async () => {
    const mock = ok({});
    const client = createClient(mock);

    await client.cloudStorage.hotfixes({ lang: 'en' });

    expect(mock.lastRequest().path).toBe('/v1/cloudstorage/hotfixes');
    expect(mock.lastRequest().query.get('lang')).toBe('en');
  });
});

describe('DillyAPI export', () => {
  it('requires a path and forwards path/raw/version', async () => {
    const mock = ok({ hash: 'x', entries: 0, bytes: 0, jsonOutput: [] });
    const client = createClient(mock);

    await client.exports.get({ path: 'FortniteGame/Content/Foo', raw: true, version: '30.00' });

    expect(mock.lastRequest().path).toBe('/v1/export');
    expect(mock.lastRequest().query.get('path')).toBe('FortniteGame/Content/Foo');
    expect(mock.lastRequest().query.get('raw')).toBe('true');
    expect(mock.lastRequest().query.get('version')).toBe('30.00');
  });

  it('rejects a blank export path without a request', async () => {
    const mock = ok({});
    const client = createClient(mock);

    // @ts-expect-error missing required path
    await expect(client.exports.get({})).rejects.toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });

  it('requests the search endpoint with query and new params', async () => {
    const mock = ok({ hash: 'x', entries: 0, bytes: 0, jsonOutput: [] });
    const client = createClient(mock);

    await client.exports.search({ query: 'renegade', new: true });

    expect(mock.lastRequest().path).toBe('/v1/export/search');
    expect(mock.lastRequest().query.get('query')).toBe('renegade');
    expect(mock.lastRequest().query.get('new')).toBe('true');
  });

  it('routes the export list helpers to their paths', async () => {
    const mock = ok({ hash: 'x', entries: 0, bytes: 0, jsonOutput: [] });
    const client = createClient(mock);

    await client.exports.seasons();
    expect(mock.lastRequest().path).toBe('/v1/export/seasons');

    await client.exports.cosmeticsSets();
    expect(mock.lastRequest().path).toBe('/v1/export/cosmetics/sets');

    await client.exports.displayAssets();
    expect(mock.lastRequest().path).toBe('/v1/export/displayassets');
  });
});

describe('DillyAPI errors', () => {
  it('maps a 404 to NotFoundError', async () => {
    const mock = fail(404);
    const client = createClient(mock);

    await expect(client.manifests.get('missing')).rejects.toBeInstanceOf(NotFoundError);
  });
});
