import { describe, expect, it, vi } from 'vitest';
import { XmppClient, type FriendPresence, type XmppMessage } from '../../src/epic/xmpp.js';
import { parseStanza, findChild } from '../../src/epic/xml.js';
import { createMockWebSocket, type MockWebSocket } from '../helpers/mockWebSocket.js';
import { ConfigurationError, ValidationError } from '../../src/core/errors.js';

const ACCOUNT = '2a0d781a597c4c3b894f211e32544dd4';
const TOKEN = 'access-token-value';
const HOST = 'prod.ol.epicgames.com';
const NUL = String.fromCharCode(0);

const FEATURES_SASL =
  '<stream:features xmlns:stream="http://etherx.jabber.org/streams"><mechanisms xmlns="urn:ietf:params:xml:ns:xmpp-sasl"><mechanism>PLAIN</mechanism></mechanisms></stream:features>';
const FEATURES_BIND =
  '<stream:features xmlns:stream="http://etherx.jabber.org/streams"><bind xmlns="urn:ietf:params:xml:ns:xmpp-bind"/></stream:features>';

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function makeClient(overrides: Record<string, unknown> = {}): {
  client: XmppClient;
  sockets: MockWebSocket[];
} {
  const { factory, sockets } = createMockWebSocket();
  const client = new XmppClient({
    accountId: ACCOUNT,
    getAccessToken: () => TOKEN,
    webSocket: factory,
    pingIntervalMs: 10_000,
    autoReconnect: false,
    ...overrides,
  });
  return { client, sockets };
}

function sentStanzas(socket: MockWebSocket): string[] {
  return socket.sent;
}

async function connect(
  client: XmppClient,
  sockets: MockWebSocket[],
  options: { session?: boolean } = {},
): Promise<MockWebSocket> {
  const promise = client.connect();
  await flush();
  const socket = sockets[0]!;
  socket.open();
  socket.serverSend(`<open xmlns="urn:ietf:params:xml:ns:xmpp-framing" from="${HOST}" version="1.0"/>`);
  socket.serverSend(FEATURES_SASL);
  socket.serverSend('<success xmlns="urn:ietf:params:xml:ns:xmpp-sasl"/>');
  socket.serverSend(`<open xmlns="urn:ietf:params:xml:ns:xmpp-framing" from="${HOST}" version="1.0"/>`);
  const bindFeatures = options.session
    ? FEATURES_BIND.replace(
        '</stream:features>',
        '<session xmlns="urn:ietf:params:xml:ns:xmpp-session"/></stream:features>',
      )
    : FEATURES_BIND;
  socket.serverSend(bindFeatures);
  socket.serverSend(
    `<iq type="result" id="bind_1"><bind xmlns="urn:ietf:params:xml:ns:xmpp-bind"><jid>${ACCOUNT}@${HOST}/V2:Fortnite:WIN::ABC</jid></bind></iq>`,
  );
  if (options.session) {
    socket.serverSend('<iq type="result" id="session_1"/>');
  }
  await promise;
  return socket;
}

describe('XmppClient construction', () => {
  it('rejects an empty accountId', () => {
    expect(() => new XmppClient({ accountId: '', getAccessToken: () => TOKEN })).toThrow(ValidationError);
  });

  it('rejects a missing getAccessToken', () => {
    expect(
      () => new XmppClient({ accountId: ACCOUNT, getAccessToken: undefined as never }),
    ).toThrow(ValidationError);
  });

  it('throws a ConfigurationError when no WebSocket is available', () => {
    const original = (globalThis as { WebSocket?: unknown }).WebSocket;
    (globalThis as { WebSocket?: unknown }).WebSocket = undefined;
    try {
      expect(() => new XmppClient({ accountId: ACCOUNT, getAccessToken: () => TOKEN })).toThrow(
        ConfigurationError,
      );
    } finally {
      (globalThis as { WebSocket?: unknown }).WebSocket = original;
    }
  });

  it('derives a V2 Fortnite resource by default', () => {
    const { client } = makeClient();
    expect(client.resource).toMatch(/^V2:Fortnite:WIN::[0-9A-F]{32}$/);
  });
});

