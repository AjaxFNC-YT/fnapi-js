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

describe('FnccAPI cosmetics extras', () => {
  it('searches every category with filters and keeps the total/count envelope', async () => {
    const body = { status: 200, total: 1, count: 1, data: [{ id: 'x', category: 'br' }] };
    const mock = ok(body);
    const client = createClient(mock);

    const result = await client.cosmetics.searchAll({ search: 'hiroshi', matchMethod: 'starts', limit: 5 });
    expect(result).toEqual(body);
    expect(mock.lastRequest().path).toBe('/v1/cosmetics');
    expect(mock.lastRequest().query.get('search')).toBe('hiroshi');
    expect(mock.lastRequest().query.get('matchMethod')).toBe('starts');
    expect(mock.lastRequest().query.get('limit')).toBe('5');
  });

  it('refuses an unfiltered searchAll, which would download the whole catalogue', async () => {
    const mock = ok({});
    const client = createClient(mock);
    await expect(client.cosmetics.searchAll({ limit: 5 })).rejects.toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });

  it('forwards the search filter on a category search and reads cosmetic types', async () => {
    const mock = ok({ status: 200, total: 0, data: [] });
    const client = createClient(mock);

    await client.cosmetics.search('tracks', { search: 'weeknd' });
    expect(mock.lastRequest().path).toBe('/v1/cosmetics/tracks/search');
    expect(mock.lastRequest().query.get('search')).toBe('weeknd');

    await client.cosmetics.types();
    expect(mock.lastRequest().path).toBe('/v1/cosmetics/types');
  });

  it('unwraps the rarity tiers', async () => {
    const mock = ok({ status: 200, data: [{ value: 'epic' }] });
    const client = createClient(mock);
    expect(await client.rarities.list()).toEqual([{ value: 'epic' }]);
    expect(mock.lastRequest().path).toBe('/v1/rarities');
  });
});

describe('FnccAPI asset paths', () => {
  it('pages bare paths and builds a text-stream url', async () => {
    const mock = ok({ total: 1, offset: 0, limit: 5, items: ['a'] });
    const client = createClient(mock);

    const page = await client.assets.paths({ q: 'CID_206', extension: 'uasset', limit: 5 });
    expect(page.items).toEqual(['a']);
    expect(mock.lastRequest().path).toBe('/v1/assets/paths');
    expect(mock.lastRequest().query.get('q')).toBe('CID_206');

    const url = new URL(client.assets.pathsTextUrl({ prefix: 'FortniteGame/Content', limit: 0 }));
    expect(url.pathname).toBe('/v1/assets/paths');
    expect(url.searchParams.get('format')).toBe('text');
    expect(url.searchParams.get('limit')).toBe('0');
  });

  it('fixes one path with GET and many with a POSTed array', async () => {
    const mock = createMockFetch(
      { status: 200, body: { input: 'x', found: true } },
      { status: 200, body: [{ input: 'a' }, { input: 'b' }] },
    );
    const client = createClient(mock);

    await client.assets.fixPath('FortniteGame/Content/x.uasset');
    expect(mock.lastRequest().method).toBe('GET');
    expect(mock.lastRequest().path).toBe('/v1/assets/fix-path');
    expect(mock.lastRequest().query.get('path')).toBe('FortniteGame/Content/x.uasset');

    const fixed = await client.assets.fixPaths(['a', 'b']);
    expect(fixed).toHaveLength(2);
    expect(mock.lastRequest().method).toBe('POST');
    expect(JSON.parse(mock.lastRequest().body ?? 'null')).toEqual(['a', 'b']);
  });

  it('rejects an empty or blank fixPaths batch without a request', async () => {
    const mock = ok([]);
    const client = createClient(mock);
    await expect(client.assets.fixPaths([])).rejects.toBeInstanceOf(ValidationError);
    await expect(client.assets.fixPaths(['ok', ' '])).rejects.toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });

  it('returns export names as plain strings', async () => {
    const mock = ok(['CID_017 (AthenaCharacterItemDefinition)']);
    const client = createClient(mock);
    expect(await client.assets.exports('FortniteGame/x')).toEqual(['CID_017 (AthenaCharacterItemDefinition)']);
  });
});

