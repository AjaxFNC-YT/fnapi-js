import { describe, expect, it } from 'vitest';
import {
  ConnectClient,
  CONNECT_SEC_PROTOCOLS,
  CONNECT_WEBSOCKET_URL,
  decodeEosProps,
  loadConnectWebSocket,
  normalizeConnectPresence,
  type ConnectClientOptions,
  type ConnectFriendMessage,
  type ConnectPartyMessage,
  type ConnectPresenceUpdate,
} from '../../src/epic/connect.js';
import { ValidationError } from '../../src/core/errors.js';
import { createMockConnectWebSocket, type MockWebSocket } from '../helpers/mockWebSocket.js';

const NUL = String.fromCharCode(0);
const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

function connectedFrame(heartBeat = '0,30000'): string {
  return `CONNECTED\nheart-beat:${heartBeat}\nversion:1.2\n\n${NUL}`;
}

function messageFrame(body: unknown): string {
  return `MESSAGE\nsubscription:0\ndestination:launcher\ncontent-type:application/json\n\n${JSON.stringify(body)}${NUL}`;
}

function errorFrame(body: unknown, headers: Record<string, string> = {}): string {
  const lines = Object.entries(headers).map(([key, value]) => `${key}:${value}`);
  const head = lines.length > 0 ? `ERROR\n${lines.join('\n')}` : 'ERROR';
  return `${head}\n\n${JSON.stringify(body)}${NUL}`;
}

function encodeMsg(msg: string): string {
  return Buffer.from(JSON.stringify({ msg })).toString('base64');
}

async function connectClient(
  overrides: Partial<ConnectClientOptions> = {},
): Promise<{ client: ConnectClient; socket: MockWebSocket; sockets: MockWebSocket[] }> {
  const { factory, sockets } = createMockConnectWebSocket();
  const client = new ConnectClient({
    accountId: 'me',
    getAccessToken: () => 'access-token',
    webSocket: factory,
    autoReconnect: false,
    ...overrides,
  });
  const promise = client.connect();
  await tick();
  const socket = sockets[0]!;
  socket.open();
  await tick();
  socket.serverSend(connectedFrame());
  await tick();
  socket.serverSend(messageFrame({ type: 'core.connect.v1.connected', connectionId: 'conn-1' }));
  await promise;
  return { client, socket, sockets };
}

