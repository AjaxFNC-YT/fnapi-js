import { describe, expect, it } from 'vitest';
import { AuthManager } from '../../src/epic/auth.js';
import { AuthClients } from '../../src/epic/clients.js';
import { EpicGamesClient } from '../../src/epic/client.js';
import { DeviceCodeFlow } from '../../src/epic/deviceCode.js';
import { EpicAuthError } from '../../src/epic/errors.js';
import { EpicRestClient } from '../../src/epic/rest.js';
import { EpicAuthSession } from '../../src/epic/session.js';
import { AbortError } from '../../src/core/errors.js';
import type { DeviceCode, OAuthToken } from '../../src/epic/types.js';
import { createMockFetch, type MockResponseInit } from '../helpers/mockFetch.js';

const client = AuthClients.fortniteNewSwitch;

const tokenBody: OAuthToken = {
  access_token: 'AT',
  expires_in: 7200,
  expires_at: new Date(Date.now() + 7_200_000).toISOString(),
  token_type: 'bearer',
  refresh_token: 'RT',
  account_id: 'ACC',
  displayName: 'Tester',
  client_id: client.clientId,
  internal_client: true,
  client_service: 'prod-fn',
};

const deviceCodeBody: DeviceCode = {
  user_code: 'ABCD1234',
  device_code: 'the-device-code',
  verification_uri: 'https://www.epicgames.com/activate',
  verification_uri_complete: 'https://www.epicgames.com/activate?userCode=ABCD1234',
  prompt: 'login',
  expires_in: 600,
  interval: 10,
  client_id: client.clientId,
};

function pending(code = 'authorization_pending'): MockResponseInit {
  return {
    status: 400,
    body: { errorCode: `errors.com.epicgames.account.oauth.${code}`, errorMessage: 'pending' },
  };
}

function managerWith(...responses: MockResponseInit[]): { auth: AuthManager; mock: ReturnType<typeof createMockFetch> } {
  const mock = createMockFetch(...responses);
  const auth = new AuthManager(new EpicRestClient({ fetch: mock.fetch, retry: 1 }));
  return { auth, mock };
}

describe('AuthManager.pollDeviceCode', () => {
  it('polls through authorization_pending until a token is issued', async () => {
    const { auth, mock } = managerWith(pending(), pending(), { body: tokenBody });
    const seen: number[] = [];

    const token = await auth.pollDeviceCode(client, 'the-device-code', {
      intervalMs: 1,
      onPending: (info) => seen.push(info.attempt),
    });

    expect(token).toEqual(tokenBody);
    expect(mock.calls).toBe(3);
    expect(seen).toEqual([1, 2]);
    const form = new URLSearchParams(mock.lastRequest().body);
    expect(form.get('grant_type')).toBe('device_code');
    expect(form.get('device_code')).toBe('the-device-code');
  });

  it('increases the interval when the server asks it to slow down', async () => {
    const { auth, mock } = managerWith(pending('slow_down'), { body: tokenBody });
    const controller = new AbortController();
    let bumped = 0;

    await expect(
      auth.pollDeviceCode(client, 'dc', {
        intervalMs: 1,
        signal: controller.signal,
        onPending: (info) => {
          bumped = info.intervalMs;
          controller.abort();
        },
      }),
    ).rejects.toBeInstanceOf(AbortError);

    expect(bumped).toBeGreaterThan(5_000);
    expect(mock.calls).toBe(1);
  });

  it('fires onCanceled when the flow ends without authorization', async () => {
    const { auth, mock } = managerWith({
      status: 400,
      body: {
        errorCode: 'errors.com.epicgames.account.oauth.authorization_code_not_found',
        errorMessage: 'declined',
      },
    });
    let canceled: EpicAuthError | null = null;

    await expect(
      auth.pollDeviceCode(client, 'dc', { intervalMs: 1, onCanceled: (e) => (canceled = e) }),
    ).rejects.toBeInstanceOf(EpicAuthError);

    expect(canceled).toBeInstanceOf(EpicAuthError);
    expect(mock.calls).toBe(1);
  });

  it('fires onCanceled when the device code expires', async () => {
    const { auth } = managerWith({ body: tokenBody });
    let canceled = false;

    await auth
      .pollDeviceCode(client, 'dc', {
        intervalMs: 1,
        expiresAt: new Date(Date.now() - 1000),
        onCanceled: () => (canceled = true),
      })
      .catch(() => undefined);

    expect(canceled).toBe(true);
  });

  it('rethrows a terminal auth error immediately', async () => {
    const { auth, mock } = managerWith({
      status: 400,
      body: {
        errorCode: 'errors.com.epicgames.account.oauth.authorization_code_not_found',
        errorMessage: 'denied',
      },
    });

    await expect(auth.pollDeviceCode(client, 'dc', { intervalMs: 1 })).rejects.toBeInstanceOf(
      EpicAuthError,
    );
    expect(mock.calls).toBe(1);
  });

  it('stops with EpicAuthError once the device code has expired', async () => {
    const { auth, mock } = managerWith({ body: tokenBody });

    const error = await auth
      .pollDeviceCode(client, 'dc', { intervalMs: 1, expiresAt: new Date(Date.now() - 1000) })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(EpicAuthError);
    expect((error as EpicAuthError).errorCode).toContain('device_code_expired');
    expect(mock.calls).toBe(0);
  });

  it('gives up after maxAttempts and surfaces the pending error', async () => {
    const { auth, mock } = managerWith(pending());

    await expect(
      auth.pollDeviceCode(client, 'dc', { intervalMs: 1, maxAttempts: 3 }),
    ).rejects.toBeInstanceOf(EpicAuthError);
    expect(mock.calls).toBe(3);
  });

  it('aborts before the first request when the signal is already aborted', async () => {
    const { auth, mock } = managerWith({ body: tokenBody });
    const controller = new AbortController();
    controller.abort();

    await expect(
      auth.pollDeviceCode(client, 'dc', { intervalMs: 1, signal: controller.signal }),
    ).rejects.toBeInstanceOf(AbortError);
    expect(mock.calls).toBe(0);
  });

  it('aborts while waiting between polls', async () => {
    const { auth } = managerWith(pending(), pending(), pending(), { body: tokenBody });
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5);

    await expect(
      auth.pollDeviceCode(client, 'dc', { intervalMs: 50, signal: controller.signal }),
    ).rejects.toBeInstanceOf(AbortError);
  });
});

