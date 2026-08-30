import { describe, expect, it } from 'vitest';
import { FnccAPI } from '../../src/fncc/index.js';
import { ValidationError, NotFoundError } from '../../src/core/errors.js';
import type { FnccAPIOptions } from '../../src/fncc/options.js';
import { createMockFetch, type MockFetch } from '../helpers/mockFetch.js';

const FNCC_HOST = 'https://prod.fn-api.cc';

function createClient(mock: MockFetch, options: FnccAPIOptions = {}): FnccAPI {
  return new FnccAPI({ ...options, fetch: mock.fetch, retry: false });
}

function ok(body: unknown): MockFetch {
  return createMockFetch({ status: 200, body });
}

function fail(status: number): MockFetch {
  return createMockFetch({ status, body: { error: 'nope' } });
}

describe('FnccAPI game', () => {
  it('requests /v1/version on the prod host and returns the raw body', async () => {
    const body = { gameVersion: '30.00', datasetBuild: 'b1', publishedAt: 'now', complete: true, categories: {} };
    const mock = ok(body);
    const client = createClient(mock);

    const result = await client.game.version();

    expect(result).toEqual(body);
    expect(mock.lastRequest().url.startsWith(FNCC_HOST)).toBe(true);
    expect(mock.lastRequest().path).toBe('/v1/version');
  });

  it('exposes flat version/aes/mappings shortcuts', async () => {
    const mock = ok({});
    const client = createClient(mock);

    await client.aes();
    expect(mock.lastRequest().path).toBe('/v1/aes');

    await client.mappings();
    expect(mock.lastRequest().path).toBe('/v1/mappings');
  });
});

describe('FnccAPI status', () => {
  it('routes the status helpers to their paths (raw passthrough)', async () => {
    const mock = ok({ ready: true });
    const client = createClient(mock);

    await client.status.overview();
    expect(mock.lastRequest().path).toBe('/v1/status');

    await client.status.download();
    expect(mock.lastRequest().path).toBe('/v1/status/download');

    await client.status.parser();
    expect(mock.lastRequest().path).toBe('/v1/status/parser');

    await client.status.maintenance();
    expect(mock.lastRequest().path).toBe('/v1/status/maintenance');
  });
});

describe('FnccAPI cosmetics', () => {
  it('unwraps the enveloped categories map', async () => {
    const mock = ok({ status: 200, data: { br: 16276, cars: 1618 } });
    const client = createClient(mock);

    const result = await client.cosmetics.categories();

    expect(result).toEqual({ br: 16276, cars: 1618 });
    expect(mock.lastRequest().path).toBe('/v1/cosmetics/categories');
  });

  it('unwraps a single category array and encodes the path', async () => {
    const mock = ok({ status: 200, data: [{ id: 'x' }] });
    const client = createClient(mock);

    const result = await client.cosmetics.category('br');

    expect(result).toEqual([{ id: 'x' }]);
    expect(mock.lastRequest().path).toBe('/v1/cosmetics/br');
  });

  it('keeps the total metadata on category search and forwards filters', async () => {
    const body = { status: 200, total: 2, data: [] };
    const mock = ok(body);
    const client = createClient(mock);

    const result = await client.cosmetics.search('br', { name: 'renegade', matchMethod: 'full', limit: 5 });

    expect(result).toEqual(body);
    expect(mock.lastRequest().path).toBe('/v1/cosmetics/br/search');
    expect(mock.lastRequest().query.get('name')).toBe('renegade');
    expect(mock.lastRequest().query.get('matchMethod')).toBe('full');
    expect(mock.lastRequest().query.get('limit')).toBe('5');
  });

  it('rejects a blank category without a request', async () => {
    const mock = ok({});
    const client = createClient(mock);

    await expect(client.cosmetics.category('  ')).rejects.toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });
});

describe('FnccAPI banners', () => {
  it('unwraps banner colors', async () => {
    const mock = ok({ status: 200, data: [{ id: 'defaultcolor1' }] });
    const client = createClient(mock);

    const result = await client.banners.colors();

    expect(result).toEqual([{ id: 'defaultcolor1' }]);
    expect(mock.lastRequest().path).toBe('/v1/banners/colors');
  });
});

describe('FnccAPI sprites', () => {
  it('returns the full sprites envelope with count metadata and forwards filters', async () => {
    const body = { status: 200, hotfixAppliedAt: null, hotfixRules: [], count: 1, data: [] };
    const mock = ok(body);
    const client = createClient(mock);

    const result = await client.sprites.list({ enabled: true, library: 'core' });

    expect(result).toEqual(body);
    expect(mock.lastRequest().path).toBe('/v1/sprites');
    expect(mock.lastRequest().query.get('enabled')).toBe('true');
    expect(mock.lastRequest().query.get('library')).toBe('core');
  });

  it('unwraps a single sprite by id', async () => {
    const mock = ok({ status: 200, data: { id: 'LlamaSprite' } });
    const client = createClient(mock);

    const result = await client.sprites.get('LlamaSprite');

    expect(result).toEqual({ id: 'LlamaSprite' });
    expect(mock.lastRequest().path).toBe('/v1/sprites/LlamaSprite');
  });

  it('rejects a blank sprite id without a request', async () => {
    const mock = ok({});
    const client = createClient(mock);

    await expect(client.sprites.get('')).rejects.toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });
});

