import { describe, expect, it } from 'vitest';
import { EpicGamesClient } from '../../src/epic/client.js';
import { AuthClients } from '../../src/epic/clients.js';
import { ValidationError } from '../../src/core/errors.js';
import { createMockFetch, type MockFetch, type MockResponseInit } from '../helpers/mockFetch.js';
import type { OAuthToken } from '../../src/epic/types.js';

function makeToken(overrides: Partial<OAuthToken> = {}): OAuthToken {
  return {
    access_token: 'AT',
    refresh_token: 'RT',
    expires_in: 7200,
    expires_at: new Date(Date.now() + 7_200_000).toISOString(),
    account_id: 'ACC',
    displayName: 'Name',
    client_id: 'ec684b8c687f479fadea3cb2ad83f5c6',
    token_type: 'bearer',
    internal_client: true,
    client_service: 'prod-fn',
    ...overrides,
  };
}

function setup(...responses: MockResponseInit[]): { mock: MockFetch; client: EpicGamesClient } {
  const mock = createMockFetch(...responses);
  const client = new EpicGamesClient({ fetch: mock.fetch, retry: 1 });
  return { mock, client };
}

async function captureThrow(fn: () => unknown): Promise<unknown> {
  try {
    await fn();
  } catch (error) {
    return error;
  }
  throw new Error('Expected the call to throw');
}

describe('EpicAuthSession getters', () => {
  it('exposes the token fields', () => {
    const { client } = setup();
    const session = client.session(makeToken());
    expect(session.accessToken).toBe('AT');
    expect(session.accountId).toBe('ACC');
    expect(session.displayName).toBe('Name');
    expect(session.refreshTokenValue).toBe('RT');
    expect(session.canRefresh).toBe(true);
  });

  it('reports an expired token', () => {
    const { client } = setup();
    const session = client.session(makeToken({ expires_at: new Date(Date.now() - 1000).toISOString() }));
    expect(session.isExpired).toBe(true);
  });

  it('reports a valid token', () => {
    const { client } = setup();
    const session = client.session(makeToken({ expires_at: new Date(Date.now() + 60_000).toISOString() }));
    expect(session.isExpired).toBe(false);
  });
});

describe('EpicAuthSession refresh', () => {
  it('refreshes with the refresh_token grant', async () => {
    const { mock, client } = setup({ body: makeToken({ access_token: 'NEW_AT' }) });
    const session = client.session(makeToken());
    await session.refresh();
    const form = new URLSearchParams(mock.lastRequest().body);
    expect(form.get('grant_type')).toBe('refresh_token');
    expect(form.get('refresh_token')).toBe('RT');
    expect(session.accessToken).toBe('NEW_AT');
  });

  it('rejects refresh when there is no refresh token', async () => {
    const { mock, client } = setup();
    const session = client.session(makeToken({ refresh_token: undefined }));
    expect(await captureThrow(() => session.refresh())).toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });
});

describe('EpicAuthSession ensureValid', () => {
  it('does not refresh a token that is far from expiry', async () => {
    const { mock, client } = setup();
    const session = client.session(makeToken({ expires_at: new Date(Date.now() + 3_600_000).toISOString() }));
    const token = await session.ensureValid();
    expect(token).toBe('AT');
    expect(mock.calls).toBe(0);
  });

  it('refreshes a token that is about to expire', async () => {
    const { mock, client } = setup({ body: makeToken({ access_token: 'NEW_AT' }) });
    const session = client.session(makeToken({ expires_at: new Date(Date.now() + 5000).toISOString() }));
    await session.ensureValid();
    expect(mock.calls).toBe(1);
  });
});