describe('DeviceCodeFlow', () => {
  function flowWith(...responses: MockResponseInit[]): { flow: DeviceCodeFlow; mock: ReturnType<typeof createMockFetch> } {
    const mock = createMockFetch(...responses);
    const epic = new EpicGamesClient({ fetch: mock.fetch, retry: 1 });
    const auth = epic.auth;
    const flow = new DeviceCodeFlow(auth, (token) => epic.session(token, client), client, deviceCodeBody);
    return { flow, mock };
  }

  it('exposes the verification details from the device code response', () => {
    const { flow } = flowWith({ body: tokenBody });

    expect(flow.userCode).toBe('ABCD1234');
    expect(flow.deviceCode).toBe('the-device-code');
    expect(flow.verificationUri).toBe('https://www.epicgames.com/activate');
    expect(flow.verificationUriComplete).toBe(
      'https://www.epicgames.com/activate?userCode=ABCD1234',
    );
    expect(flow.intervalSeconds).toBe(10);
    expect(flow.client).toBe(client);
    expect(flow.isExpired).toBe(false);
    expect(flow.expiresInMs).toBeGreaterThan(0);
  });

  it('poll() resolves to an authenticated session', async () => {
    const { flow } = flowWith(pending(), { body: tokenBody });

    const session = await flow.poll({ intervalMs: 1 });

    expect(session).toBeInstanceOf(EpicAuthSession);
    expect(session.accessToken).toBe('AT');
    expect(session.accountId).toBe('ACC');
    expect(session.client).toBe(client);
  });

  it('pollForToken() resolves to the raw token', async () => {
    const { flow } = flowWith({ body: tokenBody });

    const token = await flow.pollForToken({ intervalMs: 1 });

    expect(token).toEqual(tokenBody);
  });
});

describe('EpicGamesClient device code helpers', () => {
  it('startDeviceCode obtains a client token then creates a device code', async () => {
    const mock = createMockFetch({ body: tokenBody }, { body: deviceCodeBody });
    const epic = new EpicGamesClient({ fetch: mock.fetch, retry: 1 });

    const flow = await epic.startDeviceCode();

    expect(flow.userCode).toBe('ABCD1234');
    expect(flow.client.name).toBe('fortniteNewSwitchGameClient');
    expect(mock.requests[0]!.path).toBe('/account/api/oauth/token');
    expect(new URLSearchParams(mock.requests[0]!.body).get('grant_type')).toBe('client_credentials');
    expect(mock.requests[1]!.path).toBe('/account/api/oauth/deviceAuthorization');
    expect(mock.requests[1]!.headers.authorization).toBe(`Bearer ${tokenBody.access_token}`);
  });

  it('startDeviceCode accepts a custom capable client', async () => {
    const mock = createMockFetch({ body: tokenBody }, { body: deviceCodeBody });
    const epic = new EpicGamesClient({ fetch: mock.fetch, retry: 1 });

    const flow = await epic.startDeviceCode({ client: 'fortniteSwitch' });

    expect(flow.client.name).toBe('fortniteSwitchGameClient');
  });

  it('loginWithDeviceCode prompts, polls, and returns a session', async () => {
    const mock = createMockFetch({ body: tokenBody }, { body: deviceCodeBody });
    mock.queue(pending(), { body: tokenBody });
    const epic = new EpicGamesClient({ fetch: mock.fetch, retry: 1 });

    let prompted: DeviceCodeFlow | null = null;
    const session = await epic.loginWithDeviceCode({
      intervalMs: 1,
      onPrompt: (flow) => {
        prompted = flow;
      },
    });

    expect(prompted).toBeInstanceOf(DeviceCodeFlow);
    expect(session).toBeInstanceOf(EpicAuthSession);
    expect(session.accessToken).toBe('AT');
  });
});
