import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { EpicGamesClient, type EpicAuthSession, type FetchLike } from '../../src/index.js';

interface EpicConfig {
  epic?: { deviceAuth?: { accountId?: string; deviceId?: string; secret?: string } };
}

interface PresencePatch {
  status: string;
  activity: string | null;
}

const here = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(resolve(here, '../../config.json'), 'utf8')) as EpicConfig;
const deviceAuth = config.epic?.deviceAuth;
const hasDeviceAuth = !!deviceAuth?.accountId && !!deviceAuth?.deviceId && !!deviceAuth?.secret;

const patches: PresencePatch[] = [];

const recordingFetch: FetchLike = async (input, init) => {
  if (init?.method === 'PATCH' && input.includes('/epic/presence/v1/') && typeof init.body === 'string') {
    const body = JSON.parse(init.body) as { status: string; activity?: { value?: string } };
    patches.push({ status: body.status, activity: body.activity?.value ?? null });
  }
  return fetch(input, init);
};

function waitFor<T>(register: (done: (value: T) => void) => void, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolvePromise, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out waiting for ${label}`)), timeoutMs);
    register((value) => {
      clearTimeout(timer);
      resolvePromise(value);
    });
  });
}

function dropSocket(client: unknown): void {
  const socket = (client as { socket: { terminate?: () => void; close: () => void } | null }).socket;
  if (!socket) throw new Error('no live socket to drop');
  if (typeof socket.terminate === 'function') socket.terminate();
  else socket.close();
}

describe.skipIf(!hasDeviceAuth)('live epic custom status (bot-style, no websocket factory)', () => {
  const epic = new EpicGamesClient({ retry: 2, fetch: recordingFetch });
  const stamp = `fnapi e2e ${Date.now().toString(36)}`;
  let session: EpicAuthSession;

  beforeAll(async () => {
    session = await epic.loginWithDeviceAuth({
      accountId: deviceAuth!.accountId!,
      deviceId: deviceAuth!.deviceId!,
      secret: deviceAuth!.secret!,
    });
  });

  afterAll(async () => {
    await session?.clearCustomStatus().catch(() => undefined);
    await session?.logout().catch(() => undefined);
  });

  it('sets a custom status without passing a websocket and epic stores the text', async () => {
    const presence = await session.setCustomStatus(stamp);
    expect(presence?.accountId).toBe(session.accountId);
    expect(presence?.status).toBe('online');
    expect(presence?.perNs[0]?.activity?.value).toBe(stamp);
    expect(session.customStatus).toBe(stamp);
    expect(session.events?.connected).toBe(true);
  });

  it('applies the away online type', async () => {
    const presence = await session.setCustomStatus(`${stamp} away`, { onlineType: 'away' });
    expect(presence?.status).toBe('away');
    expect(presence?.perNs[0]?.activity?.value).toBe(`${stamp} away`);
    await session.setCustomStatus(stamp);
  });

  it('reconnects the connect stream after a drop and re-applies the status', async () => {
    const events = session.events!;
    const before = events.connection;
    patches.length = 0;

    const reconnecting = waitFor<{ attempt: number }>((done) => events.once('reconnecting', done), 10_000, 'reconnecting');
    const connected = waitFor<{ connectionId: string }>((done) => events.once('connected', done), 45_000, 'reconnect');
    dropSocket(events);

    expect((await reconnecting).attempt).toBe(1);
    const { connectionId } = await connected;
    expect(connectionId).not.toBe(before);
    expect(events.connected).toBe(true);

    await waitFor<void>((done) => {
      const check = setInterval(() => {
        if (patches.some((patch) => patch.activity === stamp)) {
          clearInterval(check);
          done();
        }
      }, 100);
    }, 15_000, 'presence re-announce');
  });

  it('keeps the status after the reconnect', async () => {
    const presence = await session.setCustomStatus(stamp);
    expect(presence?.perNs[0]?.activity?.value).toBe(stamp);
    expect(presence?.perNs[0]?.conns.some((conn) => conn.id === session.events?.connection)).toBe(true);
  });

  it('receives friend presence over the connect stream', async () => {
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 4_000));
    const presences = await session.friendPresences();
    expect(Array.isArray(presences)).toBe(true);
    for (const presence of presences) {
      expect(typeof presence.accountId).toBe('string');
      expect(presence.available).toBe(true);
    }
  });

  it('clears the custom status', async () => {
    const presence = await session.clearCustomStatus();
    expect(presence?.perNs[0]?.activity?.value ?? '').toBe('');
    expect(session.customStatus).toBeNull();
  });
});

describe.skipIf(!hasDeviceAuth)('live epic LiveClient lifecycle', () => {
  const epic = new EpicGamesClient({ retry: 2 });
  let session: EpicAuthSession;

  beforeAll(async () => {
    session = await epic.loginWithDeviceAuth({
      accountId: deviceAuth!.accountId!,
      deviceId: deviceAuth!.deviceId!,
      secret: deviceAuth!.secret!,
    });
  });

  afterAll(async () => {
    await session?.logout().catch(() => undefined);
  });

  it('starts xmpp and the connect stream and seeds friends', async () => {
    const bot = await session.live();
    expect(bot.running).toBe(true);
    expect(session.xmpp?.connected).toBe(true);
    expect(session.events?.connected).toBe(true);
    const friends = await session.friendsList();
    expect(bot.friends.size).toBe(friends.length);
  });

  it('resyncs and emits reconnected after an xmpp drop', async () => {
    const bot = session.liveClient!;
    const reconnecting = waitFor<{ attempt: number }>((done) => bot.once('reconnecting', done), 10_000, 'reconnecting');
    const reconnected = waitFor<void>((done) => bot.once('reconnected', done), 60_000, 'reconnected');
    (session.xmpp as unknown as { dropSocket(code: number, reason: string): void }).dropSocket(1006, 'simulated network drop');
    expect((await reconnecting).attempt).toBe(1);
    await reconnected;
    expect(session.xmpp?.connected).toBe(true);
  });

  it('sets a status while the live bot runs', async () => {
    const text = `fnapi live ${Date.now().toString(36)}`;
    const presence = await session.setCustomStatus(text);
    expect(presence?.perNs[0]?.activity?.value).toBe(text);
    await session.clearCustomStatus();
  });

  it('tears down cleanly and can start a fresh live client', async () => {
    await session.disconnectLive();
    expect(session.liveClient).toBeNull();
    expect(session.xmpp).toBeNull();
    expect(session.events).toBeNull();

    const bot = await session.live();
    expect(bot.running).toBe(true);
    expect(session.events?.connected).toBe(true);
    await session.disconnectLive();
  });
});