describe('ConnectClient', () => {
  it('rejects an empty accountId', () => {
    expect(
      () => new ConnectClient({ accountId: '  ', getAccessToken: () => 'token' }),
    ).toThrow(ValidationError);
  });

  it('rejects a non-function getAccessToken', () => {
    expect(
      () => new ConnectClient({ accountId: 'me', getAccessToken: undefined as never }),
    ).toThrow(ValidationError);
  });

  it('constructs without a webSocket factory and resolves the ws package lazily', async () => {
    expect(() => new ConnectClient({ accountId: 'me', getAccessToken: () => 'token' })).not.toThrow();
    const factory = await loadConnectWebSocket();
    expect(typeof factory).toBe('function');
  });

  it('opens the socket with the STOMP subprotocol header and Authorization header', async () => {
    const { client, socket } = await connectClient();
    expect(socket.url).toBe(CONNECT_WEBSOCKET_URL);
    expect(socket.protocols).toBeUndefined();
    expect(socket.headers['Sec-WebSocket-Protocol']).toBe(CONNECT_SEC_PROTOCOLS);
    expect(socket.headers['Authorization']).toBe('Bearer access-token');
    expect(socket.headers['Epic-Connect-Protocol']).toBe('stomp');
    await client.disconnect();
  });

  it('sends a CONNECT frame on open and a SUBSCRIBE frame after CONNECTED', async () => {
    const { client, socket } = await connectClient();
    expect(socket.sent[0]?.startsWith('CONNECT\n')).toBe(true);
    expect(socket.sent.some((frame) => frame.startsWith('SUBSCRIBE\n'))).toBe(true);
    await client.disconnect();
  });

  it('resolves connect() and exposes the connectionId', async () => {
    const { client } = await connectClient();
    expect(client.connected).toBe(true);
    expect(client.connection).toBe('conn-1');
    await client.disconnect();
  });

  it('emits a connected event with the connectionId', async () => {
    const { factory, sockets } = createMockConnectWebSocket();
    const client = new ConnectClient({
      accountId: 'me',
      getAccessToken: () => 'access-token',
      webSocket: factory,
      autoReconnect: false,
    });
    const seen: string[] = [];
    client.on('connected', (payload) => seen.push(payload.connectionId));
    const promise = client.connect();
    await tick();
    const socket = sockets[0]!;
    socket.open();
    await tick();
    socket.serverSend(connectedFrame());
    await tick();
    socket.serverSend(messageFrame({ type: 'core.connect.v1.connected', connectionId: 'conn-9' }));
    await promise;
    expect(seen).toEqual(['conn-9']);
    await client.disconnect();
  });

  it('routes a dm NEW_MESSAGE to friend:message', async () => {
    const { client, socket } = await connectClient();
    const received: ConnectFriendMessage[] = [];
    client.on('friend:message', (payload) => received.push(payload));
    socket.serverSend(
      messageFrame({
        type: 'social.chat.v1.NEW_MESSAGE',
        payload: {
          conversation: { type: 'dm', conversationId: 'convo-1' },
          message: { senderId: 'friend-1', body: encodeMsg('hey there') },
        },
      }),
    );
    expect(received).toHaveLength(1);
    expect(received[0]?.accountId).toBe('friend-1');
    expect(received[0]?.body).toBe('hey there');
    expect(received[0]?.conversationId).toBe('convo-1');
    await client.disconnect();
  });

  it('routes a party NEW_MESSAGE to party:message and strips the p- prefix', async () => {
    const { client, socket } = await connectClient();
    const received: ConnectPartyMessage[] = [];
    client.on('party:message', (payload) => received.push(payload));
    socket.serverSend(
      messageFrame({
        type: 'social.chat.v1.NEW_MESSAGE',
        payload: {
          conversation: { type: 'party', conversationId: 'p-party-9' },
          message: { senderId: 'other', body: encodeMsg('gg') },
        },
      }),
    );
    expect(received).toHaveLength(1);
    expect(received[0]?.partyId).toBe('party-9');
    expect(received[0]?.conversationId).toBe('p-party-9');
    expect(received[0]?.body).toBe('gg');
    await client.disconnect();
  });

  it('skips party messages sent by the connected account', async () => {
    const { client, socket } = await connectClient();
    const received: ConnectPartyMessage[] = [];
    client.on('party:message', (payload) => received.push(payload));
    socket.serverSend(
      messageFrame({
        type: 'social.chat.v1.NEW_MESSAGE',
        payload: {
          conversation: { type: 'party', conversationId: 'p-party-9' },
          message: { senderId: 'me', body: encodeMsg('echo') },
        },
      }),
    );
    expect(received).toHaveLength(0);
    await client.disconnect();
  });

  it('emits presence on a presence.v1.UPDATE frame', async () => {
    const { client, socket } = await connectClient();
    const received: ConnectPresenceUpdate[] = [];
    client.on('presence', (payload) => received.push(payload));
    socket.serverSend(
      messageFrame({
        type: 'presence.v1.UPDATE',
        payload: { accountId: 'friend-2', status: 'online' },
      }),
    );
    expect(received).toHaveLength(1);
    expect(received[0]?.accountId).toBe('friend-2');
    expect(received[0]?.payload['status']).toBe('online');
    await client.disconnect();
  });

  it('caches and normalizes presence.v1.UPDATE into a FriendPresence', async () => {
    const { client, socket } = await connectClient();
    socket.serverSend(
      messageFrame({
        type: 'presence.v1.UPDATE',
        payload: {
          accountId: 'friend-3',
          status: 'away',
          perNs: [
            {
              status: 'away',
              activity: { value: 'Battle Royale Lobby' },
              props: { bIsPlaying: 'true', bIsJoinable: 'true', EOS_Platform: 'WIN' },
            },
          ],
        },
      }),
    );
    const presence = client.getPresence('friend-3');
    expect(presence?.available).toBe(true);
    expect(presence?.show).toBe('away');
    expect(presence?.playing).toBe(true);
    expect(presence?.joinable).toBe(true);
    expect(presence?.statusText).toBe('Battle Royale Lobby');
    expect(presence?.platform).toBe('WIN');
    expect([...client.presences.keys()]).toEqual(['friend-3']);
    await client.disconnect();
  });

  it('drops a cached presence when a friend goes offline', async () => {
    const { client, socket } = await connectClient();
    socket.serverSend(
      messageFrame({ type: 'presence.v1.UPDATE', payload: { accountId: 'friend-4', status: 'online' } }),
    );
    expect(client.getPresence('friend-4')).not.toBeNull();
    socket.serverSend(
      messageFrame({ type: 'presence.v1.UPDATE', payload: { accountId: 'friend-4', status: 'offline' } }),
    );
    expect(client.getPresence('friend-4')).toBeNull();
    await client.disconnect();
  });

  it('emits an error for a non-4019 ERROR frame', async () => {
    const { client, socket } = await connectClient();
    const errors: Error[] = [];
    client.on('error', (error) => errors.push(error));
    socket.serverSend(errorFrame({ statusCode: 4001 }, { message: 'boom' }));
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toContain('boom');
    await client.disconnect();
  });

  it('restarts the session on an ERROR 4019 frame', async () => {
    const { client, socket, sockets } = await connectClient({ autoReconnect: true });
    socket.serverSend(errorFrame({ statusCode: 4019 }));
    await tick();
    expect(sockets.length).toBe(2);
    const next = sockets[1]!;
    next.open();
    await tick();
    next.serverSend(connectedFrame());
    await tick();
    next.serverSend(messageFrame({ type: 'core.connect.v1.connected', connectionId: 'conn-2' }));
    await tick();
    expect(client.connection).toBe('conn-2');
    await client.disconnect();
  });

  it('sends heartbeat frames on the negotiated interval', async () => {
    const { factory, sockets } = createMockConnectWebSocket();
    const client = new ConnectClient({
      accountId: 'me',
      getAccessToken: () => 'access-token',
      webSocket: factory,
      autoReconnect: false,
    });
    const promise = client.connect();
    await tick();
    const socket = sockets[0]!;
    socket.open();
    await tick();
    socket.serverSend(connectedFrame('0,20'));
    await tick();
    socket.serverSend(messageFrame({ type: 'core.connect.v1.connected', connectionId: 'conn-1' }));
    await promise;
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(socket.sent.some((frame) => frame === '\n')).toBe(true);
    await client.disconnect();
  });

  it('reconnects with backoff after an unexpected close and re-runs onConnected', async () => {
    const announced: string[] = [];
    const { client, socket, sockets } = await connectClient({
      autoReconnect: true,
      reconnectInitialDelayMs: 5,
      onConnected: (connectionId) => {
        announced.push(connectionId);
      },
    });
    const attempts: number[] = [];
    client.on('reconnecting', (payload) => attempts.push(payload.attempt));
    socket.serverClose(1006, '');
    expect(attempts).toEqual([1]);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(sockets.length).toBe(2);
    const next = sockets[1]!;
    next.open();
    await tick();
    next.serverSend(connectedFrame());
    await tick();
    next.serverSend(messageFrame({ type: 'core.connect.v1.connected', connectionId: 'conn-2' }));
    await tick();
    expect(client.connected).toBe(true);
    expect(client.connection).toBe('conn-2');
    expect(announced).toEqual(['conn-1', 'conn-2']);
    await client.disconnect();
  });

  it('keeps retrying when a reconnect attempt fails', async () => {
    const { client, socket, sockets } = await connectClient({
      autoReconnect: true,
      reconnectInitialDelayMs: 5,
    });
    const attempts: number[] = [];
    client.on('reconnecting', (payload) => attempts.push(payload.attempt));
    client.on('error', () => undefined);
    socket.serverClose(1006, '');
    await new Promise((resolve) => setTimeout(resolve, 20));
    sockets[1]!.serverClose(1006, '');
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(attempts).toEqual([1, 2]);
    expect(sockets.length).toBe(3);
    await client.disconnect();
  });

  it('does not reconnect after a manual disconnect', async () => {
    const { client, sockets } = await connectClient({ autoReconnect: true, reconnectInitialDelayMs: 5 });
    const attempts: number[] = [];
    client.on('reconnecting', (payload) => attempts.push(payload.attempt));
    await client.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(attempts).toEqual([]);
    expect(sockets.length).toBe(1);
  });

  it('ignores frames and closes from a replaced socket', async () => {
    const { client, socket, sockets } = await connectClient({ autoReconnect: true });
    socket.serverSend(errorFrame({ statusCode: 4019 }));
    await tick();
    const closes: number[] = [];
    client.on('disconnected', (payload) => closes.push(payload.code));
    socket.serverSend(messageFrame({ type: 'core.connect.v1.connected', connectionId: 'stale' }));
    expect(client.connection).toBeNull();
    const next = sockets[1]!;
    next.open();
    await tick();
    next.serverSend(connectedFrame());
    await tick();
    next.serverSend(messageFrame({ type: 'core.connect.v1.connected', connectionId: 'conn-2' }));
    await tick();
    expect(client.connection).toBe('conn-2');
    expect(closes).toEqual([]);
    await client.disconnect();
  });

  it('shares a single in-flight connect between concurrent callers', async () => {
    const { factory, sockets } = createMockConnectWebSocket();
    const client = new ConnectClient({
      accountId: 'me',
      getAccessToken: async () => 'access-token',
      webSocket: factory,
      autoReconnect: false,
    });
    const first = client.connect();
    const second = client.connect();
    await tick();
    expect(sockets.length).toBe(1);
    const socket = sockets[0]!;
    socket.open();
    await tick();
    socket.serverSend(connectedFrame());
    await tick();
    socket.serverSend(messageFrame({ type: 'core.connect.v1.connected', connectionId: 'conn-1' }));
    await Promise.all([first, second]);
    await client.disconnect();
  });

  it('ignores an open event that arrives after the connect timed out', async () => {
    const { factory, sockets } = createMockConnectWebSocket();
    const client = new ConnectClient({
      accountId: 'me',
      getAccessToken: () => 'access-token',
      webSocket: factory,
      autoReconnect: false,
      connectionTimeoutMs: 10,
    });
    const errors: Error[] = [];
    client.on('error', (error) => errors.push(error));
    await expect(client.connect()).rejects.toThrow('Timed out');
    expect(() => sockets[0]!.open()).not.toThrow();
    expect(sockets[0]!.sent).toEqual([]);
    expect(errors).toEqual([]);
  });

  it('turns a throwing send during the handshake into a rejected connect', async () => {
    const { factory, sockets } = createMockConnectWebSocket();
    const client = new ConnectClient({
      accountId: 'me',
      getAccessToken: () => 'access-token',
      webSocket: factory,
      autoReconnect: false,
    });
    const promise = client.connect();
    await tick();
    const socket = sockets[0]!;
    socket.send = () => {
      throw new Error('WebSocket is not open: readyState 2 (CLOSING)');
    };
    expect(() => socket.open()).not.toThrow();
    await expect(promise).rejects.toThrow('readyState 2');
    expect(client.state).toBe('closed');
  });

  it('reconnect() opens a fresh session immediately', async () => {
    const { client, socket, sockets } = await connectClient({ autoReconnect: true });
    const reconnecting = client.reconnect();
    await tick();
    expect(sockets.length).toBe(2);
    socket.serverClose(1006, '');
    const next = sockets[1]!;
    next.open();
    await tick();
    next.serverSend(connectedFrame());
    await tick();
    next.serverSend(messageFrame({ type: 'core.connect.v1.connected', connectionId: 'conn-2' }));
    await reconnecting;
    expect(client.connection).toBe('conn-2');
    await client.disconnect();
  });

  it('emits disconnected on close', async () => {
    const { client, socket } = await connectClient();
    const closes: Array<{ code: number; reason: string }> = [];
    client.on('disconnected', (payload) => closes.push(payload));
    socket.serverClose(1000, 'bye');
    expect(closes).toHaveLength(1);
    expect(closes[0]?.code).toBe(1000);
    expect(client.state).toBe('closed');
  });
});