describe('XmppClient handshake', () => {
  it('drives the full RFC 7395 handshake and binds a jid', async () => {
    const { client, sockets } = makeClient();
    const socket = await connect(client, sockets);

    expect(client.connected).toBe(true);
    expect(client.state).toBe('connected');
    expect(client.jid).toBe(`${ACCOUNT}@${HOST}/V2:Fortnite:WIN::ABC`);

    const stanzas = sentStanzas(socket);
    expect(stanzas[0]).toContain('<open');
    expect(stanzas[0]).toContain(`to="${HOST}"`);
    expect(stanzas[0]).toContain('urn:ietf:params:xml:ns:xmpp-framing');

    const auth = stanzas.find((s) => s.includes('<auth'))!;
    expect(auth).toContain('mechanism="PLAIN"');

    const bind = stanzas.find((s) => s.includes('id="bind_1"'))!;
    expect(bind).toContain(`<resource>${client.resource}</resource>`);
  });

  it('encodes SASL PLAIN as base64 of NUL accountId NUL token', async () => {
    const { client, sockets } = makeClient();
    const socket = await connect(client, sockets);
    const auth = sentStanzas(socket).find((s) => s.includes('<auth'))!;
    const node = parseStanza(auth)!;
    const decoded = Buffer.from(node.text, 'base64').toString('binary');
    expect(decoded).toBe(`${NUL}${ACCOUNT}${NUL}${TOKEN}`);
  });

  it('sends a session iq when the server advertises a session feature', async () => {
    const { client, sockets } = makeClient();
    const socket = await connect(client, sockets, { session: true });
    expect(sentStanzas(socket).some((s) => s.includes('id="session_1"'))).toBe(true);
    expect(client.connected).toBe(true);
  });

  it('sends an initial presence when connected', async () => {
    const { client, sockets } = makeClient();
    const socket = await connect(client, sockets);
    const presence = sentStanzas(socket).find(
      (s) => s.startsWith('<presence') && s.includes('<status>'),
    )!;
    expect(presence).toBeDefined();
    const status = findChild(parseStanza(presence)!, 'status')!;
    const parsed = JSON.parse(status.text);
    expect(parsed).toEqual({ Status: '' });
  });

  it('emits a connected event', async () => {
    const { client, sockets } = makeClient();
    const spy = vi.fn();
    client.on('connected', spy);
    await connect(client, sockets);
    expect(spy).toHaveBeenCalledOnce();
  });

  it('rejects connect when the server sends a SASL failure', async () => {
    const { client, sockets } = makeClient();
    const promise = client.connect();
    await flush();
    const socket = sockets[0]!;
    socket.open();
    socket.serverSend(`<open xmlns="urn:ietf:params:xml:ns:xmpp-framing" from="${HOST}"/>`);
    socket.serverSend(FEATURES_SASL);
    socket.serverSend('<failure xmlns="urn:ietf:params:xml:ns:xmpp-sasl"><not-authorized/></failure>');
    await expect(promise).rejects.toBeInstanceOf(ConfigurationError);
    expect(client.connected).toBe(false);
  });
});

