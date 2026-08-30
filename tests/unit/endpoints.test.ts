import { describe, expect, it } from 'vitest';
import { FortniteAPI } from '../../src/fortnite/client.js';
import { AccountType, KeyFormat, Language, StatsImage, TimeWindow } from '../../src/fortnite/enums.js';
import { ValidationError, ServerError } from '../../src/core/errors.js';
import type { FortniteAPIOptions } from '../../src/fortnite/options.js';
import {
  aesFixture,
  bannerColorFixture,
  bannerFixture,
  brNewsFixture,
  creatorCodeFixture,
  mapFixture,
  newsFixture,
  playlistFixture,
  statsFixture,
} from '../helpers/fixtures.js';
import { createMockFetch, envelope, errorEnvelope, type MockFetch } from '../helpers/mockFetch.js';
const API_KEY = 'test-api-key';

function createClient(mock: MockFetch, options: FortniteAPIOptions = {}): FortniteAPI {
  return new FortniteAPI({ ...options, fetch: mock.fetch, retry: false });
}

function ok(body: unknown): MockFetch {
  return createMockFetch({ status: 200, body });
}

function failure(status: number, message: string): MockFetch {
  return createMockFetch({ status, body: errorEnvelope(status, message) });
}

describe('AesEndpoint', () => {
  it('requests /v2/aes without a keyFormat by default', async () => {
    const mock = ok(envelope(aesFixture));
    const client = createClient(mock);

    const aes = await client.aes.get();

    expect(aes).toEqual(aesFixture);
    expect(mock.lastRequest().path).toBe('/v2/aes');
    expect(mock.lastRequest().query.get('keyFormat')).toBeNull();
  });

  it('sends keyFormat when provided', async () => {
    const mock = ok(envelope(aesFixture));
    const client = createClient(mock);

    await client.aes.get({ keyFormat: KeyFormat.Base64 });

    expect(mock.lastRequest().path).toBe('/v2/aes');
    expect(mock.lastRequest().query.get('keyFormat')).toBe('base64');
  });

  it('returns only the main key from mainKey()', async () => {
    const mock = ok(envelope(aesFixture));
    const client = createClient(mock);

    await expect(client.aes.mainKey()).resolves.toBe(aesFixture.mainKey);
    expect(mock.lastRequest().path).toBe('/v2/aes');
  });

  it('matches dynamic keys case-insensitively', async () => {
    const mock = ok(envelope(aesFixture));
    const client = createClient(mock);
    const entry = aesFixture.dynamicKeys[0]!;

    await expect(client.aes.dynamicKey(entry.pakGuid.toLowerCase())).resolves.toBe(entry.key);
  });

  it('returns null for an unknown pak guid', async () => {
    const mock = ok(envelope(aesFixture));
    const client = createClient(mock);

    await expect(client.aes.dynamicKey('00000000000000000000000000000000')).resolves.toBeNull();
  });

  it('throws a ValidationError for a blank pak guid', async () => {
    const mock = ok(envelope(aesFixture));
    const client = createClient(mock);

    await expect(client.aes.dynamicKey('   ')).rejects.toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });
});

describe('BannersEndpoint', () => {
  it('requests /v1/banners and unwraps the data', async () => {
    const mock = ok(envelope([bannerFixture]));
    const client = createClient(mock);

    const banners = await client.banners.all();

    expect(banners).toEqual([bannerFixture]);
    expect(mock.lastRequest().path).toBe('/v1/banners');
    expect(mock.lastRequest().query.get('language')).toBeNull();
  });

  it('honours the language option', async () => {
    const mock = ok(envelope([bannerFixture]));
    const client = createClient(mock);

    await client.banners.all({ language: Language.German });

    expect(mock.lastRequest().query.get('language')).toBe('de');
  });

  it('requests /v1/banners/colors without a language param', async () => {
    const mock = ok(envelope([bannerColorFixture]));
    const client = createClient(mock, { language: Language.German });

    const colors = await client.banners.colors();

    expect(colors).toEqual([bannerColorFixture]);
    expect(mock.lastRequest().path).toBe('/v1/banners/colors');
    expect(mock.lastRequest().query.get('language')).toBeNull();
  });

  it('finds a banner by id and returns null when missing', async () => {
    const mock = ok(envelope([bannerFixture]));
    const client = createClient(mock);

    await expect(client.banners.byId(bannerFixture.id)).resolves.toEqual(bannerFixture);
    await expect(client.banners.byId('missingbanner')).resolves.toBeNull();
  });

  it('finds a banner color by id and returns null when missing', async () => {
    const mock = ok(envelope([bannerColorFixture]));
    const client = createClient(mock);

    await expect(client.banners.colorById(bannerColorFixture.id)).resolves.toEqual(
      bannerColorFixture,
    );
    await expect(client.banners.colorById('missingcolor')).resolves.toBeNull();
  });

  it('throws a ValidationError for blank ids', async () => {
    const mock = ok(envelope([bannerFixture]));
    const client = createClient(mock);

    await expect(client.banners.byId('')).rejects.toBeInstanceOf(ValidationError);
    await expect(client.banners.colorById('  ')).rejects.toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });
});

