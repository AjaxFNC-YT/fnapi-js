import { describe, it, expect, vi, afterEach } from 'vitest';
import type { QueryParams } from '../../src/core/types.js';
import {
  appendQuery,
  buildQuery,
  mergeQuery,
  sleep,
  toUnixSeconds,
  backoffDelay,
  linkSignals,
  normalizeAssetPath,
  assetDirectory,
  assetName,
  safeGet,
} from '../../src/core/utils.js';
describe('buildQuery', () => {
  it('returns an empty string when there is nothing to serialize', () => {
    expect(buildQuery(undefined)).toBe('');
    expect(buildQuery({})).toBe('');
    expect(buildQuery({ name: undefined })).toBe('');
    expect(buildQuery({ name: null })).toBe('');
  });

  it('prefixes the serialized parameters with a question mark', () => {
    expect(buildQuery({ language: 'en' })).toBe('?language=en');
    expect(buildQuery({ language: 'en', name: 'Peely' })).toBe('?language=en&name=Peely');
  });

  it('skips null and undefined values', () => {
    expect(buildQuery({ language: 'en', name: null, rarity: undefined })).toBe('?language=en');
  });

  it('serializes booleans and numbers', () => {
    expect(buildQuery({ hasSeries: true, hasSet: false })).toBe('?hasSeries=true&hasSet=false');
    expect(buildQuery({ unseenFor: 0, added: 1609459200 })).toBe('?unseenFor=0&added=1609459200');
  });

  it('repeats the key for array values', () => {
    expect(buildQuery({ tag: ['a', 'b', 'c'] })).toBe('?tag=a&tag=b&tag=c');
    expect(buildQuery({ tag: [] })).toBe('');
    expect(buildQuery({ id: [1, 2], all: true })).toBe('?id=1&id=2&all=true');
  });

  it('skips null and undefined entries inside arrays', () => {
    const params = { tag: ['a', null, undefined, 'b'] } as unknown as QueryParams;
    expect(buildQuery(params)).toBe('?tag=a&tag=b');
  });

  it('url-encodes keys and values', () => {
    expect(buildQuery({ 'a b': 'c d' })).toBe('?a+b=c+d');
    expect(buildQuery({ name: 'Renegade Raider' })).toBe('?name=Renegade+Raider');
    expect(buildQuery({ 'k/e y': 'v&al=ue' })).toBe('?k%2Fe+y=v%26al%3Due');
    expect(buildQuery({ gameplayTag: 'Cosmetics.Source.ItemShop' })).toBe(
      '?gameplayTag=Cosmetics.Source.ItemShop',
    );
  });
});

describe('appendQuery', () => {
  it('appends primitives', () => {
    const search = new URLSearchParams();
    appendQuery(search, 'language', 'en');
    appendQuery(search, 'hasSeries', true);
    appendQuery(search, 'unseenFor', 30);
    expect(search.toString()).toBe('language=en&hasSeries=true&unseenFor=30');
  });

  it('ignores null and undefined', () => {
    const search = new URLSearchParams();
    appendQuery(search, 'nothing', null);
    appendQuery(search, 'missing', undefined);
    expect(search.toString()).toBe('');
    expect(Array.from(search.keys())).toEqual([]);
  });

  it('appends one entry per array item', () => {
    const search = new URLSearchParams();
    appendQuery(search, 'tag', ['a', 'b']);
    expect(search.getAll('tag')).toEqual(['a', 'b']);
  });

  it('appends alongside existing entries', () => {
    const search = new URLSearchParams('language=en');
    appendQuery(search, 'name', 'Peely');
    expect(search.toString()).toBe('language=en&name=Peely');
  });
});

describe('mergeQuery', () => {
  it('lets later sources win', () => {
    expect(mergeQuery({ language: 'en' }, { language: 'de' })).toEqual({ language: 'de' });
    expect(mergeQuery({ a: 1, b: 2 }, { b: 3, c: 4 })).toEqual({ a: 1, b: 3, c: 4 });
  });

  it('skips undefined values but keeps null', () => {
    expect(mergeQuery({ language: 'en' }, { language: undefined })).toEqual({ language: 'en' });
    expect(mergeQuery({ language: 'en' }, { language: null })).toEqual({ language: null });
    expect(mergeQuery({ a: undefined })).toEqual({});
  });

  it('ignores undefined sources', () => {
    expect(mergeQuery(undefined, { language: 'en' }, undefined)).toEqual({ language: 'en' });
    expect(mergeQuery(undefined, undefined)).toEqual({});
    expect(mergeQuery()).toEqual({});
  });

  it('returns a new object', () => {
    const source: QueryParams = { language: 'en' };
    const merged = mergeQuery(source);
    expect(merged).not.toBe(source);
    expect(merged).toEqual(source);
  });
});