describe('XmppClient presence handling', () => {
  it('parses friend presence and caches it', async () => {
    const { client, sockets } = makeClient();
    const socket = await connect(client, sockets);
    const received: FriendPresence[] = [];
    client.on('presence', (presence) => received.push(presence));

    socket.serverSend(
      `<presence from="friend1@${HOST}/V2:Fortnite:WIN::XYZ"><status>{"Status":"Playing","bIsPlaying":true,"bIsJoinable":true}</status></presence>`,
    );

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      accountId: 'friend1',
      platform: 'WIN',
      available: true,
      playing: true,
      joinable: true,
    });
    expect(received[0]!.status?.Status).toBe('Playing');
    expect(client.getPresence('friend1')?.playing).toBe(true);
    expect([...client.presences.keys()]).toContain('friend1');
  });

  it('removes a friend from the cache on unavailable presence', async () => {
    const { client, sockets } = makeClient();
    const socket = await connect(client, sockets);
    socket.serverSend(
      `<presence from="friend2@${HOST}/res"><status>{"Status":"Online"}</status></presence>`,
    );
    expect(client.getPresence('friend2')).not.toBeNull();

    socket.serverSend(`<presence from="friend2@${HOST}/res" type="unavailable"/>`);
    expect(client.getPresence('friend2')).toBeNull();
    expect([...client.presences.keys()]).not.toContain('friend2');
  });

  it('ignores presence echoed from the connected account itself', async () => {
    const { client, sockets } = makeClient();
    const socket = await connect(client, sockets);
    socket.serverSend(`<presence from="${ACCOUNT}@${HOST}/other"><status>{"Status":"x"}</status></presence>`);
    expect(client.presences.size).toBe(0);
  });
});

describe('XmppClient messaging', () => {
  it('parses inbound chat messages', async () => {
    const { client, sockets } = makeClient();
    const socket = await connect(client, sockets);
    const messages: XmppMessage[] = [];
    client.on('message', (message) => messages.push(message));

    socket.serverSend(
      `<message from="friend3@${HOST}/res" id="m1" type="chat"><body>hello there</body></message>`,
    );

    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      accountId: 'friend3',
      id: 'm1',
      type: 'chat',
      body: 'hello there',
    });
  });

  it('sends a chat message to a friend', async () => {
    const { client, sockets } = makeClient();
    const socket = await connect(client, sockets);
    client.sendMessage('friend4', 'gg');
    const message = socket.sent.find((s) => s.startsWith('<message'))!;
    const node = parseStanza(message)!;
    expect(node.attrs.to).toBe(`friend4@${HOST}`);
    expect(node.attrs.type).toBe('chat');
    expect(findChild(node, 'body')?.text).toBe('gg');
  });
});