describe('FnccAPI search and assets', () => {
  it('sends q plus paging on the path search', async () => {
    const mock = ok({ total: 0, offset: 0, limit: 10, items: [] });
    const client = createClient(mock);

    await client.search.paths('renegade', { offset: 5, limit: 10 });

    expect(mock.lastRequest().path).toBe('/v1/search');
    expect(mock.lastRequest().query.get('q')).toBe('renegade');
    expect(mock.lastRequest().query.get('offset')).toBe('5');
    expect(mock.lastRequest().query.get('limit')).toBe('10');
  });

  it('forwards the asset list filters', async () => {
    const mock = ok({ total: 0, offset: 0, limit: 1, items: [] });
    const client = createClient(mock);

    await client.assets.list({ prefix: 'FortniteGame/Content', extension: 'uasset', limit: 1 });

    expect(mock.lastRequest().path).toBe('/v1/assets');
    expect(mock.lastRequest().query.get('prefix')).toBe('FortniteGame/Content');
    expect(mock.lastRequest().query.get('extension')).toBe('uasset');
    expect(mock.lastRequest().query.get('limit')).toBe('1');
  });

  it('requires an export path without a request', async () => {
    const mock = ok([]);
    const client = createClient(mock);

    await expect(client.assets.exports('')).rejects.toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });
});

describe('FnccAPI images', () => {
  it('builds an absolute image url with query params and never requests', () => {
    const mock = ok({});
    const client = createClient(mock);

    const url = client.images.url({ path: 'Foo/Bar', format: 'png', maxSize: 256 });

    expect(url.startsWith(`${FNCC_HOST}/v1/images`)).toBe(true);
    const parsed = new URL(url);
    expect(parsed.searchParams.get('path')).toBe('Foo/Bar');
    expect(parsed.searchParams.get('format')).toBe('png');
    expect(parsed.searchParams.get('maxSize')).toBe('256');
    expect(mock.calls).toBe(0);
  });

  it('rejects a blank image path', () => {
    const mock = ok({});
    const client = createClient(mock);

    expect(() => client.images.url({ path: '' })).toThrow(ValidationError);
  });
});

describe('FnccAPI cosmetics get', () => {
  it('unwraps a single cosmetic and encodes the category and id', async () => {
    const mock = ok({ status: 200, data: { id: 'CID_028' } });
    const client = createClient(mock);

    const result = await client.cosmetics.get('br', 'CID_028');

    expect(result).toEqual({ id: 'CID_028' });
    expect(mock.lastRequest().path).toBe('/v1/cosmetics/br/CID_028');
  });
});

describe('FnccAPI weapons', () => {
  it('keeps the weapons envelope and forwards filters', async () => {
    const body = { status: 200, total: 3, count: 1, data: [] };
    const mock = ok(body);
    const client = createClient(mock);

    const result = await client.weapons.list({ search: 'ar', rarity: 'legendary', limit: 1 });

    expect(result).toEqual(body);
    expect(mock.lastRequest().path).toBe('/v1/weapons');
    expect(mock.lastRequest().query.get('search')).toBe('ar');
    expect(mock.lastRequest().query.get('rarity')).toBe('legendary');
    expect(mock.lastRequest().query.get('limit')).toBe('1');
  });

  it('unwraps categories and a single weapon', async () => {
    const mock = ok({ status: 200, data: { categories: {} } });
    const client = createClient(mock);

    await client.weapons.categories();
    expect(mock.lastRequest().path).toBe('/v1/weapons/categories');

    await client.weapons.get('WID_Assault', { includeRaw: true });
    expect(mock.lastRequest().path).toBe('/v1/weapons/WID_Assault');
    expect(mock.lastRequest().query.get('includeRaw')).toBe('true');
  });
});

describe('FnccAPI news', () => {
  it('returns the full news envelope and unwraps a single feed', async () => {
    const body = { status: 200, feedCount: 2, messageCount: 4, data: [] };
    const mock = ok(body);
    const client = createClient(mock);

    const result = await client.news.all();
    expect(result).toEqual(body);
    expect(mock.lastRequest().path).toBe('/v1/news');

    await client.news.feed('br');
    expect(mock.lastRequest().path).toBe('/v1/news/br');
  });
});

describe('FnccAPI playlists', () => {
  it('unwraps the playlist list and a single playlist with fetchImages', async () => {
    const mock = ok({ status: 200, data: [] });
    const client = createClient(mock);

    await client.playlists.list({ ranked: true });
    expect(mock.lastRequest().path).toBe('/v1/playlists');
    expect(mock.lastRequest().query.get('ranked')).toBe('true');

    await client.playlists.get('Playlist_DefaultSolo', { fetchImages: true });
    expect(mock.lastRequest().path).toBe('/v1/playlists/Playlist_DefaultSolo');
    expect(mock.lastRequest().query.get('fetchImages')).toBe('true');
  });
});