describe('toUnixSeconds', () => {
  it('converts a Date to seconds', () => {
    expect(toUnixSeconds(new Date('2021-01-01T00:00:00.000Z'))).toBe(1609459200);
    expect(toUnixSeconds(new Date(1609459200999))).toBe(1609459200);
  });

  it('converts an ISO string to seconds', () => {
    expect(toUnixSeconds('2021-01-01T00:00:00.000Z')).toBe(1609459200);
    expect(toUnixSeconds('2021-01-01T00:00:00Z')).toBe(1609459200);
  });

  it('converts millisecond epochs to seconds', () => {
    expect(toUnixSeconds(1609459200000)).toBe(1609459200);
    expect(toUnixSeconds('1609459200000')).toBe(1609459200);
  });

  it('leaves second epochs untouched', () => {
    expect(toUnixSeconds(1609459200)).toBe(1609459200);
    expect(toUnixSeconds('1609459200')).toBe(1609459200);
    expect(toUnixSeconds(1609459200.9)).toBe(1609459200);
  });

  it('throws a TypeError for unparseable strings', () => {
    expect(() => toUnixSeconds('not a date')).toThrow(TypeError);
    expect(() => toUnixSeconds('yesterday')).toThrow(/Unable to parse "yesterday" as a date/);
  });
});

describe('backoffDelay', () => {
  it('grows with the attempt number', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(backoffDelay(1, 100, 10_000)).toBe(100);
    expect(backoffDelay(2, 100, 10_000)).toBe(200);
    expect(backoffDelay(3, 100, 10_000)).toBe(400);
    expect(backoffDelay(4, 100, 10_000)).toBe(800);
  });

  it('never exceeds maxDelay', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    for (let attempt = 1; attempt <= 12; attempt += 1) {
      expect(backoffDelay(attempt, 100, 1_000)).toBeLessThanOrEqual(1_000);
    }
    expect(backoffDelay(20, 500, 750)).toBe(750);
  });

  it('is at least minDelay on the first attempt', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(backoffDelay(1, 250, 5_000)).toBeGreaterThanOrEqual(250);
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(backoffDelay(1, 250, 5_000)).toBeGreaterThanOrEqual(250);
    expect(backoffDelay(1, 250, 5_000)).toBe(281);
  });

  it('treats attempt zero like the first attempt', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(backoffDelay(0, 100, 10_000)).toBe(100);
  });
});

describe('sleep', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves after the delay', async () => {
    vi.useFakeTimers();
    let resolved = false;
    const promise = sleep(100).then(() => {
      resolved = true;
    });

    await vi.advanceTimersByTimeAsync(99);
    expect(resolved).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await promise;
    expect(resolved).toBe(true);
  });

  it('rejects immediately for an already-aborted signal', async () => {
    const controller = new AbortController();
    controller.abort(new Error('already aborted'));
    await expect(sleep(10_000, controller.signal)).rejects.toThrow('already aborted');
  });

  it('rejects when the signal aborts mid-sleep', async () => {
    const controller = new AbortController();
    const promise = sleep(10_000, controller.signal);
    controller.abort(new Error('aborted mid-sleep'));
    await expect(promise).rejects.toThrow('aborted mid-sleep');
  });

  it('rejects with a default error when no reason is given', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(sleep(10_000, controller.signal)).rejects.toBeInstanceOf(Error);
  });
});

