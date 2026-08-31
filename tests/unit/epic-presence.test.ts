import { describe, expect, it } from 'vitest';
import { PresenceManager } from '../../src/epic/presence.js';
import { EpicRestClient } from '../../src/epic/rest.js';
import { ValidationError } from '../../src/core/errors.js';
import { createMockFetch, type MockFetch, type MockResponseInit } from '../helpers/mockFetch.js';

function setup(...responses: MockResponseInit[]): { mock: MockFetch; presence: PresenceManager } {
  const mock = createMockFetch(...responses);
  const rest = new EpicRestClient({ fetch: mock.fetch, retry: 1 });
  return { mock, presence: new PresenceManager(rest) };
}

async function captureThrow(fn: () => unknown): Promise<unknown> {
  try {
    await fn();
  } catch (error) {
    return error;
  }
  throw new Error('Expected the call to throw');
}

describe('PresenceManager', () => {
  it('fetches last online for an account', async () => {
    const { mock, presence } = setup({ body: { ACC: [{ last_online: '2026-08-01T00:00:00Z' }] } });
    await presence.lastOnline('AT', 'ACC');
    const request = mock.lastRequest();
    expect(request.method).toBe('GET');
    expect(request.path).toBe('/presence/api/v1/Fortnite/ACC/last-online');
    expect(request.headers['authorization']).toBe('Bearer AT');
  });

  it('honors a per-call namespace override', async () => {
    const { mock, presence } = setup({ body: {} });
    await presence.lastOnline('AT', 'ACC', { namespace: 'custom' });
    expect(mock.lastRequest().path).toBe('/presence/api/v1/custom/ACC/last-online');
  });

  it('extracts the first entry for an account', async () => {
    const entry = { last_online: '2026-08-01T00:00:00Z' };
    const { presence } = setup({ body: { ACC: [entry] } });
    const result = await presence.lastOnlineFor('AT', 'ACC');
    expect(result).toEqual(entry);
  });

  it('returns null when no entry exists', async () => {
    const { presence } = setup({ body: {} });
    const result = await presence.lastOnlineFor('AT', 'ACC');
    expect(result).toBeNull();
  });

  it('rejects a blank account id without a request', async () => {
    const { mock, presence } = setup();
    expect(await captureThrow(() => presence.lastOnline('AT', ''))).toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });

  it('fetches the bulk friends presence snapshot', async () => {
    const rows = [
      { accountId: 'friend-1', status: 'online' },
      { accountId: 'friend-2', status: 'away' },
    ];
    const { mock, presence } = setup({ body: rows });
    const result = await presence.friendsPresence('AT', 'ME');
    const request = mock.lastRequest();
    expect(request.method).toBe('GET');
    expect(request.path).toBe('/presence/api/v1/_/friends/ME');
    expect(request.headers['authorization']).toBe('Bearer AT');
    expect(result).toEqual(rows);
  });

  it('coerces a non-array bulk presence body to an empty list', async () => {
    const { presence } = setup({ body: {} });
    expect(await presence.friendsPresence('AT', 'ME')).toEqual([]);
  });

  it('rejects a blank account id for the bulk snapshot without a request', async () => {
    const { mock, presence } = setup();
    expect(await captureThrow(() => presence.friendsPresence('AT', ''))).toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });
});