describe('EpicAuthSession endpoints', () => {
  it('verifies through the session token', async () => {
    const { mock, client } = setup({ body: { token: 'AT' } });
    const session = client.session(makeToken());
    await session.verify();
    const request = mock.lastRequest();
    expect(request.method).toBe('GET');
    expect(request.path).toBe('/account/api/oauth/verify');
    expect(request.headers['authorization']).toBe('Bearer AT');
  });

  it('logs out through the kill-session endpoint', async () => {
    const { mock, client } = setup();
    const session = client.session(makeToken());
    await session.logout();
    const request = mock.lastRequest();
    expect(request.method).toBe('DELETE');
    expect(request.path).toBe('/account/api/oauth/sessions/kill/AT');
  });

  it('creates an exchange code through the session', async () => {
    const { mock, client } = setup({ body: { code: 'x' } });
    const session = client.session(makeToken());
    await session.createExchangeCode();
    const request = mock.lastRequest();
    expect(request.method).toBe('GET');
    expect(request.path).toBe('/account/api/oauth/exchange');
  });
});

describe('EpicAuthSession account binding', () => {
  it('requires an account id for account-bound calls', async () => {
    const { mock, client } = setup();
    const session = client.session(makeToken({ account_id: undefined, refresh_token: undefined }));
    expect(await captureThrow(() => session.me())).toBeInstanceOf(ValidationError);
    expect(await captureThrow(() => session.listDeviceAuths())).toBeInstanceOf(ValidationError);
    expect(await captureThrow(() => session.createDeviceAuth())).toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });

  it('allows explicit-id lookups without a bound account', async () => {
    const { mock, client } = setup({ body: { id: 'someId', displayName: 'x' } });
    const session = client.session(makeToken({ account_id: undefined }));
    await session.account('someId');
    expect(mock.lastRequest().path).toBe('/account/api/public/account/someId');
    await session.accountByDisplayName('x');
    expect(mock.lastRequest().path).toBe('/account/api/public/account/displayName/x');
  });
});

describe('EpicAuthSession device auth reads', () => {
  const deviceAuth = { deviceId: 'devid', accountId: 'ACC', secret: 'SECRET' };

  it('retries listDeviceAuths with a read-capable token on a permission error', async () => {
    const { mock, client } = setup(
      { status: 403, body: { errorCode: 'errors.com.epicgames.common.missing_permission' } },
      { body: { code: 'EXCH' } },
      { body: makeToken({ access_token: 'READTOKEN' }) },
      { body: [deviceAuth] },
    );
    const session = client.session(makeToken());

    const result = await session.listDeviceAuths();

    expect(result).toEqual([deviceAuth]);
    expect(mock.calls).toBe(4);
    expect(mock.requests[0]!.headers['authorization']).toBe('Bearer AT');
    expect(mock.requests[1]!.path).toBe('/account/api/oauth/exchange');
    const last = mock.lastRequest();
    expect(last.path).toBe('/account/api/public/account/ACC/deviceAuth');
    expect(last.headers['authorization']).toBe('Bearer READTOKEN');
  });

  it('does not switch tokens when the first read succeeds', async () => {
    const { mock, client } = setup({ body: [deviceAuth] });
    const session = client.session(makeToken());

    const result = await session.listDeviceAuths();

    expect(result).toEqual([deviceAuth]);
    expect(mock.calls).toBe(1);
    expect(mock.lastRequest().headers['authorization']).toBe('Bearer AT');
  });
});

describe('EpicGamesClient defaults', () => {
  it('defaults to the fortniteAndroid game client', () => {
    const { client } = setup();
    expect(client.client().name).toBe('fortniteAndroidGameClient');
  });

  it('honours a custom default client', () => {
    const mock = createMockFetch();
    const client = new EpicGamesClient({ fetch: mock.fetch, defaultClient: 'fortnitePC' });
    expect(client.client().name).toBe('fortnitePCGameClient');
  });

  it('logs in with client credentials', async () => {
    const { mock, client } = setup({
      body: makeToken({ access_token: 'CC_AT', account_id: undefined, refresh_token: undefined }),
    });
    const session = await client.loginClientCredentials();
    expect(session.client).toEqual(AuthClients.fortniteAndroid);
    expect(session.accessToken).toBe('CC_AT');
    const form = new URLSearchParams(mock.lastRequest().body);
    expect(form.get('grant_type')).toBe('client_credentials');
  });
});