describe('CreatorCodeEndpoint', () => {
  it('requests /v2/creatorcode with the code as the name param', async () => {
    const mock = ok(envelope(creatorCodeFixture));
    const client = createClient(mock);

    const creatorCode = await client.creatorCode.get('ninja');

    expect(creatorCode).toEqual(creatorCodeFixture);
    expect(mock.lastRequest().path).toBe('/v2/creatorcode');
    expect(mock.lastRequest().query.get('name')).toBe('ninja');
  });

  it('throws a ValidationError for a blank code', async () => {
    const mock = ok(envelope(creatorCodeFixture));
    const client = createClient(mock);

    await expect(client.creatorCode.get(' ')).rejects.toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });

  it('reports an existing code as true', async () => {
    const mock = ok(envelope(creatorCodeFixture));
    const client = createClient(mock);

    await expect(client.creatorCode.exists('ninja')).resolves.toBe(true);
  });

  it('reports a missing code as false', async () => {
    const mock = failure(404, 'Creator code not found');
    const client = createClient(mock);

    await expect(client.creatorCode.exists('unknown-code')).resolves.toBe(false);
  });

  it('rethrows non 404 failures', async () => {
    const mock = failure(500, 'Internal server error');
    const client = createClient(mock);

    await expect(client.creatorCode.exists('ninja')).rejects.toBeInstanceOf(ServerError);
  });
});

describe('MapEndpoint', () => {
  it('requests /v1/map and unwraps the data', async () => {
    const mock = ok(envelope(mapFixture));
    const client = createClient(mock);

    const map = await client.map.get();

    expect(map).toEqual(mapFixture);
    expect(mock.lastRequest().path).toBe('/v1/map');
    expect(mock.lastRequest().query.get('language')).toBeNull();
  });

  it('honours the language option', async () => {
    const mock = ok(envelope(mapFixture));
    const client = createClient(mock);

    await client.map.get({ language: Language.French });

    expect(mock.lastRequest().query.get('language')).toBe('fr');
  });

  it('returns the poi array', async () => {
    const mock = ok(envelope(mapFixture));
    const client = createClient(mock);

    await expect(client.map.pois()).resolves.toEqual(mapFixture.pois);
  });

  it('finds a poi by id and returns null when missing', async () => {
    const mock = ok(envelope(mapFixture));
    const client = createClient(mock);
    const poi = mapFixture.pois[0]!;

    await expect(client.map.poiById(poi.id)).resolves.toEqual(poi);
    await expect(client.map.poiById('Athena.Location.POI.Missing')).resolves.toBeNull();
  });

  it('throws a ValidationError for a blank poi id', async () => {
    const mock = ok(envelope(mapFixture));
    const client = createClient(mock);

    await expect(client.map.poiById('')).rejects.toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });
});

describe('NewsEndpoint', () => {
  it('requests /v2/news and unwraps the data', async () => {
    const mock = ok(envelope(newsFixture));
    const client = createClient(mock);

    const news = await client.news.all({ language: Language.Japanese });

    expect(news).toEqual(newsFixture);
    expect(mock.lastRequest().path).toBe('/v2/news');
    expect(mock.lastRequest().query.get('language')).toBe('ja');
  });

  it('requests /v2/news/br and unwraps the data', async () => {
    const mock = ok(envelope(brNewsFixture));
    const client = createClient(mock);

    const news = await client.news.br({ language: Language.Spanish });

    expect(news).toEqual(brNewsFixture);
    expect(mock.lastRequest().path).toBe('/v2/news/br');
    expect(mock.lastRequest().query.get('language')).toBe('es');
  });

  it('requests /v2/news/stw and unwraps the data', async () => {
    const mock = ok(envelope(newsFixture.stw));
    const client = createClient(mock);

    const news = await client.news.stw({ language: Language.Italian });

    expect(news).toEqual(newsFixture.stw);
    expect(mock.lastRequest().path).toBe('/v2/news/stw');
    expect(mock.lastRequest().query.get('language')).toBe('it');
  });

  it('omits the language param when none is configured', async () => {
    const mock = ok(envelope(newsFixture));
    const client = createClient(mock);

    await client.news.all();

    expect(mock.lastRequest().query.get('language')).toBeNull();
  });
});