describe('XmppClient status updates', () => {
  it('builds a custom status presence stanza', async () => {
    const { client, sockets } = makeClient();
    const socket = await connect(client, sockets);
    client.setCustomStatus('Chilling in the lobby');
    const presence = socket.sent[socket.sent.length - 1]!;
    const status = findChild(parseStanza(presence)!, 'status')!;
    expect(JSON.parse(status.text).Status).toBe('Chilling in the lobby');
  });

  it('carries prior status fields forward when patching', async () => {
    const { client, sockets } = makeClient();
    const socket = await connect(client, sockets);
    client.setStatus({ status: 'Playing', playing: true });
    client.setStatus({ joinable: true });
    const presence = socket.sent[socket.sent.length - 1]!;
    const parsed = JSON.parse(findChild(parseStanza(presence)!, 'status')!.text);
    expect(parsed).toMatchObject({ Status: 'Playing', bIsPlaying: true, bIsJoinable: true });
  });

  it('sends an unavailable presence for goOffline', async () => {
    const { client, sockets } = makeClient();
    const socket = await connect(client, sockets);
    client.goOffline();
    const presence = socket.sent[socket.sent.length - 1]!;
    expect(parseStanza(presence)!.attrs.type).toBe('unavailable');
  });

  it('rejects a non-string custom status', async () => {
    const { client, sockets } = makeClient();
    await connect(client, sockets);
    expect(() => client.setCustomStatus(42 as never)).toThrow(ValidationError);
  });

  it('sends a minimal Status-only payload for a plain custom status', async () => {
    const { client, sockets } = makeClient();
    const socket = await connect(client, sockets);
    client.setCustomStatus('Ready up');
    const presence = socket.sent[socket.sent.length - 1]!;
    const parsed = JSON.parse(findChild(parseStanza(presence)!, 'status')!.text);
    expect(parsed).toEqual({ Status: 'Ready up' });
  });

  it('includes ProductName only when explicitly provided', async () => {
    const { client, sockets } = makeClient();
    const socket = await connect(client, sockets);
    client.setStatus({ status: 'Ready up', productName: 'Fortnite' });
    const presence = socket.sent[socket.sent.length - 1]!;
    const parsed = JSON.parse(findChild(parseStanza(presence)!, 'status')!.text);
    expect(parsed).toEqual({ Status: 'Ready up', ProductName: 'Fortnite' });
  });

  it('carries a show child when a presence show is supplied', async () => {
    const { client, sockets } = makeClient();
    const socket = await connect(client, sockets);
    client.setCustomStatus('Away for a bit', { show: 'away' });
    const presence = socket.sent[socket.sent.length - 1]!;
    const node = parseStanza(presence)!;
    expect(findChild(node, 'show')?.text).toBe('away');
    expect(JSON.parse(findChild(node, 'status')!.text).Status).toBe('Away for a bit');
  });

  it('maps an away status to a show child', async () => {
    const { client, sockets } = makeClient();
    const socket = await connect(client, sockets);
    client.setAway('away', 'Grabbing food');
    const node = parseStanza(socket.sent[socket.sent.length - 1]!)!;
    expect(findChild(node, 'show')?.text).toBe('away');
    expect(JSON.parse(findChild(node, 'status')!.text).Status).toBe('Grabbing food');
  });

  it('maps extended away to an xa show child', async () => {
    const { client, sockets } = makeClient();
    const socket = await connect(client, sockets);
    client.setAway('extended');
    expect(findChild(parseStanza(socket.sent[socket.sent.length - 1]!)!, 'show')?.text).toBe('xa');
  });

  it('omits the show child for an online away status', async () => {
    const { client, sockets } = makeClient();
    const socket = await connect(client, sockets);
    client.setCustomStatus('Online now', { away: 'online' });
    expect(findChild(parseStanza(socket.sent[socket.sent.length - 1]!)!, 'show')).toBeUndefined();
  });

  it('directs a custom status to a single friend jid', async () => {
    const { client, sockets } = makeClient();
    const socket = await connect(client, sockets);
    client.setCustomStatus('Just for you', { to: 'friend7' });
    const presence = socket.sent[socket.sent.length - 1]!;
    expect(parseStanza(presence)!.attrs.to).toBe(`friend7@${HOST}`);
  });

  it('attaches a persist delay for showStatusWhenOffline', async () => {
    const { client, sockets } = makeClient();
    const socket = await connect(client, sockets);
    client.showStatusWhenOffline('Always visible');
    const presence = socket.sent[socket.sent.length - 1]!;
    const node = parseStanza(presence)!;
    expect(node.attrs.type).toBeUndefined();
    expect(node.attrs.to).toBeUndefined();
    const delay = findChild(node, 'delay')!;
    expect(delay.attrs.xmlns).toBe('urn:xmpp:delay');
    expect(delay.attrs.stamp).toBe('9999-12-31T23:59:59.999Z');
    expect(JSON.parse(findChild(node, 'status')!.text).Status).toBe('Always visible');
  });

  it('honors a custom delay stamp for persisted status', async () => {
    const { client, sockets } = makeClient();
    const socket = await connect(client, sockets);
    client.setStatus({ status: 'Pinned', persistWhileOffline: true, delayStamp: '2030-01-01T00:00:00.000Z' });
    const presence = socket.sent[socket.sent.length - 1]!;
    expect(findChild(parseStanza(presence)!, 'delay')?.attrs.stamp).toBe('2030-01-01T00:00:00.000Z');
  });

  it('omits the persist delay for a custom status by default', async () => {
    const { client, sockets } = makeClient();
    const socket = await connect(client, sockets);
    client.setCustomStatus('Grinding ranked');
    const node = parseStanza(socket.sent[socket.sent.length - 1]!)!;
    expect(findChild(node, 'delay')).toBeUndefined();
    expect(JSON.parse(findChild(node, 'status')!.text).Status).toBe('Grinding ranked');
  });

  it('omits the persist delay when persistWhileOffline is false', async () => {
    const { client, sockets } = makeClient();
    const socket = await connect(client, sockets);
    client.setStatus({ status: 'Live only', persistWhileOffline: false });
    const presence = socket.sent[socket.sent.length - 1]!;
    expect(findChild(parseStanza(presence)!, 'delay')).toBeUndefined();
  });

  it('overwrites the stored presence when clearing a status', async () => {
    const { client, sockets } = makeClient();
    const socket = await connect(client, sockets);
    client.clearStatus();
    const node = parseStanza(socket.sent[socket.sent.length - 1]!)!;
    expect(findChild(node, 'delay')).toBeUndefined();
    expect(JSON.parse(findChild(node, 'status')!.text).Status).toBe('');
  });

  it('rejects a non-string offline status', async () => {
    const { client, sockets } = makeClient();
    await connect(client, sockets);
    expect(() => client.showStatusWhenOffline(7 as never)).toThrow(ValidationError);
  });

  it('throws when setting status before connecting', () => {
    const { client } = makeClient();
    expect(() => client.setStatus({ status: 'x' })).toThrow(ConfigurationError);
  });
});

