import { describe, expect, it } from 'vitest';
import { ConfigurationError } from '../../src/core/errors.js';
import { AccountManager } from '../../src/epic/account.js';
import { FriendsManager } from '../../src/epic/friends.js';
import { EpicRestClient } from '../../src/epic/rest.js';
import { ValidationError } from '../../src/core/errors.js';
import { createMockFetch, type MockFetch, type MockResponseInit } from '../helpers/mockFetch.js';

function setup(...responses: MockResponseInit[]): { mock: MockFetch; friends: FriendsManager } {
  const mock = createMockFetch(...responses);
  const rest = new EpicRestClient({ fetch: mock.fetch, retry: 1 });
  return { mock, friends: new FriendsManager(rest) };
}

function setupWithAccounts(...responses: MockResponseInit[]): { mock: MockFetch; friends: FriendsManager } {
  const mock = createMockFetch(...responses);
  const rest = new EpicRestClient({ fetch: mock.fetch, retry: 1 });
  return { mock, friends: new FriendsManager(rest, new AccountManager(rest)) };
}

async function captureThrow(fn: () => unknown): Promise<unknown> {
  try {
    await fn();
  } catch (error) {
    return error;
  }
  throw new Error('Expected the call to throw');
}

const rawFriendEntry = {
  accountId: 'FRIEND',
  groups: [],
  alias: 'lele test',
  note: 'a note',
  favorite: false,
  created: '2024-05-10T09:16:39.913Z',
};

const friendEntry = {
  accountId: 'FRIEND',
  groups: [],
  nickname: 'lele test',
  note: 'a note',
  favorite: false,
  created: '2024-05-10T09:16:39.913Z',
};

