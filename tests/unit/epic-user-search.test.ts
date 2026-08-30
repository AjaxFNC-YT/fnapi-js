import { describe, expect, it } from 'vitest';
import { AccountManager } from '../../src/epic/account.js';
import { UserSearchManager, UserSearchPlatform } from '../../src/epic/userSearch.js';
import { EpicRestClient } from '../../src/epic/rest.js';
import { USER_SEARCH_BASE_URL } from '../../src/epic/userSearch.js';
import { ValidationError } from '../../src/core/errors.js';
import { createMockFetch, type MockFetch, type MockResponseInit } from '../helpers/mockFetch.js';

function setup(...responses: MockResponseInit[]): { mock: MockFetch; userSearch: UserSearchManager } {
  const mock = createMockFetch(...responses);
  const rest = new EpicRestClient({ fetch: mock.fetch, retry: 1, baseUrl: USER_SEARCH_BASE_URL });
  const accountRest = new EpicRestClient({ fetch: mock.fetch, retry: 1 });
  const accounts = new AccountManager(accountRest);
  return { mock, userSearch: new UserSearchManager(rest, accounts) };
}

async function captureThrow(fn: () => unknown): Promise<unknown> {
  try {
    await fn();
  } catch (error) {
    return error;
  }
  throw new Error('Expected the call to throw');
}

const NINJA = {
  accountId: '4735ce9132924caf8a5b17789b40f79c',
  matches: [{ value: 'Ninja', platform: 'epic' }],
  matchType: 'exact',
  epicMutuals: 0,
  sortPosition: 0,
};

describe('UserSearchManager', () => {
  it('searches by prefix on the epic platform by default', async () => {
    const { mock, userSearch } = setup({ body: [NINJA] });
    await userSearch.search('AT', 'ME', 'Ninja');
    const request = mock.lastRequest();
    expect(request.method).toBe('GET');
    expect(request.path).toBe('/api/v1/search/ME');
    expect(request.headers['authorization']).toBe('Bearer AT');
    expect(request.query.get('prefix')).toBe('Ninja');
    expect(request.query.get('platform')).toBe('epic');
    expect(new URL(request.url).host).toBe(new URL(USER_SEARCH_BASE_URL).host);
  });

  it('honours a platform override', async () => {
    const { mock, userSearch } = setup({ body: [] });
    await userSearch.search('AT', 'ME', 'ninja', { platform: UserSearchPlatform.PlayStation });
    expect(mock.lastRequest().query.get('platform')).toBe('psn');
  });

  it('returns the matches with their per-platform values', async () => {
    const { userSearch } = setup({ body: [NINJA] });
    const results = await userSearch.search('AT', 'ME', 'Ninja');
    expect(results).toHaveLength(1);
    expect(results[0]?.matches[0]).toEqual({ value: 'Ninja', platform: 'epic' });
    expect(results[0]?.matchType).toBe('exact');
  });

  it('returns an empty array when there are no matches (204)', async () => {
    const { userSearch } = setup({ status: 204 });
    expect(await userSearch.search('AT', 'ME', 'zzz')).toEqual([]);
  });

  it('enriches resolved results with epic display names', async () => {
    const { userSearch } = setup(
      { body: [NINJA] },
      { body: [{ id: NINJA.accountId, displayName: 'Ninja' }] },
    );
    const results = await userSearch.searchResolved('AT', 'ME', 'Ninja');
    expect(results[0]?.displayName).toBe('Ninja');
    expect(results[0]?.account?.id).toBe(NINJA.accountId);
  });

  it('rejects a blank prefix without a request', async () => {
    const { mock, userSearch } = setup();
    expect(await captureThrow(() => userSearch.search('AT', 'ME', ''))).toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });
});