describe('XmppClient reconnect replay', () => {
  async function driveHandshake(
    sockets: MockWebSocket[],
    index: number,
    promise: Promise<void>,
  ): Promise<void> {
    await flush();
    const socket = sockets[index]!;
    socket.open();
    socket.serverSend(`<open xmlns="urn:ietf:params:xml:ns:xmpp-framing" from="${HOST}" version="1.0"/>`);
    socket.serverSend(FEATURES_SASL);
    socket.serverSend('<success xmlns="urn:ietf:params:xml:ns:xmpp-sasl"/>');
    socket.serverSend(`<open xmlns="urn:ietf:params:xml:ns:xmpp-framing" from="${HOST}" version="1.0"/>`);
    socket.serverSend(FEATURES_BIND);
    socket.serverSend(
      `<iq type="result" id="bind_1"><bind xmlns="urn:ietf:params:xml:ns:xmpp-bind"><jid>${ACCOUNT}@${HOST}/V2:Fortnite:WIN::ABC</jid></bind></iq>`,
    );
    await promise;
  }

  it('re-sends the last custom status after reconnecting', async () => {
    const { client, sockets } = makeClient();
    const socket = await connect(client, sockets);
    client.setCustomStatus('Grinding ranked', { away: 'away' });
    socket.serverClose(1006, 'dropped');
    expect(client.connected).toBe(false);

    await driveHandshake(sockets, 1, client.connect());

    const replayed = sockets[1]!.sent.find((s) => s.includes('<status') && s.includes('Grinding ranked'))!;
    const node = parseStanza(replayed)!;
    expect(JSON.parse(findChild(node, 'status')!.text).Status).toBe('Grinding ranked');
    expect(findChild(node, 'show')?.text).toBe('away');
    expect(findChild(node, 'delay')).toBeUndefined();
  });

  it('replays the persist opt-in delay on reconnect', async () => {
    const { client, sockets } = makeClient();
    const socket = await connect(client, sockets);
    client.setStatus({ status: 'Pinned', persistWhileOffline: true });
    socket.serverClose(1006, 'dropped');

    await driveHandshake(sockets, 1, client.connect());

    const replayed = sockets[1]!.sent.find((s) => s.includes('Pinned'))!;
    expect(findChild(parseStanza(replayed)!, 'delay')?.attrs.stamp).toBe('9999-12-31T23:59:59.999Z');
  });

  async function serverHandshake(socket: MockWebSocket): Promise<void> {
    socket.open();
    socket.serverSend(`<open xmlns="urn:ietf:params:xml:ns:xmpp-framing" from="${HOST}" version="1.0"/>`);
    socket.serverSend(FEATURES_SASL);
    socket.serverSend('<success xmlns="urn:ietf:params:xml:ns:xmpp-sasl"/>');
    socket.serverSend(`<open xmlns="urn:ietf:params:xml:ns:xmpp-framing" from="${HOST}" version="1.0"/>`);
    socket.serverSend(FEATURES_BIND);
    socket.serverSend(
      `<iq type="result" id="bind_1"><bind xmlns="urn:ietf:params:xml:ns:xmpp-bind"><jid>${ACCOUNT}@${HOST}/V2:Fortnite:WIN::ABC</jid></bind></iq>`,
    );
  }

  it('auto-reconnects and replays the status after an unexpected drop', async () => {
    const { client, sockets } = makeClient({
      autoReconnect: true,
      reconnectInitialDelayMs: 5,
      connectionTimeoutMs: 1_000,
    });
    const socket = await connect(client, sockets);
    client.setCustomStatus('Back soon', { away: 'away' });

    const reconnecting = vi.fn();
    client.on('reconnecting', reconnecting);
    socket.serverClose(1006, 'dropped');
    expect(client.connected).toBe(false);

    await vi.waitFor(() => expect(sockets.length).toBe(2));
    await serverHandshake(sockets[1]!);
    await vi.waitFor(() => expect(client.connected).toBe(true));

    expect(reconnecting).toHaveBeenCalledWith({ attempt: 1, delay: 5 });
    const replayed = sockets[1]!.sent.find((s) => s.includes('<status') && s.includes('Back soon'))!;
    expect(JSON.parse(findChild(parseStanza(replayed)!, 'status')!.text).Status).toBe('Back soon');
    expect(findChild(parseStanza(replayed)!, 'show')?.text).toBe('away');
  });

  it('does not auto-reconnect after a user-initiated disconnect', async () => {
    const { client, sockets } = makeClient({ autoReconnect: true, reconnectInitialDelayMs: 5 });
    await connect(client, sockets);
    await client.disconnect();

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(sockets.length).toBe(1);
    expect(client.connected).toBe(false);
  });
});

