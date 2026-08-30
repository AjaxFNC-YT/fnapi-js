import { describe, expect, it } from 'vitest';
import { AuthClients } from '../../src/epic/clients.js';
import { EpicGamesClient } from '../../src/epic/client.js';
import { EpicAuthSession } from '../../src/epic/session.js';
import type { ExchangeCode, OAuthToken } from '../../src/epic/types.js';
import { createMockFetch, type MockResponseInit } from '../helpers/mockFetch.js';

const switchClient = AuthClients.fortniteNewSwitch;
const androidClient = AuthClients.fortniteAndroid;

const switchToken: OAuthToken = {
  access_token: 'SWITCH_AT',
  expires_in: 7200,
  expires_at: new Date(Date.now() + 7_200_000).toISOString(),
  token_type: 'bearer',
  refresh_token: 'SWITCH_RT',
  account_id: 'ACC',
  displayName: 'Tester',
  client_id: switchClient.clientId,
  internal_client: true,
  client_service: 'prod-fn',
};

const androidToken: OAuthToken = {
  ...switchToken,
  access_token: 'ANDROID_AT',
  refresh_token: 'ANDROID_RT',
  client_id: androidClient.clientId,
};

const exchangeResponse: ExchangeCode = {
  expiresInSeconds: 300,
  code: 'the-exchange-code',
  creatingClientId: switchClient.clientId,
  consumingClientId: androidClient.clientId,
};

function clientWith(...responses: MockResponseInit[]): {
  epic: EpicGamesClient;
  mock: ReturnType<typeof createMockFetch>;
} {
  const mock = createMockFetch(...responses);
  const epic = new EpicGamesClient({ fetch: mock.fetch, retry: 1, allowCustomClients: true });
  return { epic, mock };
}

describe('EpicGamesClient.changeClient', () => {
  it('creates an exchange code for the target client then redeems it', async () => {
    const { epic, mock } = clientWith({ body: exchangeResponse }, { body: androidToken });

    const session = await epic.changeClient('SWITCH_AT', 'fortniteAndroid');

    expect(session).toBeInstanceOf(EpicAuthSession);
    expect(session.accessToken).toBe('ANDROID_AT');
    expect(session.client).toBe(androidClient);

    const exchangeReq = mock.requests[0]!;
    expect(exchangeReq.method).toBe('GET');
    expect(exchangeReq.path).toBe('/account/api/oauth/exchange');
    expect(exchangeReq.headers.authorization).toBe('Bearer SWITCH_AT');
    expect(exchangeReq.query.get('consumingClientId')).toBe(androidClient.clientId);

    const tokenReq = mock.requests[1]!;
    expect(tokenReq.method).toBe('POST');
    expect(tokenReq.path).toBe('/account/api/oauth/token');
    expect(tokenReq.headers.authorization).toBe(
      `Basic ${Buffer.from(`${androidClient.clientId}:${androidClient.clientSecret}`).toString('base64')}`,
    );
    const form = new URLSearchParams(tokenReq.body);
    expect(form.get('grant_type')).toBe('exchange_code');
    expect(form.get('exchange_code')).toBe('the-exchange-code');
  });

  it('accepts a custom target client object', async () => {
    const { epic, mock } = clientWith({ body: exchangeResponse }, { body: androidToken });
    const custom = { name: 'my-app', clientId: 'abcdef0123456789abcdef0123456789', clientSecret: 'sekret' };

    const session = await epic.changeClient('SWITCH_AT', custom);

    expect(session.client).toBe(custom);
    expect(mock.requests[0]!.query.get('consumingClientId')).toBe(custom.clientId);
  });
});

describe('EpicAuthSession.switchClient', () => {
  it('exchanges the current session for one bound to the new client', async () => {
    const { epic, mock } = clientWith({ body: exchangeResponse }, { body: androidToken });
    const session = epic.session(switchToken, switchClient);

    const android = await session.switchClient('fortniteAndroid');

    expect(android).toBeInstanceOf(EpicAuthSession);
    expect(android.accessToken).toBe('ANDROID_AT');
    expect(android.client).toBe(androidClient);
    expect(android.accountId).toBe('ACC');

    expect(mock.requests[0]!.headers.authorization).toBe('Bearer SWITCH_AT');
    expect(mock.requests[0]!.query.get('consumingClientId')).toBe(androidClient.clientId);
    expect(new URLSearchParams(mock.requests[1]!.body).get('grant_type')).toBe('exchange_code');
  });

  it('keeps the original session usable after switching', async () => {
    const { epic } = clientWith({ body: exchangeResponse }, { body: androidToken });
    const session = epic.session(switchToken, switchClient);

    await session.switchClient('fortniteAndroid');

    expect(session.accessToken).toBe('SWITCH_AT');
    expect(session.client).toBe(switchClient);
  });
});
