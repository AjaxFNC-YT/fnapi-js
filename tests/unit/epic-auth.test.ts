import { describe, expect, it } from 'vitest';
import { AuthManager } from '../../src/epic/auth.js';
import { DeviceAuthManager } from '../../src/epic/account.js';
import { EpicRestClient, basicAuthHeader } from '../../src/epic/rest.js';
import { AuthClients } from '../../src/epic/clients.js';
import { EpicApiError, EpicAuthError } from '../../src/epic/errors.js';
import { ValidationError } from '../../src/core/errors.js';
import { createMockFetch, type MockFetch, type MockResponseInit } from '../helpers/mockFetch.js';

const client = AuthClients.fortnitePC;

const tokenBody = {
  access_token: 'AT',
  expires_in: 7200,
  expires_at: '2099-01-01T00:00:00.000Z',
  token_type: 'bearer',
  refresh_token: 'RT',
  account_id: 'ACC',
  client_id: 'ec684b8c687f479fadea3cb2ad83f5c6',
  internal_client: true,
  client_service: 'prod-fn',
};

function setup(...responses: MockResponseInit[]): { mock: MockFetch; auth: AuthManager } {
  const mock = createMockFetch(...responses);
  const auth = new AuthManager(new EpicRestClient({ fetch: mock.fetch, retry: 1 }));
  return { mock, auth };
}

async function captureThrow(fn: () => unknown): Promise<unknown> {
  try {
    await fn();
  } catch (error) {
    return error;
  }
  throw new Error('Expected the call to throw');
}

function expectTokenRequest(mock: MockFetch, grantType: string): URLSearchParams {
  const request = mock.lastRequest();
  expect(request.method).toBe('POST');
  expect(request.path).toBe('/account/api/oauth/token');
  expect(request.headers['content-type']).toBe('application/x-www-form-urlencoded');
  expect(request.headers['authorization']).toBe(basicAuthHeader(client));
  const form = new URLSearchParams(request.body);
  expect(form.get('grant_type')).toBe(grantType);
  return form;
}

