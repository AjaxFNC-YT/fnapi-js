import { ConfigurationError, ValidationError } from '../core/errors.js';
import { TypedEmitter } from './emitter.js';
import { buildStanza, findChild, localName, parseStanza, type XmlNode } from './xml.js';

export const XMPP_WEBSOCKET_URL = 'wss://xmpp-service-prod.ol.epicgames.com';
export const XMPP_DOMAIN = 'prod.ol.epicgames.com';
export const XMPP_SUBPROTOCOL = 'xmpp';
export const XMPP_DEFAULT_APP = 'Fortnite';
export const XMPP_DEFAULT_PLATFORM = 'WIN';
export const PRESENCE_OFFLINE_PERSIST_STAMP = '9999-12-31T23:59:59.999Z';

export type PresenceShow = 'chat' | 'away' | 'xa' | 'dnd';

export type AwayStatus = 'online' | 'away' | 'extended';

const AWAY_STATUS_SHOW: Record<AwayStatus, PresenceShow | null> = {
  online: null,
  away: 'away',
  extended: 'xa',
};

export type XmppState =
  | 'idle'
  | 'connecting'
  | 'authenticating'
  | 'binding'
  | 'connected'
  | 'closing'
  | 'closed';

export interface FortniteStatus {
  Status?: string;
  bIsPlaying?: boolean;
  bIsJoinable?: boolean;
  bHasVoiceSupport?: boolean;
  SessionId?: string;
  ProductName?: string;
  Properties?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface FriendPresence {
  accountId: string;
  jid: string;
  resource: string | null;
  platform: string | null;
  available: boolean;
  show: PresenceShow | null;
  statusText: string | null;
  status: FortniteStatus | null;
  playing: boolean;
  joinable: boolean;
  receivedAt: string;
}

export interface XmppMessage {
  id: string | null;
  from: string;
  accountId: string;
  type: string;
  body: string;
  receivedAt: string;
}

export interface SetStatusInput {
  status?: string;
  online?: boolean;
  away?: AwayStatus;
  show?: PresenceShow;
  playing?: boolean;
  joinable?: boolean;
  voice?: boolean;
  sessionId?: string;
  productName?: string;
  properties?: Record<string, unknown>;
  raw?: FortniteStatus;
  to?: string;
  persistWhileOffline?: boolean;
  delayStamp?: string;
}

export interface CustomStatusOptions {
  away?: AwayStatus;
  show?: PresenceShow;
  to?: string;
  persistWhileOffline?: boolean;
  delayStamp?: string;
}

export interface WebSocketLike {
  readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  addEventListener(type: 'open', listener: () => void): void;
  addEventListener(type: 'message', listener: (event: { data: unknown }) => void): void;
  addEventListener(type: 'close', listener: (event: { code?: number; reason?: string }) => void): void;
  addEventListener(type: 'error', listener: (event: unknown) => void): void;
  removeEventListener?(type: string, listener: (...args: never[]) => void): void;
}

export type WebSocketFactory = (url: string, protocols?: string | string[]) => WebSocketLike;

export interface XmppClientOptions {
  accountId: string;
  getAccessToken: () => string | Promise<string>;
  webSocket?: WebSocketFactory;
  url?: string;
  domain?: string;
  app?: string;
  platform?: string;
  resource?: string;
  connectionTimeoutMs?: number;
  pingIntervalMs?: number;
  initialPresence?: SetStatusInput | false;
  autoReconnect?: boolean;
  reconnectInitialDelayMs?: number;
  reconnectMaxDelayMs?: number;
  maxReconnectAttempts?: number;
  debug?: (direction: 'in' | 'out', data: string) => void;
}

export interface XmppEventMap {
  connected: void;
  disconnected: { code: number; reason: string };
  reconnecting: { attempt: number; delay: number };
  presence: FriendPresence;
  message: XmppMessage;
  stanza: XmlNode;
  raw: { direction: 'in' | 'out'; data: string };
  error: Error;
}

const WS_OPEN = 1;
const NUL = String.fromCharCode(0);

function resolveWebSocketFactory(factory?: WebSocketFactory): WebSocketFactory {
  if (factory) return factory;
  const globalWebSocket = (globalThis as { WebSocket?: unknown }).WebSocket;
  if (typeof globalWebSocket !== 'function') {
    throw new ConfigurationError(
      'No global WebSocket implementation was found. Pass a `webSocket` factory (for example one backed by the "ws" package) in the XMPP options.',
      'webSocket',
    );
  }
  return (url, protocols) =>
    new (globalWebSocket as new (url: string, protocols?: string | string[]) => WebSocketLike)(url, protocols);
}

function encodeBase64(input: string): string {
  const globalBtoa = (globalThis as { btoa?: (value: string) => string }).btoa;
  if (typeof globalBtoa === 'function') return globalBtoa(input);
  const bufferCtor = (globalThis as { Buffer?: { from(data: string, encoding: string): { toString(encoding: string): string } } }).Buffer;
  if (bufferCtor) return bufferCtor.from(input, 'binary').toString('base64');
  throw new ConfigurationError('No base64 encoder (btoa/Buffer) is available in this runtime.', 'webSocket');
}

function randomHex(length: number): string {
  const bytes = new Uint8Array(Math.ceil(length / 2));
  const cryptoObj = (globalThis as { crypto?: { getRandomValues?: (array: Uint8Array) => Uint8Array } }).crypto;
  if (cryptoObj?.getRandomValues) {
    cryptoObj.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = '';
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0');
  return out.slice(0, length);
}

function saslPlain(accountId: string, token: string): string {
  return encodeBase64(`${NUL}${accountId}${NUL}${token}`);
}

function accountIdFromJid(jid: string): string {
  const at = jid.indexOf('@');
  return at === -1 ? jid : jid.slice(0, at);
}

function resourceFromJid(jid: string): string | null {
  const slash = jid.indexOf('/');
  return slash === -1 ? null : jid.slice(slash + 1);
}

function platformFromResource(resource: string | null): string | null {
  if (!resource) return null;
  const parts = resource.split(':');
  return parts.length >= 3 && parts[2]!.length > 0 ? parts[2]! : null;
}

export class XmppClient extends TypedEmitter<XmppEventMap> {
  private readonly options: XmppClientOptions;
  private readonly factory: WebSocketFactory;
  private readonly url: string;
  private readonly domain: string;
  private readonly app: string;
  private readonly resourceId: string;
  private readonly pingIntervalMs: number;
  private readonly connectionTimeoutMs: number;
  private readonly autoReconnect: boolean;
  private readonly reconnectInitialDelayMs: number;
  private readonly reconnectMaxDelayMs: number;
  private readonly maxReconnectAttempts: number;

  private socket: WebSocketLike | null = null;
  private currentState: XmppState = 'idle';
  private authenticated = false;
  private sessionAdvertised = false;
  private boundJid: string | null = null;
  private lastStatus: FortniteStatus | null = null;
  private currentPresence: { status: FortniteStatus; show: PresenceShow | null; persist: boolean } | null = null;
  private saslToken = '';

  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private connectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private everConnected = false;
  private manualDisconnect = false;
  private pingCounter = 0;

  private connectPromise: Promise<void> | null = null;
  private connectResolve: (() => void) | null = null;
  private connectReject: ((error: Error) => void) | null = null;

  private readonly presenceCache = new Map<string, FriendPresence>();

  constructor(options: XmppClientOptions) {
    super();
    if (!options || typeof options.accountId !== 'string' || options.accountId.trim().length === 0) {
      throw new ValidationError('An XMPP client requires a non-empty accountId.', 'accountId');
    }
    if (typeof options.getAccessToken !== 'function') {
      throw new ValidationError('An XMPP client requires a getAccessToken function.', 'getAccessToken');
    }
    this.options = options;
    this.factory = resolveWebSocketFactory(options.webSocket);
    this.url = options.url ?? XMPP_WEBSOCKET_URL;
    this.domain = options.domain ?? XMPP_DOMAIN;
    this.app = options.app ?? XMPP_DEFAULT_APP;
    const platform = options.platform ?? XMPP_DEFAULT_PLATFORM;
    this.resourceId = options.resource ?? `V2:${this.app}:${platform}::${randomHex(32).toUpperCase()}`;
    this.pingIntervalMs = options.pingIntervalMs ?? 60_000;
    this.connectionTimeoutMs = options.connectionTimeoutMs ?? 15_000;
    this.autoReconnect = options.autoReconnect ?? true;
    this.reconnectInitialDelayMs = options.reconnectInitialDelayMs ?? 1_000;
    this.reconnectMaxDelayMs = options.reconnectMaxDelayMs ?? 30_000;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 0;
  }

  get state(): XmppState {
    return this.currentState;
  }

  get connected(): boolean {
    return this.currentState === 'connected';
  }

  get accountId(): string {
    return this.options.accountId;
  }

  get jid(): string | null {
    return this.boundJid;
  }

  get resource(): string {
    return this.resourceId;
  }

  get presences(): ReadonlyMap<string, FriendPresence> {
    return this.presenceCache;
  }

  getPresence(accountId: string): FriendPresence | null {
    return this.presenceCache.get(accountId) ?? null;
  }

  async connect(): Promise<void> {
    if (this.currentState === 'connected') return;
    if (this.connectPromise) return this.connectPromise;

    this.manualDisconnect = false;
    this.clearReconnect();

    const token = await this.options.getAccessToken();
    if (typeof token !== 'string' || token.length === 0) {
      throw new ValidationError('getAccessToken returned an empty access token.', 'getAccessToken');
    }

    this.currentState = 'connecting';
    this.authenticated = false;
    this.sessionAdvertised = false;
    this.boundJid = null;
    this.saslToken = saslPlain(this.options.accountId, token);

    this.connectPromise = new Promise<void>((resolve, reject) => {
      this.connectResolve = resolve;
      this.connectReject = reject;
    });

    let socket: WebSocketLike;
    try {
      socket = this.factory(this.url, XMPP_SUBPROTOCOL);
    } catch (error) {
      const failure = error instanceof Error ? error : new Error(String(error));
      this.failConnect(failure);
      throw failure;
    }
    this.socket = socket;

    this.connectTimer = setTimeout(() => {
      this.failConnect(new ConfigurationError('Timed out while establishing the XMPP session.', 'connectionTimeoutMs'));
    }, this.connectionTimeoutMs);

    socket.addEventListener('open', () => {
      this.sendRaw(this.openStanza());
    });
    socket.addEventListener('message', (event: { data: unknown }) => {
      this.handleIncoming(event.data);
    });
    socket.addEventListener('close', (event: { code?: number; reason?: string }) => {
      this.handleClose(event.code ?? 1006, event.reason ?? '');
    });
    socket.addEventListener('error', () => {
      this.emit('error', new Error('The XMPP WebSocket reported an error.'));
    });

    return this.connectPromise;
  }

  async disconnect(): Promise<void> {
    this.manualDisconnect = true;
    this.clearReconnect();
    if (this.currentState === 'idle' || this.currentState === 'closed') {
      this.teardownTimers();
      return;
    }
    this.currentState = 'closing';
    if (this.socket && this.socket.readyState === WS_OPEN) {
      try {
        this.sendRaw(this.presenceStanza({ online: false }));
        this.sendRaw('<close xmlns="urn:ietf:params:xml:ns:xmpp-framing"/>');
      } catch {
        // teardown best-effort
      }
    }
    try {
      this.socket?.close(1000, 'client disconnect');
    } catch {
      // teardown best-effort
    }
    this.handleClose(1000, 'client disconnect');
  }

  setStatus(input: SetStatusInput = {}): void {
    this.assertConnected();
    this.sendRaw(this.presenceStanza(input));
  }

  setCustomStatus(status: string, options: CustomStatusOptions = {}): void {
    if (typeof status !== 'string') {
      throw new ValidationError('A custom status must be a string.', 'status');
    }
    this.setStatus({ status, ...options });
  }

  showStatusWhenOffline(status: string, options: Omit<CustomStatusOptions, 'persistWhileOffline'> = {}): void {
    if (typeof status !== 'string') {
      throw new ValidationError('A custom status must be a string.', 'status');
    }
    this.setStatus({ status, ...options, persistWhileOffline: true });
  }

  clearStatus(): void {
    this.setStatus({ status: '', playing: false, joinable: false });
  }

  setAway(away: AwayStatus, status?: string): void {
    this.setStatus(status === undefined ? { away } : { away, status });
  }

  goOnline(): void {
    this.setStatus({ online: true, away: 'online' });
  }

  goOffline(): void {
    this.setStatus({ online: false });
  }

  private resolveShow(input: SetStatusInput): PresenceShow | null {
    if (input.show) return input.show;
    if (input.away !== undefined) return AWAY_STATUS_SHOW[input.away];
    return null;
  }

  private replayInput(presence: { status: FortniteStatus; show: PresenceShow | null; persist: boolean }): SetStatusInput {
    return {
      raw: presence.status,
      persistWhileOffline: presence.persist,
      ...(presence.show ? { show: presence.show } : {}),
    };
  }

  sendMessage(accountId: string, body: string): void {
    this.assertConnected();
    if (typeof accountId !== 'string' || accountId.trim().length === 0) {
      throw new ValidationError('sendMessage requires a target accountId.', 'accountId');
    }
    if (typeof body !== 'string' || body.length === 0) {
      throw new ValidationError('sendMessage requires a non-empty body.', 'body');
    }
    const to = accountId.includes('@') ? accountId : `${accountId}@${this.domain}`;
    this.sendRaw(
      buildStanza({
        name: 'message',
        attrs: { to, id: `msg_${randomHex(16)}`, type: 'chat' },
        children: [{ name: 'body', text: body }],
      }),
    );
  }

  requestPresence(accountId: string): void {
    this.assertConnected();
    if (typeof accountId !== 'string' || accountId.trim().length === 0) {
      throw new ValidationError('requestPresence requires a target accountId.', 'accountId');
    }
    const to = accountId.includes('@') ? accountId : `${accountId}@${this.domain}`;
    this.sendRaw(buildStanza({ name: 'presence', attrs: { to, type: 'probe' } }));
  }

  ping(): void {
    this.assertConnected();
    this.pingCounter += 1;
    this.sendRaw(
      buildStanza({
        name: 'iq',
        attrs: { to: this.domain, type: 'get', id: `ping_${this.pingCounter}` },
        children: [{ name: 'ping', attrs: { xmlns: 'urn:xmpp:ping' } }],
      }),
    );
  }

  private assertConnected(): void {
    if (this.currentState !== 'connected') {
      throw new ConfigurationError('The XMPP client is not connected. Call connect() first.', 'state');
    }
  }

  private openStanza(): string {
    return buildStanza({
      name: 'open',
      attrs: { xmlns: 'urn:ietf:params:xml:ns:xmpp-framing', to: this.domain, version: '1.0' },
    });
  }

  private presenceStanza(input: SetStatusInput): string {
    const online = input.online !== false;
    const status = this.buildStatus(input);
    if (online) this.lastStatus = status;

    const attrs: Record<string, string> = {};
    const directed = input.to !== undefined && input.to.trim().length > 0;
    if (directed) {
      attrs.to = input.to!.includes('@') ? input.to! : `${input.to!}@${this.domain}`;
    }
    if (!online) attrs.type = 'unavailable';

    const show = this.resolveShow(input);
    const persist = online && input.persistWhileOffline === true;
    if (online && !directed) this.currentPresence = { status, show, persist };

    const children: Array<{ name: string; text?: string; attrs?: Record<string, string> }> = [];
    if (online && show) children.push({ name: 'show', text: show });
    if (online) children.push({ name: 'status', text: JSON.stringify(status) });
    if (persist) {
      children.push({
        name: 'delay',
        attrs: { xmlns: 'urn:xmpp:delay', stamp: input.delayStamp ?? PRESENCE_OFFLINE_PERSIST_STAMP },
      });
    }

    return buildStanza({
      name: 'presence',
      attrs: Object.keys(attrs).length > 0 ? attrs : undefined,
      children,
    });
  }

  private buildStatus(input: SetStatusInput): FortniteStatus {
    if (input.raw) return input.raw;
    const base: FortniteStatus = this.lastStatus ? { ...this.lastStatus } : {};
    if (input.status !== undefined) base.Status = input.status;
    if (input.playing !== undefined) base.bIsPlaying = input.playing;
    if (input.joinable !== undefined) base.bIsJoinable = input.joinable;
    if (input.voice !== undefined) base.bHasVoiceSupport = input.voice;
    if (input.sessionId !== undefined) base.SessionId = input.sessionId;
    if (input.productName !== undefined) base.ProductName = input.productName;
    if (input.properties !== undefined) base.Properties = input.properties;
    if (base.Status === undefined) base.Status = '';
    return base;
  }

  private sendRaw(data: string): void {
    if (!this.socket) throw new ConfigurationError('The XMPP socket is not open.', 'state');
    this.socket.send(data);
    this.options.debug?.('out', data);
    this.emit('raw', { direction: 'out', data });
  }

  private handleIncoming(data: unknown): void {
    const text = typeof data === 'string' ? data : this.decodeBinary(data);
    if (!text) return;
    this.options.debug?.('in', text);
    this.emit('raw', { direction: 'in', data: text });

    const node = parseStanza(text);
    if (!node) return;
    this.emit('stanza', node);
    this.routeStanza(node);
  }

  private decodeBinary(data: unknown): string {
    try {
      const bufferCtor = (globalThis as { Buffer?: { isBuffer(value: unknown): boolean; from(value: unknown): { toString(encoding: string): string } } }).Buffer;
      if (bufferCtor?.isBuffer(data)) return bufferCtor.from(data).toString('utf8');
      if (data instanceof ArrayBuffer) return new TextDecoder().decode(new Uint8Array(data));
      if (ArrayBuffer.isView(data)) return new TextDecoder().decode(data as ArrayBufferView);
    } catch {
      return '';
    }
    return '';
  }

  private routeStanza(node: XmlNode): void {
    const name = localName(node.name);
    switch (name) {
      case 'open':
        return;
      case 'features':
        this.handleFeatures(node);
        return;
      case 'success':
        this.handleSaslSuccess();
        return;
      case 'failure':
        this.failConnect(new ConfigurationError('XMPP authentication failed (SASL failure).', 'getAccessToken'));
        return;
      case 'iq':
        this.handleIq(node);
        return;
      case 'presence':
        this.handlePresence(node);
        return;
      case 'message':
        this.handleMessage(node);
        return;
      case 'close':
        this.handleClose(1000, 'server closed stream');
        return;
      default:
        return;
    }
  }

  private handleFeatures(node: XmlNode): void {
    const hasMechanisms = Boolean(findChild(node, 'mechanisms'));
    const hasBind = Boolean(findChild(node, 'bind'));

    if (!this.authenticated && hasMechanisms) {
      this.currentState = 'authenticating';
      this.sendRaw(
        buildStanza({
          name: 'auth',
          attrs: { xmlns: 'urn:ietf:params:xml:ns:xmpp-sasl', mechanism: 'PLAIN' },
          text: this.saslToken,
        }),
      );
      return;
    }

    if (this.authenticated && hasBind) {
      this.sessionAdvertised = Boolean(findChild(node, 'session'));
      this.currentState = 'binding';
      this.sendRaw(
        buildStanza({
          name: 'iq',
          attrs: { type: 'set', id: 'bind_1' },
          children: [
            {
              name: 'bind',
              attrs: { xmlns: 'urn:ietf:params:xml:ns:xmpp-bind' },
              children: [{ name: 'resource', text: this.resourceId }],
            },
          ],
        }),
      );
    }
  }

  private handleSaslSuccess(): void {
    this.authenticated = true;
    this.sendRaw(this.openStanza());
  }

  private handleIq(node: XmlNode): void {
    const id = node.attrs.id ?? '';
    const type = node.attrs.type ?? '';

    if (findChild(node, 'ping') && type === 'get') {
      this.sendRaw(
        buildStanza({
          name: 'iq',
          attrs: {
            to: node.attrs.from ?? this.domain,
            from: this.boundJid ?? undefined,
            id: id || `pong_${randomHex(8)}`,
            type: 'result',
          },
        }),
      );
      return;
    }

    if (id === 'bind_1' && type === 'result') {
      const bind = findChild(node, 'bind');
      const jidNode = bind ? findChild(bind, 'jid') : undefined;
      this.boundJid = jidNode?.text ?? `${this.options.accountId}@${this.domain}/${this.resourceId}`;
      if (this.sessionAdvertised) {
        this.sendRaw(
          buildStanza({
            name: 'iq',
            attrs: { type: 'set', id: 'session_1' },
            children: [{ name: 'session', attrs: { xmlns: 'urn:ietf:params:xml:ns:xmpp-session' } }],
          }),
        );
      } else {
        this.finishConnect();
      }
      return;
    }

    if (id === 'session_1' && type === 'result') {
      this.finishConnect();
    }
  }

  private finishConnect(): void {
    if (this.currentState === 'connected') return;
    this.currentState = 'connected';
    this.everConnected = true;
    this.reconnectAttempts = 0;
    this.clearReconnect();

    if (this.currentPresence) {
      this.sendRaw(this.presenceStanza(this.replayInput(this.currentPresence)));
    } else {
      const initial = this.options.initialPresence;
      if (initial !== false) {
        this.sendRaw(this.presenceStanza(initial ?? {}));
      }
    }

    this.startKeepalive();
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }
    const resolve = this.connectResolve;
    this.connectResolve = null;
    this.connectReject = null;
    this.connectPromise = null;
    this.emit('connected', undefined);
    resolve?.();
  }

  private handlePresence(node: XmlNode): void {
    const from = node.attrs.from;
    if (!from) return;
    const type = node.attrs.type ?? '';
    if (type === 'error') return;

    const accountId = accountIdFromJid(from);
    if (accountId === this.options.accountId) return;

    const resource = resourceFromJid(from);
    const available = type !== 'unavailable';
    const showNode = findChild(node, 'show');
    const statusNode = findChild(node, 'status');
    const statusText = statusNode?.text ?? null;

    let status: FortniteStatus | null = null;
    if (statusText) {
      try {
        const parsed = JSON.parse(statusText) as FortniteStatus;
        if (parsed && typeof parsed === 'object') status = parsed;
      } catch {
        status = null;
      }
    }

    const presence: FriendPresence = {
      accountId,
      jid: from,
      resource,
      platform: platformFromResource(resource),
      available,
      show: (showNode?.text as PresenceShow) || null,
      statusText,
      status,
      playing: Boolean(status?.bIsPlaying),
      joinable: Boolean(status?.bIsJoinable),
      receivedAt: new Date().toISOString(),
    };

    if (available) {
      this.presenceCache.set(accountId, presence);
    } else {
      this.presenceCache.delete(accountId);
    }
    this.emit('presence', presence);
  }

  private handleMessage(node: XmlNode): void {
    const from = node.attrs.from;
    if (!from) return;
    const bodyNode = findChild(node, 'body');
    if (!bodyNode) return;
    const message: XmppMessage = {
      id: node.attrs.id ?? null,
      from,
      accountId: accountIdFromJid(from),
      type: node.attrs.type ?? 'normal',
      body: bodyNode.text,
      receivedAt: new Date().toISOString(),
    };
    this.emit('message', message);
  }

  private startKeepalive(): void {
    this.teardownTimers();
    this.pingTimer = setInterval(() => {
      if (this.currentState !== 'connected') return;
      try {
        this.ping();
      } catch {
        // transient ping failures are non-fatal
      }
    }, this.pingIntervalMs);
    const timer = this.pingTimer as { unref?: () => void };
    if (typeof timer.unref === 'function') timer.unref();
  }

  private teardownTimers(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private failConnect(error: Error): void {
    const reject = this.connectReject;
    this.connectResolve = null;
    this.connectReject = null;
    this.connectPromise = null;
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }
    this.teardownTimers();
    if (this.currentState !== 'closed') {
      this.currentState = 'closed';
      try {
        this.socket?.close(1000, 'connect failed');
      } catch {
        // ignore
      }
    }
    if (reject) {
      reject(error);
    } else {
      this.emit('error', error);
    }
    this.maybeReconnect();
  }

  private handleClose(code: number, reason: string): void {
    if (this.currentState === 'closed') return;
    const wasConnecting = Boolean(this.connectReject);
    this.teardownTimers();
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }
    this.currentState = 'closed';
    this.socket = null;
    this.presenceCache.clear();

    if (wasConnecting) {
      this.failConnect(new ConfigurationError(`The XMPP connection closed before it was established (code ${code}).`, 'state'));
      return;
    }
    this.emit('disconnected', { code, reason });
    this.maybeReconnect();
  }

  private maybeReconnect(): void {
    if (!this.autoReconnect || this.manualDisconnect || !this.everConnected) return;
    if (this.reconnectTimer || this.connectPromise) return;
    if (this.maxReconnectAttempts > 0 && this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('error', new ConfigurationError('Exhausted XMPP reconnect attempts.', 'maxReconnectAttempts'));
      return;
    }

    const attempt = this.reconnectAttempts + 1;
    const delay = Math.min(this.reconnectMaxDelayMs, this.reconnectInitialDelayMs * 2 ** this.reconnectAttempts);
    this.reconnectAttempts = attempt;
    this.emit('reconnecting', { attempt, delay });

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.manualDisconnect) return;
      this.connect().catch(() => {
        // failure re-enters maybeReconnect via failConnect/handleClose
      });
    }, delay);
    const timer = this.reconnectTimer as { unref?: () => void };
    if (typeof timer.unref === 'function') timer.unref();
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