describe('normalizeConnectPresence', () => {
  it('returns null without an accountId', () => {
    expect(normalizeConnectPresence({ status: 'online' })).toBeNull();
  });

  it('reads the FortniteStatus from a REST bulk row', () => {
    const presence = normalizeConnectPresence({
      accountId: 'friend-1',
      status: '{"Status":"In a match","bIsPlaying":true,"bIsJoinable":false}',
    });
    expect(presence?.available).toBe(true);
    expect(presence?.playing).toBe(true);
    expect(presence?.joinable).toBe(false);
    expect(presence?.status?.Status).toBe('In a match');
    expect(presence?.jid).toBe('friend-1');
  });

  it('maps an away top-level status to a show value', () => {
    const presence = normalizeConnectPresence({ accountId: 'friend-2', status: 'away' });
    expect(presence?.available).toBe(true);
    expect(presence?.show).toBe('away');
  });

  it('marks an offline status as unavailable', () => {
    const presence = normalizeConnectPresence({ accountId: 'friend-3', status: 'offline' });
    expect(presence?.available).toBe(false);
  });
});

describe('decodeEosProps', () => {
  it('decodes typed prefixes and leaves EOS_ keys raw', () => {
    const decoded = decodeEosProps({
      count: 'i2',
      enabled: 'bfalse',
      label: 'shello',
      payload: 'm{"a":1}',
      EOS_Platform: 'WIN',
    });
    expect(decoded['count']).toBe(2);
    expect(decoded['enabled']).toBe(false);
    expect(decoded['label']).toBe('hello');
    expect(decoded['payload']).toEqual({ a: 1 });
    expect(decoded['EOS_Platform']).toBe('WIN');
  });
});
