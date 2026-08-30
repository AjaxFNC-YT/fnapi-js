import { describe, expect, it } from 'vitest';
import { AccountManager, DeviceAuthManager } from '../../src/epic/account.js';
import { EpicRestClient } from '../../src/epic/rest.js';
import { ValidationError } from '../../src/core/errors.js';
import { createMockFetch, type MockFetch, type MockResponseInit } from '../helpers/mockFetch.js';

const deviceAuth = {
  deviceId: 'devid',
  accountId: 'ACC',
  created: { dateTime: '2024-01-01T00:00:00.000Z' },
};

function setup(...responses: MockResponseInit[]): {
  mock: MockFetch;
  devices: DeviceAuthManager;
  accounts: AccountManager;
} {
  const mock = createMockFetch(...responses);
  const rest = new EpicRestClient({ fetch: mock.fetch, retry: 1 });
  return { mock, devices: new DeviceAuthManager(rest), accounts: new AccountManager(rest) };
}

async function captureThrow(fn: () => unknown): Promise<unknown> {
  try {
    await fn();
  } catch (error) {
    return error;
  }
  throw new Error('Expected the call to throw');
}

describe('DeviceAuthManager', () => {
  it('creates a device auth', async () => {
    const { mock, devices } = setup({ body: deviceAuth });
    const result = await devices.create('AT', 'ACC');
    const request = mock.lastRequest();
    expect(request.method).toBe('POST');
    expect(request.path).toBe('/account/api/public/account/ACC/deviceAuth');
    expect(request.headers['authorization']).toBe('Bearer AT');
    expect(result).toEqual(deviceAuth);
  });

  it('lists device auths', async () => {
    const { mock, devices } = setup({ body: [deviceAuth] });
    const result = await devices.list('AT', 'ACC');
    const request = mock.lastRequest();
    expect(request.method).toBe('GET');
    expect(request.path).toBe('/account/api/public/account/ACC/deviceAuth');
    expect(result).toEqual([deviceAuth]);
  });

  it('gets a single device auth', async () => {
    const { mock, devices } = setup({ body: deviceAuth });
    await devices.get('AT', 'ACC', 'devid');
    const request = mock.lastRequest();
    expect(request.method).toBe('GET');
    expect(request.path).toBe('/account/api/public/account/ACC/deviceAuth/devid');
  });

  it('deletes a device auth', async () => {
    const { mock, devices } = setup();
    await devices.delete('AT', 'ACC', 'devid');
    const request = mock.lastRequest();
    expect(request.method).toBe('DELETE');
    expect(request.path).toBe('/account/api/public/account/ACC/deviceAuth/devid');
  });

  it('rejects a blank access token without a request', async () => {
    const { mock, devices } = setup();
    expect(await captureThrow(() => devices.create('', 'ACC'))).toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });

  it('rejects a blank account id without a request', async () => {
    const { mock, devices } = setup();
    expect(await captureThrow(() => devices.list('AT', ''))).toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });

  it('rejects a blank device id without a request', async () => {
    const { mock, devices } = setup();
    expect(await captureThrow(() => devices.get('AT', 'ACC', ''))).toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });
});

describe('AccountManager', () => {
  it('looks up an account by id', async () => {
    const { mock, accounts } = setup({ body: { id: 'accId', displayName: 'x' } });
    await accounts.byId('AT', 'accId');
    const request = mock.lastRequest();
    expect(request.method).toBe('GET');
    expect(request.path).toBe('/account/api/public/account/accId');
    expect(request.headers['authorization']).toBe('Bearer AT');
  });

  it('looks up accounts by ids with a repeated query param', async () => {
    const { mock, accounts } = setup({ body: [] });
    await accounts.byIds('AT', ['a', 'b']);
    const request = mock.lastRequest();
    expect(request.method).toBe('GET');
    expect(request.path).toBe('/account/api/public/account');
    expect(request.query.getAll('accountId')).toEqual(['a', 'b']);
  });

  it('rejects an empty ids array without a request', async () => {
    const { mock, accounts } = setup();
    expect(await captureThrow(() => accounts.byIds('AT', []))).toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });

  it('rejects more than 100 ids without a request', async () => {
    const { mock, accounts } = setup();
    const ids = Array.from({ length: 101 }, (_, i) => String(i));
    expect(await captureThrow(() => accounts.byIds('AT', ids))).toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });

  it('looks up an account by display name', async () => {
    const { mock, accounts } = setup({ body: { id: 'accId', displayName: 'Ninja' } });
    await accounts.byDisplayName('AT', 'Ninja');
    const request = mock.lastRequest();
    expect(request.method).toBe('GET');
    expect(request.path).toBe('/account/api/public/account/displayName/Ninja');
  });

  it('looks up an account by url-encoded email', async () => {
    const { mock, accounts } = setup({ body: { id: 'accId', displayName: 'x' } });
    await accounts.byEmail('AT', 'a@b.com');
    const request = mock.lastRequest();
    expect(request.method).toBe('GET');
    expect(request.path).toBe('/account/api/public/account/email/a%40b.com');
  });

  it('resolves ids into a map keyed by account id', async () => {
    const { mock, accounts } = setup({
      body: [
        { id: 'a', displayName: 'Alpha' },
        { id: 'b', displayName: 'Bravo' },
      ],
    });
    const resolved = await accounts.resolveAccounts('AT', ['a', 'b']);
    expect(mock.lastRequest().query.getAll('accountId')).toEqual(['a', 'b']);
    expect(resolved.get('a')?.displayName).toBe('Alpha');
    expect(resolved.get('b')?.displayName).toBe('Bravo');
  });

  it('dedupes and drops blank ids before resolving', async () => {
    const { mock, accounts } = setup({ body: [{ id: 'a', displayName: 'Alpha' }] });
    await accounts.resolveAccounts('AT', ['a', 'a', '', '  ']);
    expect(mock.lastRequest().query.getAll('accountId')).toEqual(['a']);
  });

  it('makes no request when there are no resolvable ids', async () => {
    const { mock, accounts } = setup();
    const resolved = await accounts.resolveAccounts('AT', ['', '  ']);
    expect(resolved.size).toBe(0);
    expect(mock.calls).toBe(0);
  });

  it('chunks id resolution into batches of 100', async () => {
    const first = Array.from({ length: 100 }, (_, i) => ({ id: `a${i}`, displayName: `A${i}` }));
    const { mock, accounts } = setup(
      { body: first },
      { body: [{ id: 'a100', displayName: 'A100' }] },
    );
    const ids = Array.from({ length: 101 }, (_, i) => `a${i}`);
    const resolved = await accounts.resolveAccounts('AT', ids);
    expect(mock.calls).toBe(2);
    expect(mock.requests[0]?.query.getAll('accountId')).toHaveLength(100);
    expect(mock.requests[1]?.query.getAll('accountId')).toEqual(['a100']);
    expect(resolved.size).toBe(101);
  });

  it('resolves ids straight to display names', async () => {
    const { accounts } = setup({
      body: [
        { id: 'a', displayName: 'Alpha' },
        { id: 'b', displayName: 'Bravo' },
      ],
    });
    const names = await accounts.resolveNames('AT', ['a', 'b']);
    expect(names.get('a')).toBe('Alpha');
    expect(names.get('b')).toBe('Bravo');
  });
});
