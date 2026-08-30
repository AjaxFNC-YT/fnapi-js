import { describe, expect, it } from 'vitest';
import {
  ALL_RESPONSE_FLAGS,
  KeyFormat,
  Language,
  MatchMethod,
  ResponseFlags,
  isBackendRarity,
  isCosmeticSeries,
  isCosmeticType,
  isRarity,
} from '../../src/index.js';
import { CosmeticSearchBuilder } from '../../src/fortnite/search.js';
import { NotFoundError, ValidationError } from '../../src/core/errors.js';
import { config, createLiveClient, hasApiKey } from './helpers.js';

const client = createLiveClient();

describe('live aes', () => {
  it('returns the current keys', async () => {
    const aes = await client.aes.get();

    expect(aes.build).toMatch(/^\+\+Fortnite\+Release/);
    expect(typeof aes.mainKey).toBe('string');
    expect(Array.isArray(aes.dynamicKeys)).toBe(true);
  });

  it('supports base64 key format', async () => {
    const aes = await client.aes.get({ keyFormat: KeyFormat.Base64 });

    expect(aes.mainKey).toMatch(/[+/=]|^[A-Za-z0-9]+$/);
    expect(aes.build.startsWith('++Fortnite')).toBe(true);
  });

  it('resolves the main key directly', async () => {
    const mainKey = await client.aes.mainKey();

    expect(typeof mainKey).toBe('string');
  });

  it('resolves a dynamic key by pak guid', async () => {
    const aes = await client.aes.get();
    const first = aes.dynamicKeys[0];

    if (!first) return;

    const key = await client.aes.dynamicKey(first.pakGuid);
    expect(key).toBe(first.key);
  });
});

describe('live banners', () => {
  it('lists banners', async () => {
    const banners = await client.banners.all();

    expect(banners.length).toBeGreaterThan(0);
    expect(banners[0]).toHaveProperty('images.icon');
  });

  it('lists banner colors', async () => {
    const colors = await client.banners.colors();

    expect(colors.length).toBeGreaterThan(0);
    expect(colors[0]).toHaveProperty('color');
  });

  it('finds a banner by id', async () => {
    const banners = await client.banners.all();
    const target = banners[0]!;

    await expect(client.banners.byId(target.id)).resolves.toMatchObject({ id: target.id });
    await expect(client.banners.byId('definitely-not-a-banner')).resolves.toBeNull();
  });
});