describe('FnccAPI fish', () => {
  it('unwraps the fish list and forwards filters', async () => {
    const mock = ok({ status: 200, data: [] });
    const client = createClient(mock);

    await client.fish.list({ rarity: 'rare', needsProFishingRod: false });
    expect(mock.lastRequest().path).toBe('/v1/fish');
    expect(mock.lastRequest().query.get('rarity')).toBe('rare');
    expect(mock.lastRequest().query.get('needsProFishingRod')).toBe('false');

    await client.fish.get('Fish_Small');
    expect(mock.lastRequest().path).toBe('/v1/fish/Fish_Small');
  });
});

describe('FnccAPI item shop', () => {
  it('keeps the item shop envelope and reads sections', async () => {
    const body = { status: 200, offerCount: 1, resetsAt: 'now', data: [] };
    const mock = ok(body);
    const client = createClient(mock);

    const result = await client.itemshop.current();
    expect(result).toEqual(body);
    expect(mock.lastRequest().path).toBe('/v1/itemshop');

    await client.itemshop.sections();
    expect(mock.lastRequest().path).toBe('/v1/itemshop/sections');
  });
});

describe('FnccAPI lightswitch', () => {
  it('keeps the lightswitch envelope and unwraps a single service', async () => {
    const body = { status: 200, allUp: true, serviceCount: 1, data: [] };
    const mock = ok(body);
    const client = createClient(mock);

    const result = await client.lightswitch.all();
    expect(result).toEqual(body);
    expect(mock.lastRequest().path).toBe('/v1/lightswitch');

    await client.lightswitch.service('fortnite');
    expect(mock.lastRequest().path).toBe('/v1/lightswitch/fortnite');
  });
});

describe('FnccAPI lookup', () => {
  it('sends name and accountId query params to the lookup path', async () => {
    const body = { status: 200, exactCount: 0, moreCount: 0, count: 0, exact: [], more: [], query: {} };
    const mock = ok(body);
    const client = createClient(mock);

    await client.lookup.byName('Ninja');
    expect(mock.lastRequest().path).toBe('/v1/lookup');
    expect(mock.lastRequest().query.get('name')).toBe('Ninja');

    await client.lookup.byAccountId('abc123');
    expect(mock.lastRequest().query.get('accountId')).toBe('abc123');
  });
});

describe('FnccAPI mnemonic', () => {
  it('unwraps the mnemonic list and a single mnemonic', async () => {
    const mock = ok({ status: 200, data: [] });
    const client = createClient(mock);

    await client.mnemonic.list({ type: 'island' });
    expect(mock.lastRequest().path).toBe('/v1/mnemonic');
    expect(mock.lastRequest().query.get('type')).toBe('island');

    await client.mnemonic.get('1234-5678-9012');
    expect(mock.lastRequest().path).toBe('/v1/mnemonic/1234-5678-9012');
  });
});

describe('FnccAPI discovery', () => {
  it('keeps the discovery envelope and unwraps a single surface', async () => {
    const body = { status: 200, surfaceCount: 1, panelCount: 0, resultCount: 0, data: [] };
    const mock = ok(body);
    const client = createClient(mock);

    const result = await client.discovery.all();
    expect(result).toEqual(body);
    expect(mock.lastRequest().path).toBe('/v1/discovery');

    await client.discovery.surface('CreativeDiscoverySurface_Frontend');
    expect(mock.lastRequest().path).toBe('/v1/discovery/CreativeDiscoverySurface_Frontend');
  });
});

describe('FnccAPI cloud storage', () => {
  it('unwraps the file list and reads raw file content', async () => {
    const mock = ok({ status: 200, data: [] });
    const client = createClient(mock);

    await client.cloudstorage.list();
    expect(mock.lastRequest().path).toBe('/v1/cloudstorage');

    await client.cloudstorage.file('DefaultEngine.ini');
    expect(mock.lastRequest().path).toBe('/v1/cloudstorage/DefaultEngine.ini');
  });
});

describe('FnccAPI anticheat', () => {
  it('unwraps the anticheat info and reads a single file', async () => {
    const mock = ok({ status: 200, data: {} });
    const client = createClient(mock);

    await client.anticheat.info();
    expect(mock.lastRequest().path).toBe('/v1/anticheat');

    await client.anticheat.file('BE');
    expect(mock.lastRequest().path).toBe('/v1/anticheat/files/BE');
  });
});

describe('FnccAPI errors', () => {
  it('maps a 404 to NotFoundError', async () => {
    const mock = fail(404);
    const client = createClient(mock);

    await expect(client.sprites.get('missing')).rejects.toBeInstanceOf(NotFoundError);
  });
});
