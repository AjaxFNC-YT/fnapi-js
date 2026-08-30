import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  AbortError,
  AuthClients,
  EpicAuthError,
  EpicGamesClient,
  EpicPermissionError,
  ValidationError,
} from '../../src/index.js';

interface EpicConfig {
  epic?: {
    client?: string;
    deviceAuth?: { accountId?: string; deviceId?: string; secret?: string };
  };
}

const here = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(resolve(here, '../../config.json'), 'utf8')) as EpicConfig;

const deviceAuth = config.epic?.deviceAuth;
const hasDeviceAuth =
  !!deviceAuth?.accountId && !!deviceAuth?.deviceId && !!deviceAuth?.secret;

const epic = new EpicGamesClient({ retry: 2 });

describe('live epic client credentials', () => {
  it('logs in, verifies, and kills the session', async () => {
    const session = await epic.loginClientCredentials();

    expect(session.accessToken.length).toBeGreaterThan(0);
    expect(session.token.token_type).toBe('bearer');
    expect(session.token.client_service).toBe('prod-fn');
    expect(session.accountId).toBeNull();

    const verified = await session.verify();
    expect(verified.client_id).toBe(AuthClients.fortniteAndroid.clientId);

    await session.logout();
  });

  it('rejects a custom client with a bad secret', async () => {
    await expect(
      epic.loginClientCredentials({
        client: { name: 'bad', clientId: AuthClients.fortnitePC.clientId, clientSecret: 'wrong' },
      }),
    ).rejects.toBeInstanceOf(EpicAuthError);
  });
});

describe('live epic device code flow', () => {
  it('creates and deletes a device code', async () => {
    const session = await epic.loginClientCredentials({ client: 'fortniteNewSwitch' });

    const deviceCode = await epic.auth.createDeviceCode(session.accessToken);
    expect(deviceCode.user_code).toMatch(/^[A-Z0-9]+$/);
    expect(deviceCode.verification_uri).toContain('epicgames.com');
    expect(deviceCode.expires_in).toBeGreaterThan(0);
    expect(deviceCode.client_id).toBe(AuthClients.fortniteNewSwitch.clientId);

    await epic.auth.deleteDeviceCode(session.accessToken, deviceCode.user_code);
    await session.logout();
  });

  it('starts a flow, polls through authorization_pending, and aborts cleanly', async () => {
    const flow = await epic.startDeviceCode();

    expect(flow.userCode).toMatch(/^[A-Z0-9]+$/);
    expect(flow.verificationUriComplete).toContain(flow.userCode);
    expect(flow.client.name).toBe(AuthClients.fortniteNewSwitch.name);
    expect(flow.isExpired).toBe(false);

    const controller = new AbortController();
    setTimeout(() => controller.abort(), 2_500);

    let pendingPolls = 0;
    const result = await flow
      .poll({ signal: controller.signal, intervalMs: 800, onPending: () => (pendingPolls += 1) })
      .then(() => 'authorized')
      .catch((error: unknown) => (error instanceof AbortError ? 'aborted' : error));

    expect(result).toBe('aborted');
    expect(pendingPolls).toBeGreaterThan(0);

    const cleanup = await epic.loginClientCredentials({ client: 'fortniteNewSwitch' });
    await epic.auth.deleteDeviceCode(cleanup.accessToken, flow.userCode);
    await cleanup.logout();
  });
});

describe('live epic device auth login', () => {
  it('requires real device auth credentials', () => {
    if (hasDeviceAuth) return;
    expect(hasDeviceAuth).toBe(false);
  });

  it.runIf(hasDeviceAuth)('logs in and lists device auths through a READ-capable client', async () => {
    const session = await epic.loginWithDeviceAuth(
      {
        accountId: deviceAuth!.accountId!,
        deviceId: deviceAuth!.deviceId!,
        secret: deviceAuth!.secret!,
      },
      { client: config.epic?.client ?? 'fortniteAndroid' },
    );

    expect(session.accountId).toBe(deviceAuth!.accountId);

    const me = await session.me();
    expect(me.id).toBe(deviceAuth!.accountId);

    await expect(session.listDeviceAuths()).rejects.toBeInstanceOf(EpicPermissionError);

    const pc = await session.switchClient('fortnitePC');
    const auths = await pc.listDeviceAuths();
    expect(Array.isArray(auths)).toBe(true);
    expect(auths.length).toBeGreaterThan(0);

    await pc.logout();
    await session.logout();
  });

  it.runIf(hasDeviceAuth)('resolves its own identity through the EOS/EAS id service', async () => {
    const session = await epic.loginWithDeviceAuth(
      {
        accountId: deviceAuth!.accountId!,
        deviceId: deviceAuth!.deviceId!,
        secret: deviceAuth!.secret!,
      },
      { client: config.epic?.client ?? 'fortniteAndroid' },
    );

    const accounts = await session.eosAccounts([deviceAuth!.accountId!]);
    expect(accounts.length).toBe(1);
    expect(accounts[0]?.accountId).toBe(deviceAuth!.accountId);
    expect(typeof accounts[0]?.displayName).toBe('string');

    await session.logout();
  });
});

describe('live epic playtime accrual', () => {
  it.runIf(hasDeviceAuth)(
    'reads playtime and accrues only real elapsed time, never inflating',
    async () => {
      const session = await epic.loginWithDeviceAuth(
        {
          accountId: deviceAuth!.accountId!,
          deviceId: deviceAuth!.deviceId!,
          secret: deviceAuth!.secret!,
        },
        { client: config.epic?.client ?? 'fortniteAndroid' },
      );

      const before = await session.playtime();
      expect(before.accountId).toBe(deviceAuth!.accountId);
      expect(before.artifactId).toBe('Fortnite');
      expect(typeof before.totalTime).toBe('number');
      expect(before.totalTime).toBeGreaterThanOrEqual(0);

      await session.addPlaytimeSeconds(60);
      const mid = await session.playtime();
      expect(mid.totalTime).toBeGreaterThanOrEqual(before.totalTime);

      await session.addPlaytimeSeconds(3600);
      const after = await session.playtime();

      const immediateDelta = after.totalTime - mid.totalTime;
      expect(immediateDelta).toBeGreaterThanOrEqual(0);
      expect(immediateDelta).toBeLessThan(30);
      expect(after.totalTime).toBeGreaterThanOrEqual(before.totalTime);

      await session.logout();
    },
    60_000,
  );
});

describe('live epic validation', () => {
  it('rejects an unknown client name without a request', async () => {
    await expect(epic.loginClientCredentials({ client: 'not-a-real-client' })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});