describe('XmppClient keepalive and disconnect', () => {
  it('answers a server ping with a result iq', async () => {
    const { client, sockets } = makeClient();
    const socket = await connect(client, sockets);
    socket.serverSend(
      `<iq from="${HOST}" type="get" id="ping-42"><ping xmlns="urn:xmpp:ping"/></iq>`,
    );
    const pong = socket.sent.find((s) => s.includes('id="ping-42"') && s.includes('type="result"'));
    expect(pong).toBeDefined();
  });

  it('sends a ping iq on demand', async () => {
    const { client, sockets } = makeClient();
    const socket = await connect(client, sockets);
    client.ping();
    const ping = socket.sent.find((s) => s.includes('urn:xmpp:ping') && s.includes('type="get"'))!;
    expect(ping).toContain(`to="${HOST}"`);
  });

  it('closes the stream and emits disconnected on disconnect', async () => {
    const { client, sockets } = makeClient();
    const socket = await connect(client, sockets);
    const spy = vi.fn();
    client.on('disconnected', spy);
    await client.disconnect();
    expect(socket.sent.some((s) => s.includes('<close'))).toBe(true);
    expect(spy).toHaveBeenCalledOnce();
    expect(client.connected).toBe(false);
  });

  it('clears the presence cache when the connection closes', async () => {
    const { client, sockets } = makeClient();
    const socket = await connect(client, sockets);
    socket.serverSend(`<presence from="friend5@${HOST}/res"><status>{"Status":"x"}</status></presence>`);
    expect(client.presences.size).toBe(1);
    socket.serverClose(1006, 'gone');
    expect(client.presences.size).toBe(0);
  });
});