describe('AuthManager token grants', () => {
  it('requests a client_credentials token', async () => {
    const { mock, auth } = setup({ body: tokenBody });
    const result = await auth.clientCredentials(client);
    expectTokenRequest(mock, 'client_credentials');
    expect(result).toEqual(tokenBody);
  });

  it('requests an authorization_code token', async () => {
    const { mock, auth } = setup({ body: tokenBody });
    const result = await auth.authorizationCode(client, 'abc', { codeVerifier: 'v' });
    const form = expectTokenRequest(mock, 'authorization_code');
    expect(form.get('code')).toBe('abc');
    expect(form.get('code_verifier')).toBe('v');
    expect(result).toEqual(tokenBody);
  });

  it('requests an exchange_code token', async () => {
    const { mock, auth } = setup({ body: tokenBody });
    const result = await auth.exchangeCode(client, 'abc');
    const form = expectTokenRequest(mock, 'exchange_code');
    expect(form.get('exchange_code')).toBe('abc');
    expect(result).toEqual(tokenBody);
  });

  it('requests a device_auth token', async () => {
    const { mock, auth } = setup({ body: tokenBody });
    const result = await auth.deviceAuth(client, { accountId: 'acc', deviceId: 'dev', secret: 'sec' });
    const form = expectTokenRequest(mock, 'device_auth');
    expect(form.get('account_id')).toBe('acc');
    expect(form.get('device_id')).toBe('dev');
    expect(form.get('secret')).toBe('sec');
    expect(result).toEqual(tokenBody);
  });

  it('requests a device_code token', async () => {
    const { mock, auth } = setup({ body: tokenBody });
    const result = await auth.deviceCode(client, 'dc');
    const form = expectTokenRequest(mock, 'device_code');
    expect(form.get('device_code')).toBe('dc');
    expect(result).toEqual(tokenBody);
  });

  it('requests a refresh_token token', async () => {
    const { mock, auth } = setup({ body: tokenBody });
    const result = await auth.refreshToken(client, 'rt');
    const form = expectTokenRequest(mock, 'refresh_token');
    expect(form.get('refresh_token')).toBe('rt');
    expect(result).toEqual(tokenBody);
  });

  it('requests a continuation_token token', async () => {
    const { mock, auth } = setup({ body: tokenBody });
    const result = await auth.continuationToken(client, 'ct');
    const form = expectTokenRequest(mock, 'continuation_token');
    expect(form.get('continuation_token')).toBe('ct');
    expect(result).toEqual(tokenBody);
  });

  it('requests a password token', async () => {
    const { mock, auth } = setup({ body: tokenBody });
    const result = await auth.password(client, 'u', 'p');
    const form = expectTokenRequest(mock, 'password');
    expect(form.get('username')).toBe('u');
    expect(form.get('password')).toBe('p');
    expect(result).toEqual(tokenBody);
  });

  it('requests an otp token', async () => {
    const { mock, auth } = setup({ body: tokenBody });
    const result = await auth.otp(client, 'o', 'c');
    const form = expectTokenRequest(mock, 'otp');
    expect(form.get('otp')).toBe('o');
    expect(form.get('challenge')).toBe('c');
    expect(result).toEqual(tokenBody);
  });

  it('requests an external_auth token', async () => {
    const { mock, auth } = setup({ body: tokenBody });
    await auth.externalAuth(client, 'nintendo_id_token', 'EXT');
    const form = expectTokenRequest(mock, 'external_auth');
    expect(form.get('external_auth_type')).toBe('nintendo_id_token');
    expect(form.get('external_auth_token')).toBe('EXT');
  });

  it('requests a token_to_token token', async () => {
    const { mock, auth } = setup({ body: tokenBody });
    await auth.tokenToToken(client, 'SRC_AT');
    const form = expectTokenRequest(mock, 'token_to_token');
    expect(form.get('access_token')).toBe('SRC_AT');
  });

  it('defaults user-session grants to the eg1 token type', async () => {
    const { mock, auth } = setup({ body: tokenBody });
    await auth.deviceAuth(client, { accountId: 'a', deviceId: 'd', secret: 's' });
    expect(new URLSearchParams(mock.lastRequest().body).get('token_type')).toBe('eg1');
  });

  it('leaves client_credentials without a forced token type', async () => {
    const { mock, auth } = setup({ body: tokenBody });
    await auth.clientCredentials(client);
    expect(new URLSearchParams(mock.lastRequest().body).get('token_type')).toBeNull();
  });

  it('applies token type, perms and device id options', async () => {
    const { mock, auth } = setup({ body: tokenBody });
    await auth.token(client, 'client_credentials', {}, {
      tokenType: 'eg1',
      includePerms: true,
      deviceId: 'devid',
    });
    const request = mock.lastRequest();
    const form = new URLSearchParams(request.body);
    expect(form.get('token_type')).toBe('eg1');
    expect(form.get('includePerms')).toBe('true');
    expect(request.headers['x-epic-device-id']).toBe('devid');
  });
});

describe('AuthManager validation', () => {
  it('rejects an empty exchange code without a request', async () => {
    const { mock, auth } = setup();
    expect(await captureThrow(() => auth.exchangeCode(client, ''))).toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });

  it('rejects device auth with a blank account id without a request', async () => {
    const { mock, auth } = setup();
    expect(
      await captureThrow(() => auth.deviceAuth(client, { accountId: '', deviceId: 'd', secret: 's' })),
    ).toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });

  it('rejects an empty refresh token without a request', async () => {
    const { mock, auth } = setup();
    expect(await captureThrow(() => auth.refreshToken(client, ''))).toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });
});

