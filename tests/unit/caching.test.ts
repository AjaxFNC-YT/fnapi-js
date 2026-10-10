import { describe, expect, it } from 'vitest';
import { MemoryCache } from '../../src/core/cache.js';
import { RestClient } from '../../src/fortnite/rest.js';
import { EpicRestClient } from '../../src/epic/rest.js';
import { MatchmakingManager } from '../../src/epic/matchmaking.js';
import { FnccAPI, normalizeMnemonic } from '../../src/fncc/index.js';
import { createMockFetch } from '../helpers/mockFetch.js';

describe('MemoryCache.wrap', () => {
  it('shares one in-flight load and caches the result for the ttl', async () => {
    const cache = new MemoryCache<number>({ ttl: 1_000 });
    let calls = 0;
    const load = async () => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 5));
      return 42;
    };
    const [a, b] = await Promise.all([cache.wrap('k', load), cache.wrap('k', load)]);
    expect([a, b]).toEqual([42, 42]);
    expect(await cache.wrap('k', load)).toBe(42);
    expect(calls).toBe(1);
  });

  it('does not cache a failed load', async () => {
    const cache = new MemoryCache<number>();
    let calls = 0;
    const load = async () => {
      calls += 1;
      if (calls === 1) throw new Error('boom');
      return 7;
    };
    await expect(cache.wrap('k', load)).rejects.toThrow('boom');
    expect(await cache.wrap('k', load)).toBe(7);
  });
});

describe('RestClient request caching', () => {
  it('dedupes identical concurrent GETs and hands each caller its own copy', async () => {
    const mock = createMockFetch({ status: 200, body: { value: 1 }, delay: 5 });
    const client = new RestClient({ fetch: mock.fetch, retry: false });
    const [a, b] = await Promise.all([client.get<{ value: number }>('/x'), client.get<{ value: number }>('/x')]);
    expect(mock.calls).toBe(1);
    expect(a.body).toEqual(b.body);
    expect(a.body).not.toBe(b.body);
  });

  it('caches a GET for a per-call ttl even when client caching is off', async () => {
    const mock = createMockFetch({ status: 200, body: { value: 1 } });
    const client = new RestClient({ fetch: mock.fetch, retry: false });
    await client.get('/x', { cache: { ttl: 60_000 } });
    const again = await client.get('/x', { cache: { ttl: 60_000 } });
    expect(again.cached).toBe(true);
    expect(mock.calls).toBe(1);
    await client.get('/x');
    expect(mock.calls).toBe(2);
  });

  it('passes the per-call cache through fncc endpoints', async () => {
    const mock = createMockFetch({ status: 200, body: { status: 200, data: [] } });
    const fncc = new FnccAPI({ fetch: mock.fetch, retry: false });
    await fncc.playlists.list({ cache: { ttl: 30_000 } });
    await fncc.playlists.list({ cache: { ttl: 30_000 } });
    expect(mock.calls).toBe(1);
  });
});

describe('EpicRestClient request caching', () => {
  it('dedupes concurrent GETs per token and caches only when asked', async () => {
    const mock = createMockFetch({ status: 200, body: { ok: true }, delay: 5 });
    const rest = new EpicRestClient({ fetch: mock.fetch, retry: 1 });
    await Promise.all([rest.request('GET', '/a', { bearer: 'A' }), rest.request('GET', '/a', { bearer: 'A' })]);
    expect(mock.calls).toBe(1);
    await rest.request('GET', '/a', { bearer: 'B' });
    expect(mock.calls).toBe(2);
    await rest.request('GET', '/a', { bearer: 'A', cache: { ttl: 60_000 } });
    await rest.request('GET', '/a', { bearer: 'A', cache: { ttl: 60_000 } });
    expect(mock.calls).toBe(3);
  });

  it('never dedupes or caches a POST', async () => {
    const mock = createMockFetch({ status: 200, body: { ok: true }, delay: 5 });
    const rest = new EpicRestClient({ fetch: mock.fetch, retry: 1 });
    await Promise.all([rest.request('POST', '/a', { bearer: 'A' }), rest.request('POST', '/a', { bearer: 'A' })]);
    expect(mock.calls).toBe(2);
  });

  it('caches netCL when asked', async () => {
    const mock = createMockFetch({ status: 200, body: [{ attributes: { buildUniqueId_s: '58913721' } }] });
    const matchmaking = new MatchmakingManager(new EpicRestClient({ fetch: mock.fetch, retry: 1 }));
    expect(await matchmaking.netCL('AT', { cache: { ttl: 60_000 } })).toBe('58913721');
    expect(await matchmaking.netCL('AT', { cache: true })).toBe('58913721');
    expect(mock.calls).toBe(1);
    await matchmaking.netCL('AT');
    expect(mock.calls).toBe(2);
  });
});

describe('normalizeMnemonic', () => {
  it('fills a raw live link from its metadata', () => {
    const normalized = normalizeMnemonic({
      mnemonic: '1865-4829-7018',
      linkType: 'valkyrie:application',
      creatorName: 'alche_studio',
      metadata: {
        title: 'Island',
        tagline: 'Tagline',
        image_url: 'https://cdn/full.jpeg',
        image_urls: { url: 'https://cdn/full.jpeg', url_m: 'https://cdn/m.jpeg', url_s: 'https://cdn/s.jpeg' },
        matchmakingV2: { maxPlayers: 20 },
      },
    });
    expect(normalized).toMatchObject({
      creator: 'alche_studio',
      title: 'Island',
      description: 'Tagline',
      image: 'https://cdn/full.jpeg',
      images: { full: 'https://cdn/full.jpeg', medium: 'https://cdn/m.jpeg', small: 'https://cdn/s.jpeg', tiny: null },
      parentExperience: null,
      matchmaking: { v1: null, v2: { maxPlayers: 20 }, v3: null, plugins: null },
    });
  });

  it('turns blank strings into null and keeps already-normalized values', () => {
    const normalized = normalizeMnemonic({
      mnemonic: 'playlist_x',
      linkType: 'BR:Playlist',
      creator: 'Epic',
      title: 'Kept',
      image: '',
      images: { full: '', medium: null, small: null, tiny: null },
      metadata: { image_url: '' },
      matchmaking: { v1: { a: 1 }, v2: null, v3: null, plugins: ['p'] },
    });
    expect(normalized.title).toBe('Kept');
    expect(normalized.image).toBeNull();
    expect(normalized.images.full).toBeNull();
    expect(normalized.matchmaking).toEqual({ v1: { a: 1 }, v2: null, v3: null, plugins: ['p'] });
  });
});