describe('PlaylistsEndpoint', () => {
  it('requests /v1/playlists and unwraps the data', async () => {
    const mock = ok(envelope([playlistFixture]));
    const client = createClient(mock);

    const playlists = await client.playlists.all({ language: Language.Korean });

    expect(playlists).toEqual([playlistFixture]);
    expect(mock.lastRequest().path).toBe('/v1/playlists');
    expect(mock.lastRequest().query.get('language')).toBe('ko');
  });

  it('requests a single playlist by id', async () => {
    const mock = ok(envelope(playlistFixture));
    const client = createClient(mock);

    const playlist = await client.playlists.byId('playlist_defaultsolo');

    expect(playlist).toEqual(playlistFixture);
    expect(mock.lastRequest().path).toBe('/v1/playlists/playlist_defaultsolo');
  });

  it('url-encodes playlist ids', async () => {
    const mock = ok(envelope(playlistFixture));
    const client = createClient(mock);

    await client.playlists.byId('playlist solo/duo');

    expect(mock.lastRequest().path).toBe('/v1/playlists/playlist%20solo%2Fduo');
  });

  it('throws a ValidationError for a blank playlist id', async () => {
    const mock = ok(envelope(playlistFixture));
    const client = createClient(mock);

    await expect(client.playlists.byId('')).rejects.toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });
});

describe('StatsEndpoint', () => {
  it('throws a ValidationError without an api key and sends no request', async () => {
    const mock = ok(envelope(statsFixture));
    const client = createClient(mock);

    await expect(client.stats.byName('Ninja')).rejects.toBeInstanceOf(ValidationError);
    await expect(client.stats.byId('acc-id')).rejects.toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });

  it('requests /v2/stats/br/v2 by name', async () => {
    const mock = ok(envelope(statsFixture));
    const client = createClient(mock, { apiKey: API_KEY });

    const stats = await client.stats.byName('Ninja');

    expect(stats).toEqual(statsFixture);
    expect(mock.lastRequest().path).toBe('/v2/stats/br/v2');
    expect(mock.lastRequest().query.get('name')).toBe('Ninja');
    expect(mock.lastRequest().query.get('accountType')).toBeNull();
    expect(mock.lastRequest().query.get('timeWindow')).toBeNull();
    expect(mock.lastRequest().query.get('image')).toBeNull();
  });

  it('sends the optional lookup params when provided', async () => {
    const mock = ok(envelope(statsFixture));
    const client = createClient(mock, { apiKey: API_KEY });

    await client.stats.byName('Ninja', {
      accountType: AccountType.Psn,
      timeWindow: TimeWindow.Season,
      image: StatsImage.All,
    });

    expect(mock.lastRequest().query.get('accountType')).toBe('psn');
    expect(mock.lastRequest().query.get('timeWindow')).toBe('season');
    expect(mock.lastRequest().query.get('image')).toBe('all');
  });

  it('requests /v2/stats/br/v2/:accountId by id without a name param', async () => {
    const mock = ok(envelope(statsFixture));
    const client = createClient(mock, { apiKey: API_KEY });

    const stats = await client.stats.byId('acc-id');

    expect(stats).toEqual(statsFixture);
    expect(mock.lastRequest().path).toBe('/v2/stats/br/v2/acc-id');
    expect(mock.lastRequest().query.get('name')).toBeNull();
  });

  it('sends the api key as the authorization header', async () => {
    const mock = ok(envelope(statsFixture));
    const client = createClient(mock, { apiKey: API_KEY });

    await client.stats.byName('Ninja');

    expect(mock.lastRequest().headers['authorization']).toBe(API_KEY);
  });

  it('returns null from findByName and findById on a 404', async () => {
    const mock = failure(404, 'Account not found');
    const client = createClient(mock, { apiKey: API_KEY });

    await expect(client.stats.findByName('Nobody')).resolves.toBeNull();
    await expect(client.stats.findById('missing-id')).resolves.toBeNull();
  });

  it('rethrows non 404 failures from the find helpers', async () => {
    const mock = failure(500, 'Internal server error');
    const client = createClient(mock, { apiKey: API_KEY });

    await expect(client.stats.findByName('Ninja')).rejects.toBeInstanceOf(ServerError);
    await expect(client.stats.findById('acc-id')).rejects.toBeInstanceOf(ServerError);
  });
});