describe('AuthManager oauth endpoints', () => {
  it('verifies a token', async () => {
    const { mock, auth } = setup({ body: { token: 'AT' } });
    await auth.verify('AT', { includePerms: true });
    const request = mock.lastRequest();
    expect(request.method).toBe('GET');
    expect(request.path).toBe('/account/api/oauth/verify');
    expect(request.headers['authorization']).toBe('Bearer AT');
    expect(request.query.get('includePerms')).toBe('true');
  });

  it('creates an exchange code', async () => {
    const { mock, auth } = setup({ body: { code: 'x' } });
    await auth.createExchangeCode('AT', {
      consumingClientId: 'cid',
      codeChallenge: 'ch',
      codeChallengeMethod: 'S256',
    });
    const request = mock.lastRequest();
    expect(request.method).toBe('GET');
    expect(request.path).toBe('/account/api/oauth/exchange');
    expect(request.headers['authorization']).toBe('Bearer AT');
    expect(request.query.get('consumingClientId')).toBe('cid');
    expect(request.query.get('codeChallenge')).toBe('ch');
    expect(request.query.get('codeChallengeMethod')).toBe('S256');
  });

  it('creates a device code', async () => {
    const { mock, auth } = setup({ body: { device_code: 'dc' } });
    await auth.createDeviceCode('AT');
    const request = mock.lastRequest();
    expect(request.method).toBe('POST');
    expect(request.path).toBe('/account/api/oauth/deviceAuthorization');
    expect(request.headers['authorization']).toBe('Bearer AT');
  });

  it('deletes a device code', async () => {
    const { mock, auth } = setup();
    await auth.deleteDeviceCode('AT', 'CODE');
    const request = mock.lastRequest();
    expect(request.method).toBe('DELETE');
    expect(request.path).toBe('/account/api/oauth/deviceAuthorization/CODE');
  });

  it('kills a single session by token', async () => {
    const { mock, auth } = setup();
    await auth.killSession('ACCESS');
    const request = mock.lastRequest();
    expect(request.method).toBe('DELETE');
    expect(request.path).toBe('/account/api/oauth/sessions/kill/ACCESS');
    expect(request.headers['authorization']).toBe('Bearer ACCESS');
  });

  it('kills a session with the killAllWithSameSource flag', async () => {
    const { mock, auth } = setup();
    await auth.killSession('ACCESS', { killAllWithSameSource: true });
    const request = mock.lastRequest();
    expect(request.path).toBe('/account/api/oauth/sessions/kill/ACCESS');
    expect(request.query.get('killAllWithSameSource')).toBe('true');
  });

  it('kills sessions by kill type', async () => {
    const { mock, auth } = setup();
    await auth.killSessions('ACCESS', 'ALL');
    const request = mock.lastRequest();
    expect(request.method).toBe('DELETE');
    expect(request.path).toBe('/account/api/oauth/sessions/kill');
    expect(request.query.get('killType')).toBe('ALL');
  });
});

describe('AuthManager error mapping', () => {
  it('maps an oauth error to EpicAuthError', async () => {
    const { auth } = setup({
      status: 400,
      body: {
        errorCode: 'errors.com.epicgames.account.oauth.exchange_code_not_found',
        errorMessage: 'Sorry the code you provided was not found',
      },
    });
    const error = (await captureThrow(() => auth.exchangeCode(client, 'bad'))) as EpicAuthError;
    expect(error).toBeInstanceOf(EpicAuthError);
    expect(error).toBeInstanceOf(EpicApiError);
    expect(error.errorCode).toBe('errors.com.epicgames.account.oauth.exchange_code_not_found');
    expect(error.status).toBe(400);
    expect(error.message).toBe('Sorry the code you provided was not found');
  });

  it('maps a non-oauth error to EpicApiError only', async () => {
    const mock = createMockFetch({
      status: 404,
      body: {
        errorCode: 'errors.com.epicgames.account.account_not_found',
        errorMessage: 'not found',
      },
    });
    const devices = new DeviceAuthManager(new EpicRestClient({ fetch: mock.fetch, retry: 1 }));
    const error = (await captureThrow(() => devices.create('AT', 'ACC'))) as EpicApiError;
    expect(error).toBeInstanceOf(EpicApiError);
    expect(error).not.toBeInstanceOf(EpicAuthError);
    expect(error.status).toBe(404);
  });
});