describe('FnccAPI loot pools', () => {
  it('routes every loot pool call and forwards search filters', async () => {
    const mock = ok({ status: 200, total: 0, count: 0, data: [] });
    const client = createClient(mock);

    await client.lootpool.list();
    expect(mock.lastRequest().path).toBe('/v1/lootpool');
    await client.lootpool.all();
    expect(mock.lastRequest().path).toBe('/v1/lootpool/all');
    await client.lootpool.search({ q: 'shotgun', zeroBuild: true, minChance: 0.01, limit: 5 });
    expect(mock.lastRequest().path).toBe('/v1/lootpool/search');
    expect(mock.lastRequest().query.get('zeroBuild')).toBe('true');
    expect(mock.lastRequest().query.get('minChance')).toBe('0.01');
    await client.lootpool.item('WID_Assault_CoreAR_Athena_C');
    expect(mock.lastRequest().path).toBe('/v1/lootpool/items/WID_Assault_CoreAR_Athena_C');
    await client.lootpool.get('br-athenacompositelp');
    expect(mock.lastRequest().path).toBe('/v1/lootpool/br-athenacompositelp');
    await client.lootpool.containers('br-athenacompositelp');
    expect(mock.lastRequest().path).toBe('/v1/lootpool/br-athenacompositelp/containers');
    await client.lootpool.container('br-athenacompositelp', 'Floor loot');
    expect(mock.lastRequest().path).toBe('/v1/lootpool/br-athenacompositelp/containers/Floor%20loot');
  });
});

describe('FnccAPI seasons, passes, bundles and modes', () => {
  it('routes seasons by number, name and current', async () => {
    const mock = ok({ status: 200, data: {} });
    const client = createClient(mock);

    await client.seasons.list();
    expect(mock.lastRequest().path).toBe('/v1/seasons');
    await client.seasons.get(42);
    expect(mock.lastRequest().path).toBe('/v1/seasons/42');
    await client.seasons.current();
    expect(mock.lastRequest().path).toBe('/v1/seasons/current');
  });

  it('routes battle passes and bundles', async () => {
    const mock = ok({ status: 200, total: 0, count: 0, data: [] });
    const client = createClient(mock);

    await client.battlepasses.list();
    expect(mock.lastRequest().path).toBe('/v1/battlepasses');
    await client.battlepasses.get('Music Pass');
    expect(mock.lastRequest().path).toBe('/v1/battlepasses/Music%20Pass');

    await client.bundles.list({ q: 'lil wayne', inShop: false, limit: 5 });
    expect(mock.lastRequest().path).toBe('/v1/bundles');
    expect(mock.lastRequest().query.get('inShop')).toBe('false');
    await client.bundles.get('NoiseClue_Bundle');
    expect(mock.lastRequest().path).toBe('/v1/bundles/NoiseClue_Bundle');
  });

  it('unwraps the modes object and a single mode', async () => {
    const mock = ok({ status: 200, count: 0, data: { modes: [] } });
    const client = createClient(mock);

    expect(await client.modes.list()).toEqual({ modes: [] });
    expect(mock.lastRequest().path).toBe('/v1/modes');
    await client.modes.get('reload');
    expect(mock.lastRequest().path).toBe('/v1/modes/reload');
  });
});

describe('FnccAPI shorten', () => {
  it('POSTs the url and unwraps the short link', async () => {
    const link = { code: 'abc', url: 'https://prod.fn-api.cc/abc', target: 'https://fn-api.cc/docs' };
    const mock = createMockFetch(
      { status: 200, body: { status: 200, data: link } },
      { status: 200, body: { status: 200, data: { links: 1, audit: 2 } } },
    );
    const client = createClient(mock);

    expect(await client.shorten.create('https://fn-api.cc/docs')).toEqual(link);
    expect(mock.lastRequest().method).toBe('POST');
    expect(mock.lastRequest().path).toBe('/v1/shorten');
    expect(JSON.parse(mock.lastRequest().body ?? 'null')).toEqual({ url: 'https://fn-api.cc/docs' });

    expect(await client.shorten.stats()).toEqual({ links: 1, audit: 2 });
  });

  it('rejects a non-http url without a request', async () => {
    const mock = ok({});
    const client = createClient(mock);
    await expect(client.shorten.create('ftp://example.com')).rejects.toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });
});