describe('FriendsManager', () => {
  it('fetches the friends summary', async () => {
    const { mock, friends } = setup({ body: { friends: [rawFriendEntry], incoming: [], outgoing: [] } });
    const result = await friends.summary('AT', 'ME');
    const request = mock.lastRequest();
    expect(request.method).toBe('GET');
    expect(request.path).toBe('/friends/api/v1/ME/summary');
    expect(request.headers['authorization']).toBe('Bearer AT');
    expect(result.friends).toEqual([friendEntry]);
  });

  it('lists friends', async () => {
    const { mock, friends } = setup({ body: [rawFriendEntry] });
    const result = await friends.list('AT', 'ME');
    const request = mock.lastRequest();
    expect(request.method).toBe('GET');
    expect(request.path).toBe('/friends/api/v1/ME/friends');
    expect(result).toEqual([friendEntry]);
  });

  it('lists incoming requests', async () => {
    const { mock, friends } = setup({ body: [] });
    await friends.incoming('AT', 'ME');
    expect(mock.lastRequest().path).toBe('/friends/api/v1/ME/incoming');
  });

  it('lists outgoing requests', async () => {
    const { mock, friends } = setup({ body: [] });
    await friends.outgoing('AT', 'ME');
    expect(mock.lastRequest().path).toBe('/friends/api/v1/ME/outgoing');
  });

  it('lists suggested friends', async () => {
    const { mock, friends } = setup({ body: [] });
    await friends.suggested('AT', 'ME');
    expect(mock.lastRequest().path).toBe('/friends/api/v1/ME/suggested');
  });

  it('accepts bulk requests with a comma-joined query param', async () => {
    const { mock, friends } = setup({ body: ['a'] });
    const result = await friends.acceptBulk('AT', 'ME', ['a', 'b']);
    const request = mock.lastRequest();
    expect(request.method).toBe('POST');
    expect(request.path).toBe('/friends/api/v1/ME/incoming/accept');
    expect(request.query.get('targetIds')).toBe('a,b');
    expect(result).toEqual(['a']);
  });

  it('rejects an empty targetIds array without a request', async () => {
    const { mock, friends } = setup();
    expect(await captureThrow(() => friends.acceptBulk('AT', 'ME', []))).toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });

  it('clears the friends list', async () => {
    const { mock, friends } = setup({ status: 204 });
    await friends.clearAll('AT', 'ME');
    const request = mock.lastRequest();
    expect(request.method).toBe('DELETE');
    expect(request.path).toBe('/friends/api/v1/ME/friends');
  });

  it('fetches a single friendship', async () => {
    const { mock, friends } = setup({ body: rawFriendEntry });
    const result = await friends.get('AT', 'ME', 'FRIEND');
    const request = mock.lastRequest();
    expect(request.method).toBe('GET');
    expect(request.path).toBe('/friends/api/v1/ME/friends/FRIEND');
    expect(result).toEqual(friendEntry);
  });

  it('adds a friend without a pin', async () => {
    const { mock, friends } = setup({ status: 204 });
    await friends.add('AT', 'ME', 'FRIEND');
    const request = mock.lastRequest();
    expect(request.method).toBe('POST');
    expect(request.path).toBe('/friends/api/v1/ME/friends/FRIEND');
    expect(request.body).toBeUndefined();
  });

  it('adds a friend with a parental controls pin', async () => {
    const { mock, friends } = setup({ status: 204 });
    await friends.add('AT', 'ME', 'FRIEND', { pin: '123456' });
    const request = mock.lastRequest();
    expect(request.headers['content-type']).toBe('application/json');
    expect(JSON.parse(request.body ?? '{}')).toEqual({ pin: '123456' });
  });

  it('removes a friend', async () => {
    const { mock, friends } = setup({ status: 204 });
    await friends.remove('AT', 'ME', 'FRIEND');
    const request = mock.lastRequest();
    expect(request.method).toBe('DELETE');
    expect(request.path).toBe('/friends/api/v1/ME/friends/FRIEND');
  });

  it('fetches mutual friends', async () => {
    const { mock, friends } = setup({ body: ['x', 'y'] });
    const result = await friends.mutual('AT', 'ME', 'FRIEND');
    const request = mock.lastRequest();
    expect(request.path).toBe('/friends/api/v1/ME/friends/FRIEND/mutual');
    expect(result).toEqual(['x', 'y']);
  });

  it('sets a nickname with a text/plain body', async () => {
    const { mock, friends } = setup({ status: 204 });
    await friends.setNickname('AT', 'ME', 'FRIEND', 'best pal');
    const request = mock.lastRequest();
    expect(request.method).toBe('PUT');
    expect(request.path).toBe('/friends/api/v1/ME/friends/FRIEND/alias');
    expect(request.headers['content-type']).toBe('text/plain');
    expect(request.body).toBe('best pal');
  });

  it('removes a nickname', async () => {
    const { mock, friends } = setup({ status: 204 });
    await friends.removeNickname('AT', 'ME', 'FRIEND');
    const request = mock.lastRequest();
    expect(request.method).toBe('DELETE');
    expect(request.path).toBe('/friends/api/v1/ME/friends/FRIEND/alias');
  });

  it('sets a note with a text/plain body', async () => {
    const { mock, friends } = setup({ status: 204 });
    await friends.setNote('AT', 'ME', 'FRIEND', 'hello world');
    const request = mock.lastRequest();
    expect(request.method).toBe('PUT');
    expect(request.path).toBe('/friends/api/v1/ME/friends/FRIEND/note');
    expect(request.headers['content-type']).toBe('text/plain');
    expect(request.body).toBe('hello world');
  });

  it('removes a note', async () => {
    const { mock, friends } = setup({ status: 204 });
    await friends.removeNote('AT', 'ME', 'FRIEND');
    const request = mock.lastRequest();
    expect(request.method).toBe('DELETE');
    expect(request.path).toBe('/friends/api/v1/ME/friends/FRIEND/note');
  });

  it('lists the blocklist', async () => {
    const { mock, friends } = setup({ body: [{ accountId: 'B', created: '2024-05-10T11:03:43.976Z' }] });
    const result = await friends.blocklist('AT', 'ME');
    const request = mock.lastRequest();
    expect(request.path).toBe('/friends/api/v1/ME/blocklist');
    expect(result[0]?.accountId).toBe('B');
  });

  it('blocks an account', async () => {
    const { mock, friends } = setup({ status: 204 });
    await friends.block('AT', 'ME', 'BAD');
    const request = mock.lastRequest();
    expect(request.method).toBe('POST');
    expect(request.path).toBe('/friends/api/v1/ME/blocklist/BAD');
  });

  it('unblocks an account', async () => {
    const { mock, friends } = setup({ status: 204 });
    await friends.unblock('AT', 'ME', 'BAD');
    const request = mock.lastRequest();
    expect(request.method).toBe('DELETE');
    expect(request.path).toBe('/friends/api/v1/ME/blocklist/BAD');
  });

  it('rejects a blank access token without a request', async () => {
    const { mock, friends } = setup();
    expect(await captureThrow(() => friends.summary('', 'ME'))).toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });

  it('rejects a blank friend id without a request', async () => {
    const { mock, friends } = setup();
    expect(await captureThrow(() => friends.get('AT', 'ME', ''))).toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });

  it('rejects a blank nickname without a request', async () => {
    const { mock, friends } = setup();
    expect(await captureThrow(() => friends.setNickname('AT', 'ME', 'FRIEND', ''))).toBeInstanceOf(
      ValidationError,
    );
    expect(mock.calls).toBe(0);
  });

  it('maps the wire alias field onto nickname when listing', async () => {
    const { friends } = setup({ body: [rawFriendEntry] });
    const [entry] = await friends.list('AT', 'ME');
    expect(entry).toEqual(friendEntry);
    expect(entry).not.toHaveProperty('alias');
  });

  it('resolves friend account ids to display names', async () => {
    const { mock, friends } = setupWithAccounts(
      { body: [rawFriendEntry] },
      { body: [{ id: 'FRIEND', displayName: 'LeleTest' }] },
    );
    const resolved = await friends.listResolved('AT', 'ME');
    expect(mock.requests[0]?.path).toBe('/friends/api/v1/ME/friends');
    expect(mock.requests[1]?.path).toBe('/account/api/public/account');
    expect(mock.requests[1]?.query.getAll('accountId')).toEqual(['FRIEND']);
    expect(resolved[0]?.displayName).toBe('LeleTest');
    expect(resolved[0]?.account?.id).toBe('FRIEND');
    expect(resolved[0]?.nickname).toBe('lele test');
  });

  it('leaves display name undefined when the account cannot be resolved', async () => {
    const { friends } = setupWithAccounts({ body: [rawFriendEntry] }, { body: [] });
    const resolved = await friends.listResolved('AT', 'ME');
    expect(resolved[0]?.displayName).toBeUndefined();
    expect(resolved[0]?.account).toBeUndefined();
  });

  it('throws a ConfigurationError when resolving without an AccountManager', async () => {
    const { friends } = setup({ body: [rawFriendEntry] });
    expect(await captureThrow(() => friends.listResolved('AT', 'ME'))).toBeInstanceOf(ConfigurationError);
  });
});