describe('linkSignals', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('aborts when the external signal aborts', () => {
    const controller = new AbortController();
    const linked = linkSignals(controller.signal, undefined);

    expect(linked.signal.aborted).toBe(false);
    controller.abort(new Error('external'));

    expect(linked.signal.aborted).toBe(true);
    expect(linked.signal.reason).toBeInstanceOf(Error);
    expect((linked.signal.reason as Error).message).toBe('external');
    expect(linked.timedOut()).toBe(false);
    linked.dispose();
  });

  it('aborts immediately for an already-aborted external signal', () => {
    const controller = new AbortController();
    controller.abort(new Error('already gone'));
    const linked = linkSignals(controller.signal, 1_000);

    expect(linked.signal.aborted).toBe(true);
    expect(linked.timedOut()).toBe(false);
    linked.dispose();
  });

  it('flags a timeout once the timer elapses', () => {
    vi.useFakeTimers();
    const linked = linkSignals(undefined, 5_000);

    expect(linked.timedOut()).toBe(false);
    vi.advanceTimersByTime(4_999);
    expect(linked.timedOut()).toBe(false);

    vi.advanceTimersByTime(1);
    expect(linked.timedOut()).toBe(true);
    expect(linked.signal.aborted).toBe(true);
    linked.dispose();
  });

  it('clears the timer on dispose so no late abort fires', () => {
    vi.useFakeTimers();
    const linked = linkSignals(undefined, 5_000);
    linked.dispose();

    vi.advanceTimersByTime(10_000);
    expect(linked.timedOut()).toBe(false);
    expect(linked.signal.aborted).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('starts no timer when the timeout is undefined', () => {
    vi.useFakeTimers();
    const linked = linkSignals(undefined, undefined);

    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(60_000);
    expect(linked.signal.aborted).toBe(false);
    expect(linked.timedOut()).toBe(false);
    linked.dispose();
  });

  it('stops listening to the external signal after dispose', () => {
    const controller = new AbortController();
    const linked = linkSignals(controller.signal, undefined);

    linked.dispose();
    controller.abort();

    expect(linked.signal.aborted).toBe(false);
  });
});

describe('normalizeAssetPath', () => {
  it('maps game content to /Game', () => {
    expect(normalizeAssetPath('FortniteGame/Content/Athena/Items/Cosmetics/Characters/CID_001')).toBe(
      '/Game/Athena/Items/Cosmetics/Characters/CID_001',
    );
  });

  it('maps the BRCosmetics plugin to /BRCosmetics', () => {
    expect(
      normalizeAssetPath(
        'FortniteGame/Plugins/GameFeatures/BRCosmetics/Content/Athena/Items/Cosmetics/Dances/EID_Floss',
      ),
    ).toBe('/BRCosmetics/Athena/Items/Cosmetics/Dances/EID_Floss');
  });

  it('maps the CosmeticShoes plugin to /CosmeticShoes', () => {
    expect(
      normalizeAssetPath('FortniteGame/Plugins/GameFeatures/CosmeticShoes/Content/Assets/Shoe_001'),
    ).toBe('/CosmeticShoes/Assets/Shoe_001');
  });

  it('maps other game feature plugins to /Game', () => {
    expect(normalizeAssetPath('FortniteGame/Plugins/GameFeatures/Juno/Content/Items/Prop_001')).toBe(
      '/Game/Items/Prop_001',
    );
    expect(
      normalizeAssetPath('FortniteGame/Plugins/GameFeatures/SparksCosmetics/Content/Guitars/Guitar_001'),
    ).toBe('/Game/Guitars/Guitar_001');
  });

  it('handles leading slashes', () => {
    expect(normalizeAssetPath('/FortniteGame/Content/Athena/Items/CID_001')).toBe(
      '/Game/Athena/Items/CID_001',
    );
    expect(normalizeAssetPath('///FortniteGame/Content/Athena/Items/CID_001')).toBe(
      '/Game/Athena/Items/CID_001',
    );
    expect(
      normalizeAssetPath('/FortniteGame/Plugins/GameFeatures/BRCosmetics/Content/Athena/CID_001'),
    ).toBe('/BRCosmetics/Athena/CID_001');
  });

  it('only adds a leading slash to unrelated paths', () => {
    expect(normalizeAssetPath('Engine/Content/Foo')).toBe('/Engine/Content/Foo');
    expect(normalizeAssetPath('/Game/Athena/Items/CID_001')).toBe('/Game/Athena/Items/CID_001');
    expect(normalizeAssetPath('CID_001')).toBe('/CID_001');
  });
});

describe('assetDirectory', () => {
  it('drops the last segment', () => {
    expect(assetDirectory('FortniteGame/Content/Athena/Items/CID_001')).toBe('/Game/Athena/Items');
    expect(assetDirectory('/Game/Athena/Items/CID_001')).toBe('/Game/Athena/Items');
    expect(
      assetDirectory('FortniteGame/Plugins/GameFeatures/BRCosmetics/Content/Athena/EID_Floss'),
    ).toBe('/BRCosmetics/Athena');
    expect(assetDirectory('CID_001')).toBe('');
  });
});

describe('assetName', () => {
  it('returns the last segment', () => {
    expect(assetName('FortniteGame/Content/Athena/Items/CID_001')).toBe('CID_001');
    expect(assetName('/Game/Athena/Items/CID_001')).toBe('CID_001');
    expect(
      assetName('FortniteGame/Plugins/GameFeatures/CosmeticShoes/Content/Assets/Shoe_001'),
    ).toBe('Shoe_001');
    expect(assetName('CID_001')).toBe('CID_001');
  });
});

describe('safeGet', () => {
  const source = {
    data: {
      name: 'Peely',
      images: { icon: 'https://example.com/icon.png' },
      count: 0,
      list: [{ id: 'first' }],
    },
  };

  it('reads nested paths', () => {
    expect(safeGet(source, 'data.name')).toBe('Peely');
    expect(safeGet(source, 'data.images.icon')).toBe('https://example.com/icon.png');
    expect(safeGet(source, 'data')).toEqual(source.data);
    expect(safeGet(source, 'data.list.0.id')).toBe('first');
  });

  it('returns null by default when the path is missing', () => {
    expect(safeGet(source, 'data.missing')).toBeNull();
    expect(safeGet(source, 'nope')).toBeNull();
  });

  it('returns the provided default when the path is missing', () => {
    expect(safeGet(source, 'data.missing', 'fallback')).toBe('fallback');
    expect(safeGet(source, 'data.images.featured', 'none')).toBe('none');
    expect(safeGet(source, 'data.count', 99)).toBe(0);
  });

  it('does not throw on null or undefined intermediates', () => {
    expect(() => safeGet(null, 'a.b.c')).not.toThrow();
    expect(safeGet(null, 'a.b.c')).toBeNull();
    expect(safeGet(undefined, 'a.b.c')).toBeNull();
    expect(safeGet({ a: null }, 'a.b.c')).toBeNull();
    expect(safeGet({ a: { b: undefined } }, 'a.b.c', 'fallback')).toBe('fallback');
  });
});