describe('FnccAPI mnemonic related and anticheat files', () => {
  it('asks for the related payload through its own method', async () => {
    const mock = ok({ status: 200, data: { parentLinks: [], links: {} } });
    const client = createClient(mock);

    expect(await client.mnemonic.related('experience_reload')).toEqual({ parentLinks: [], links: {} });
    expect(mock.lastRequest().query.get('related')).toBe('true');

    await client.mnemonic.get('experience_reload');
    expect(mock.lastRequest().query.has('related')).toBe(false);
  });

  it('reads a text anticheat file and builds a download url for binary ones', async () => {
    const mock = createMockFetch({ status: 200, body: 'licence text' });
    const client = createClient(mock);

    expect(await client.anticheat.file('Licenses.txt')).toBe('licence text');
    expect(client.anticheat.fileUrl('base.cer')).toBe(`${FNCC_HOST}/v1/anticheat/files/base.cer`);
  });
});

describe('FnccAPI errors', () => {
  it('maps a 404 to NotFoundError', async () => {
    const mock = fail(404);
    const client = createClient(mock);

    await expect(client.sprites.get('missing')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('FnccAPI quests', () => {
  const envelope = (data: unknown) => ({ status: 200, data });

  it('routes the catalog and section calls with their filters', async () => {
    const mock = ok(envelope({ build: 'b', quests: {} }));
    const client = createClient(mock);

    const catalog = await client.quests.catalog({
      lang: 'de',
      mode: ['festival', 'lego'],
      sections: ['quests', 'categories'],
      includeDisabled: true,
      excludeHidden: true,
      rewards: true,
      ids: ['Quest:a', 'Quest:b'],
    });
    expect(catalog.build).toBe('b');
    const request = mock.lastRequest();
    expect(request.path).toBe('/v1/quests');
    expect(request.query.get('lang')).toBe('de');
    expect(request.query.get('mode')).toBe('festival,lego');
    expect(request.query.get('sections')).toBe('quests,categories');
    expect(request.query.get('includeDisabled')).toBe('true');
    expect(request.query.get('excludeHidden')).toBe('true');
    expect(request.query.get('rewards')).toBe('true');
    expect(request.query.get('ids')).toBe('Quest:a,Quest:b');

    await client.quests.categories({ mode: 'festival' });
    expect(mock.lastRequest().path).toBe('/v1/quests/categories');
    expect(mock.lastRequest().query.get('mode')).toBe('festival');
    await client.quests.bundles();
    expect(mock.lastRequest().path).toBe('/v1/quests/bundles');
    await client.quests.stw({ lang: 'fr' });
    expect(mock.lastRequest().path).toBe('/v1/quests/stw');
    expect(mock.lastRequest().query.get('lang')).toBe('fr');
    await client.quests.get('Quest:quest_s42_weekly_w07_suppressed');
    expect(mock.lastRequest().path).toBe('/v1/quests/Quest%3Aquest_s42_weekly_w07_suppressed');
  });

  it('looks up quests in batches of 1000 and merges the results', async () => {
    const page = (n: number) =>
      envelope({ build: 'b', generatedAt: 'g', lang: 'en', quests: { [`quest:q${n}`]: {} }, stwQuests: {}, missing: [`quest:m${n}`] });
    const mock = createMockFetch({ body: page(1) }, { body: page(2) });
    const client = createClient(mock);
    const ids = Array.from({ length: 1500 }, (_, index) => `Quest:q${index}`);

    const result = await client.quests.lookup(ids, { lang: 'de' });
    expect(mock.requests).toHaveLength(2);
    expect(mock.requests[0]?.method).toBe('POST');
    expect(mock.requests[0]?.path).toBe('/v1/quests/lookup');
    expect(mock.requests[0]?.query.get('lang')).toBe('de');
    expect(JSON.parse(mock.requests[0]!.body!).ids).toHaveLength(1000);
    expect(JSON.parse(mock.requests[1]!.body!).ids).toHaveLength(500);
    expect(Object.keys(result.quests)).toEqual(['quest:q1', 'quest:q2']);
    expect(result.missing).toEqual(['quest:m1', 'quest:m2']);
  });

  it('rejects empty lookups and blank ids without a request', async () => {
    const mock = ok(envelope({}));
    const client = createClient(mock);
    await expect(client.quests.lookup([])).rejects.toBeInstanceOf(ValidationError);
    await expect(client.quests.lookup(['Quest:a', ' '])).rejects.toBeInstanceOf(ValidationError);
    await expect(client.quests.get('')).rejects.toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });
});
