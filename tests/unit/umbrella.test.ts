import { describe, expect, it } from 'vitest';
import { Fortnite } from '../../src/client.js';
import { FortniteAPI } from '../../src/fortnite/client.js';
import { DillyAPI } from '../../src/dilly/index.js';
import { FnccAPI } from '../../src/fncc/index.js';
import { EpicGamesClient } from '../../src/epic/index.js';
import { createMockFetch } from '../helpers/mockFetch.js';

describe('Fortnite umbrella client', () => {
  it('wires the four provider clients', () => {
    const fn = new Fortnite();

    expect(fn.fortniteapi).toBeInstanceOf(FortniteAPI);
    expect(fn.dilly).toBeInstanceOf(DillyAPI);
    expect(fn.fncc).toBeInstanceOf(FnccAPI);
    expect(fn.epic).toBeInstanceOf(EpicGamesClient);
    expect(fn.ecosystem).toBe(fn.epic.ecosystem);
  });

  it('routes the api key only to the fortnite-api.com client', () => {
    const fn = new Fortnite({ apiKey: 'secret-key' });

    expect(fn.fortniteapi.rest.apiKey).toBe('secret-key');
    expect(fn.dilly.rest.apiKey).toBeNull();
    expect(fn.fncc.rest.apiKey).toBeNull();
    expect(fn.epic.ecosystemRest.apiKey).toBeNull();
  });

  it('propagates the shared fetch transport to every provider', async () => {
    const mock = createMockFetch({ status: 200, body: { status: 200, data: [] } });
    const fn = new Fortnite({ fetch: mock.fetch, retry: false });

    await fn.dilly.common.versions();
    expect(mock.lastRequest().url.startsWith('https://api.fortniteapi.com')).toBe(true);

    await fn.epic.ecosystem.islands();
    expect(mock.lastRequest().url.startsWith('https://api.fortnite.com')).toBe(true);

    await fn.fncc.game.version();
    expect(mock.lastRequest().url.startsWith('https://prod.fn-api.cc')).toBe(true);
  });
});
