import { describe, expect, it } from 'vitest';
import {
  ConnectClient,
  CONNECT_SEC_PROTOCOLS,
  CONNECT_WEBSOCKET_URL,
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