describe('live cosmetics', () => {
  it('returns every cosmetic group', async () => {
    const cosmetics = await client.cosmetics.all();

    expect(cosmetics.br.length).toBeGreaterThan(0);
    expect(cosmetics.tracks.length).toBeGreaterThan(0);
    expect(cosmetics.instruments.length).toBeGreaterThan(0);
    expect(cosmetics.cars.length).toBeGreaterThan(0);
    expect(cosmetics.lego.length).toBeGreaterThan(0);
    expect(cosmetics.legoKits.length).toBeGreaterThan(0);
    expect(cosmetics.beans.length).toBeGreaterThan(0);
  });

  it('returns the newest cosmetics', async () => {
    const newest = await client.cosmetics.newCosmetics();

    expect(newest.build).toMatch(/^\+\+Fortnite\+Release/);
    expect(newest.hashes).toHaveProperty('all');
  });

  it('returns br cosmetics', async () => {
    const cosmetics = await client.cosmetics.br();

    expect(cosmetics.length).toBeGreaterThan(1000);
  });

  it('returns a cosmetic by id', async () => {
    const cosmetic = await client.cosmetics.byId(config.live.cosmeticId);

    expect(cosmetic.id).toBe(config.live.cosmeticId);
    expect(cosmetic.type.backendValue).toBe('AthenaCharacter');
  });

  it('returns null for an unknown id', async () => {
    await expect(client.cosmetics.findById('CID_DOES_NOT_EXIST')).resolves.toBeNull();
    await expect(client.cosmetics.byId('CID_DOES_NOT_EXIST')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('returns multiple cosmetics by id', async () => {
    const cosmetics = await client.cosmetics.byIds([
      'CID_028_Athena_Commando_F',
      'CID_029_Athena_Commando_F_Halloween',
    ]);

    expect(cosmetics).toHaveLength(2);
    expect(cosmetics.map((item) => item.id)).toContain('CID_028_Athena_Commando_F');
  });

  it('rejects an empty id list without a request', async () => {
    await expect(client.cosmetics.byIds([])).rejects.toBeInstanceOf(ValidationError);
  });

  it('searches for a single cosmetic', async () => {
    const cosmetic = await client.cosmetics.search({
      name: 'Renegade Raider',
      matchMethod: MatchMethod.Full,
    });

    expect(cosmetic.name).toBe('Renegade Raider');
  });

  it('searches for every match with a builder', async () => {
    const builder = new CosmeticSearchBuilder()
      .name('Renegade')
      .matchMethod(MatchMethod.Contains)
      .language(Language.English);

    const cosmetics = await client.cosmetics.searchAll(builder);

    expect(cosmetics.length).toBeGreaterThan(0);
    expect(cosmetics.every((item) => item.name.toLowerCase().includes('renegade'))).toBe(true);
  });

  it('returns null when a search matches nothing', async () => {
    const result = await client.cosmetics.find({
      name: 'zzz-this-cosmetic-does-not-exist-zzz',
      matchMethod: MatchMethod.Full,
    });

    expect(result).toBeNull();
  });

  it('applies response flags', async () => {
    const withoutFlags = await client.cosmetics.byId(config.live.cosmeticId, {
      responseFlags: ResponseFlags.None,
    });
    const withFlags = await client.cosmetics.byId(config.live.cosmeticId, {
      responseFlags: ALL_RESPONSE_FLAGS,
    });

    expect(withoutFlags.path == null).toBe(true);
    expect(typeof withFlags.path).toBe('string');
    expect(Array.isArray(withFlags.shopHistory)).toBe(true);
  });

  it('applies the language option', async () => {
    const german = await client.cosmetics.byId(config.live.cosmeticId, {
      language: Language.German,
    });
    const english = await client.cosmetics.byId(config.live.cosmeticId, {
      language: Language.English,
    });

    expect(german.name).not.toBe(english.name);
  });

  it('returns each cosmetic collection', async () => {
    const [tracks, instruments, cars, lego, legoKits, beans] = await Promise.all([
      client.cosmetics.tracks(),
      client.cosmetics.instruments(),
      client.cosmetics.cars(),
      client.cosmetics.lego(),
      client.cosmetics.legoKits(),
      client.cosmetics.beans(),
    ]);

    expect(tracks[0]).toHaveProperty('difficulty');
    expect(instruments[0]).toHaveProperty('images.large');
    expect(cars[0]).toHaveProperty('vehicleId');
    expect(lego.length).toBeGreaterThan(0);
    expect(legoKits[0]).toHaveProperty('name');
    expect(beans[0]).toHaveProperty('gender');
  });
});

describe('live creator code', () => {
  it('resolves a creator code', async () => {
    const creator = await client.creatorCode.get(config.live.creatorCode);

    expect(creator.code.toLowerCase()).toBe(config.live.creatorCode.toLowerCase());
    expect(creator.account).toHaveProperty('id');
  });

  it('reports whether a code exists', async () => {
    await expect(client.creatorCode.exists(config.live.creatorCode)).resolves.toBe(true);
    await expect(client.creatorCode.exists('zzz-not-a-real-code-zzz')).resolves.toBe(false);
  });
});

describe('live map', () => {
  it('returns map images and pois', async () => {
    const map = await client.map.get();

    expect(map.images.blank).toContain('http');
    expect(map.pois.length).toBeGreaterThan(0);
  });

  it('finds a poi by id', async () => {
    const pois = await client.map.pois();
    const target = pois[0]!;

    await expect(client.map.poiById(target.id)).resolves.toMatchObject({ id: target.id });
    await expect(client.map.poiById('not.a.real.poi')).resolves.toBeNull();
  });
});

describe('live news', () => {
  it('returns the news sections', async () => {
    const news = await client.news.all();

    expect(news.br ?? news.stw).toBeTruthy();
  });

  it('returns battle royale news', async () => {
    const news = await client.news.br();

    expect(typeof news.hash).toBe('string');
  });

  it('returns save the world news', async () => {
    const news = await client.news.stw();

    expect(typeof news.hash).toBe('string');
  });
});

describe('live playlists', () => {
  it('lists playlists', async () => {
    const playlists = await client.playlists.all();

    expect(playlists.length).toBeGreaterThan(0);
  });

  it('returns a playlist by id', async () => {
    const playlist = await client.playlists.byId(config.live.playlistId);

    expect(playlist.id.toLowerCase()).toBe(config.live.playlistId.toLowerCase());
  });

  it('throws for an unknown playlist', async () => {
    await expect(client.playlists.byId('playlist_does_not_exist')).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe('live shop', () => {
  it('returns the current shop', async () => {
    const shop = await client.shop.get();

    expect(typeof shop.hash).toBe('string');
    expect(shop.entries.length).toBeGreaterThan(0);
    expect(shop.vbuckIcon).toContain('http');
  });

  it('groups entries into sections', async () => {
    const sections = await client.shop.sections();

    expect(sections.size).toBeGreaterThan(0);
    for (const entries of sections.values()) {
      expect(entries.length).toBeGreaterThan(0);
    }
  });

  it('finds an entry by offer id', async () => {
    const entries = await client.shop.entries();
    const target = entries[0]!;

    await expect(client.shop.byOfferId(target.offerId)).resolves.toMatchObject({
      offerId: target.offerId,
    });
    await expect(client.shop.byOfferId('not-a-real-offer')).resolves.toBeNull();
  });

  it('checks whether a cosmetic is in the shop', async () => {
    const entries = await client.shop.entries();
    const withItems = entries.find((entry) => (entry.brItems?.length ?? 0) > 0);

    if (!withItems?.brItems?.[0]) return;

    await expect(client.shop.isInShop(withItems.brItems[0].id)).resolves.toBe(true);
    await expect(client.shop.isInShop('CID_DOES_NOT_EXIST')).resolves.toBe(false);
  });
});

describe('live stats', () => {
  it('requires an api key', async () => {
    const anonymous = createLiveClient();
    anonymous.setApiKey(null);

    await expect(anonymous.stats.byName('Ninja')).rejects.toBeInstanceOf(ValidationError);
  });

  it.runIf(hasApiKey)('returns stats by name', async () => {
    const stats = await client.stats.byName(config.live.playerName);

    expect(stats.account).toHaveProperty('id');
    expect(stats.stats).toHaveProperty('all');
  });

  it.runIf(hasApiKey)('returns stats by account id', async () => {
    const byName = await client.stats.byName(config.live.playerName);
    const byId = await client.stats.byId(byName.account.id);

    expect(byId.account.id).toBe(byName.account.id);
  });

  it.runIf(hasApiKey)('returns null for an unknown player', async () => {
    await expect(client.stats.findByName('zzz-not-a-real-player-zzz')).resolves.toBeNull();
  });
});

describe('live enum coverage', () => {
  it('covers every rarity, series and type the api actually returns', async () => {
    const cosmetics = await client.cosmetics.all();
    const groups = [
      cosmetics.br,
      cosmetics.tracks,
      cosmetics.instruments,
      cosmetics.cars,
      cosmetics.lego,
      cosmetics.legoKits,
      cosmetics.beans,
    ];

    const rarities = new Set<string>();
    const backendRarities = new Set<string>();
    const series = new Set<string>();
    const types = new Set<string>();

    for (const group of groups) {
      for (const item of group as unknown as Array<Record<string, unknown>>) {
        const rarity = item['rarity'] as { value: string; backendValue: string } | undefined;
        if (rarity) {
          rarities.add(rarity.value);
          backendRarities.add(rarity.backendValue);
        }

        const itemSeries = item['series'] as { backendValue: string } | undefined;
        if (itemSeries) series.add(itemSeries.backendValue);

        const type = item['type'] as { value: string } | undefined;
        if (type) types.add(type.value);
      }
    }

    expect([...rarities].filter((value) => !isRarity(value))).toEqual([]);
    expect([...backendRarities].filter((value) => !isBackendRarity(value))).toEqual([]);
    expect([...series].filter((value) => !isCosmeticSeries(value))).toEqual([]);
    expect([...types].filter((value) => !isCosmeticType(value))).toEqual([]);
  });

  it('covers every rarity and series the current shop returns', async () => {
    const entries = await client.shop.entries();

    for (const entry of entries) {
      const items = [
        ...(entry.brItems ?? []),
        ...(entry.instruments ?? []),
        ...(entry.cars ?? []),
        ...(entry.legoKits ?? []),
      ] as unknown as Array<Record<string, unknown>>;

      for (const item of items) {
        const rarity = item['rarity'] as { value: string; backendValue: string } | undefined;
        if (rarity) {
          expect(isRarity(rarity.value)).toBe(true);
          expect(isBackendRarity(rarity.backendValue)).toBe(true);
        }

        const itemSeries = item['series'] as { backendValue: string } | undefined;
        if (itemSeries) expect(isCosmeticSeries(itemSeries.backendValue)).toBe(true);
      }
    }
  });
});

describe('live caching', () => {
  it('serves a repeated request from cache', async () => {
    const cached = createLiveClient();
    cached.rest.cache.clear();

    const first = await cached.rest.get('/v1/banners/colors', { cache: true });
    const second = await cached.rest.get('/v1/banners/colors', { cache: true });

    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
    expect(second.body).toEqual(first.body);
  });
});
