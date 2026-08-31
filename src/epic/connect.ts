import { ConfigurationError, ValidationError } from '../core/errors.js';
import { decodeMessageBody } from './chat.js';
import { TypedEmitter } from './emitter.js';
import type { FortniteStatus, FriendPresence, PresenceShow, WebSocketLike } from './xmpp.js';

export const CONNECT_WEBSOCKET_URL = 'wss://connect.epicgames.dev/';
export const CONNECT_SUBPROTOCOL = 'stomp';
export const CONNECT_SEC_PROTOCOLS = 'v10.stomp,v11.stomp,v12.stomp';

const NUL = String.fromCharCode(0);
const WS_OPEN = 1;

export type ConnectState = 'idle' | 'connecting' | 'connected' | 'closing' | 'closed';

export interface ConnectSocketOptions {
  headers?: Record<string, string>;
}

export type ConnectWebSocketFactory = (
  url: string,
  protocols?: string | string[],
  options?: ConnectSocketOptions,
) => WebSocketLike;

export interface ConnectFrame {
  command: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

export interface ConnectFriendMessage {
  conversationId: string | null;
  accountId: string;
  body: string;
  receivedAt: string;
  raw: Record<string, unknown>;
}

export interface ConnectPartyMessage {
  partyId: string | null;
  conversationId: string | null;
  accountId: string;
  body: string;
  receivedAt: string;
  raw: Record<string, unknown>;
}

export interface ConnectPresenceUpdate {
  accountId: string;
  payload: Record<string, unknown>;
  receivedAt: string;
}

export interface ConnectClientOptions {
  accountId: string;
  getAccessToken: () => string | Promise<string>;
  onConnected?: (connectionId: string) => void | Promise<void>;
  webSocket?: ConnectWebSocketFactory;
  url?: string;
  connectionTimeoutMs?: number;
  autoReconnect?: boolean;
  debug?: (direction: 'in' | 'out', data: string) => void;
}

export interface ConnectEventMap {
  connected: { connectionId: string };
  disconnected: { code: number; reason: string };
  'friend:message': ConnectFriendMessage;
  'party:message': ConnectPartyMessage;
  presence: ConnectPresenceUpdate;
  message: ConnectFrame;
  frame: ConnectFrame;
  raw: { direction: 'in' | 'out'; data: string };
  error: Error;
}

const HEADERLESS_FACTORY = Symbol('headerlessConnectFactory');

type BrandedFactory = ConnectWebSocketFactory & { [HEADERLESS_FACTORY]?: boolean };

function resolveConnectWebSocketFactory(factory?: ConnectWebSocketFactory): BrandedFactory {
  if (factory) return factory;
  const globalWebSocket = (globalThis as { WebSocket?: unknown }).WebSocket;
  if (typeof globalWebSocket !== 'function') {
    throw new ConfigurationError(
      'No global WebSocket implementation was found. Pass a `webSocket` factory (for example one backed by the "ws" package, which can set the required Authorization header) in the connect options.',
      'webSocket',
    );
  }
  const fallback: BrandedFactory = (url, protocols) =>
    new (globalWebSocket as new (url: string, protocols?: string | string[]) => WebSocketLike)(url, protocols);
  fallback[HEADERLESS_FACTORY] = true;
  return fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function decodeEosProp(value: unknown): unknown {
  if (typeof value !== 'string' || value.length === 0) return value;
  const tag = value[0];
  const rest = value.slice(1);
  switch (tag) {
    case 'i': {
      const parsed = Number.parseInt(rest, 10);
      return Number.isNaN(parsed) ? value : parsed;
    }
    case 'b':
      return rest === 'true';
    case 's':
      return rest;
    case 'm':
      try {
        return JSON.parse(rest);
      } catch {
        return rest;
      }
    default:
      return value;
  }
}

export function decodeEosProps(props: Record<string, unknown>): Record<string, unknown> {
  const decoded: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    decoded[key] = key.startsWith('EOS_') ? value : decodeEosProp(value);
  }
  return decoded;
}

function showFromStatus(status: string): PresenceShow | null {
  switch (status) {
    case 'away':
      return 'away';
    case 'extendedaway':
    case 'xa':
      return 'xa';
    case 'dnd':
      return 'dnd';
    default:
      return null;
  }
}

function coercePresenceBool(value: unknown): boolean {
  return value === true || value === 'true';
}

function readPresencePlatform(props: Record<string, unknown>): string | null {
  const platform = props['EOS_Platform'];
  return typeof platform === 'string' && platform.length > 0 ? platform : null;
}

export function normalizeConnectPresence(payload: Record<string, unknown>): FriendPresence | null {
  const accountId = typeof payload['accountId'] === 'string' ? (payload['accountId'] as string) : '';
  if (!accountId) return null;

  const rawStatus = typeof payload['status'] === 'string' ? (payload['status'] as string) : '';
  const statusIsJson = rawStatus.trimStart().startsWith('{');
  const topStatus = statusIsJson ? '' : rawStatus.toLowerCase();
  const available = topStatus.length === 0 ? true : topStatus !== 'offline';

  const perNsList = Array.isArray(payload['perNs']) ? (payload['perNs'] as unknown[]) : [];
  const perNs = perNsList.length > 0 ? asRecord(perNsList[0]) : {};
  const perNsProps = decodeEosProps(asRecord(perNs['props']));
  const activity = asRecord(perNs['activity'] ?? payload['activity']);
  const nsStatus = typeof perNs['status'] === 'string' ? (perNs['status'] as string).toLowerCase() : '';

  let statusText: string | null = null;
  if (typeof activity['value'] === 'string' && (activity['value'] as string).length > 0) {
    statusText = activity['value'] as string;
  } else if (statusIsJson) {
    statusText = rawStatus;
  }

  let status: FortniteStatus | null = null;
  if (statusText && statusText.trimStart().startsWith('{')) {
    try {
      const parsed = JSON.parse(statusText) as FortniteStatus;
      if (parsed && typeof parsed === 'object') status = parsed;
    } catch {
      status = null;
    }
  }

  return {
    accountId,
    jid: accountId,
    resource: null,
    platform: readPresencePlatform(perNsProps),
    available,
    show: showFromStatus(nsStatus || topStatus),
    statusText,
    status,
    playing: status?.bIsPlaying ?? coercePresenceBool(perNsProps['bIsPlaying']),
    joinable: status?.bIsJoinable ?? coercePresenceBool(perNsProps['bIsJoinable']),
    receivedAt: new Date().toISOString(),
  };
}

function stripPartyPrefix(conversationId: string | null): string | null {
  if (!conversationId) return null;
  return conversationId.startsWith('p-') ? conversationId.slice(2) : conversationId;
}

export class ConnectClient extends TypedEmitter<ConnectEventMap> {
  private readonly options: ConnectClientOptions;
  private readonly factory: ConnectWebSocketFactory;
  private readonly url: string;
  private readonly connectionTimeoutMs: number;
  private readonly autoReconnect: boolean;

  private socket: WebSocketLike | null = null;
  private currentState: ConnectState = 'idle';
  private connectionId: string | null = null;
  private heartbeatStarted = false;
  private readonly presenceCache = new Map<string, FriendPresence>();

  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private connectTimer: ReturnType<typeof setTimeout> | null = null;

  private connectPromise: Promise<void> | null = null;
  private connectResolve: (() => void) | null = null;
  private connectReject: ((error: Error) => void) | null = null;

  constructor(options: ConnectClientOptions) {
    super();
    if (!options || typeof options.accountId !== 'string' || options.accountId.trim().length === 0) {
      throw new ValidationError('A connect client requires a non-empty accountId.', 'accountId');
    }
    if (typeof options.getAccessToken !== 'function') {
      throw new ValidationError('A connect client requires a getAccessToken function.', 'getAccessToken');
    }
    this.options = options;
    const factory = resolveConnectWebSocketFactory(options.webSocket);
    if ((factory as BrandedFactory)[HEADERLESS_FACTORY]) {
      throw new ConfigurationError(
        'The connect (EOS) stream requires a WebSocket that can send an Authorization header, which browser and global WebSocket implementations cannot. Pass a `webSocket` factory backed by the "ws" package (Node and Electron main) or the Tauri websocket plugin. Live friend presence is still available without a socket through session.friendPresences().',
        'webSocket',
      );
    }
    this.factory = factory;
    this.url = options.url ?? CONNECT_WEBSOCKET_URL;
    this.connectionTimeoutMs = options.connectionTimeoutMs ?? 15_000;
    this.autoReconnect = options.autoReconnect ?? true;
  }

  get state(): ConnectState {
    return this.currentState;
  }

  get connected(): boolean {
    return this.currentState === 'connected';
  }

  get accountId(): string {
    return this.options.accountId;
  }

  get connection(): string | null {
    return this.connectionId;
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

    const token = await this.options.getAccessToken();
    if (typeof token !== 'string' || token.length === 0) {
      throw new ValidationError('getAccessToken returned an empty access token.', 'getAccessToken');
    }

    this.currentState = 'connecting';
    this.connectionId = null;
    this.heartbeatStarted = false;

    this.connectPromise = new Promise<void>((resolve, reject) => {
      this.connectResolve = resolve;
      this.connectReject = reject;
    });

    let socket: WebSocketLike;
    try {
      socket = this.factory(this.url, CONNECT_SEC_PROTOCOLS.split(','), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Epic-Connect-Protocol': 'stomp',
          'Sec-WebSocket-Protocol': CONNECT_SEC_PROTOCOLS,
          'Epic-Connect-Device-Id': ' ',
        },
      });
    } catch (error) {
      const failure = error instanceof Error ? error : new Error(String(error));
      this.failConnect(failure);
      throw failure;
    }
    this.socket = socket;

    this.connectTimer = setTimeout(() => {
      this.failConnect(new ConfigurationError('Timed out while establishing the connect session.', 'connectionTimeoutMs'));
    }, this.connectionTimeoutMs);

    socket.addEventListener('open', () => {
      this.sendRaw(`CONNECT\nheart-beat:30000,0\naccept-version:1.0,1.1,1.2\n\n${NUL}`);
    });
    socket.addEventListener('message', (event: { data: unknown }) => {
      this.handleIncoming(event.data);
    });
    socket.addEventListener('close', (event: { code?: number; reason?: string }) => {
      this.handleClose(event.code ?? 1006, event.reason ?? '');
    });
    socket.addEventListener('error', () => {
      this.emit('error', new Error('The connect WebSocket reported an error.'));
    });

    return this.connectPromise;
  }

  async disconnect(): Promise<void> {
    if (this.currentState === 'idle' || this.currentState === 'closed') {
      this.teardownTimers();
      return;
    }
    this.currentState = 'closing';
    try {
      this.socket?.close(1000, 'client disconnect');
    } catch {
      // teardown best-effort
    }
    this.handleClose(1000, 'client disconnect');
  }

  private sendRaw(data: string): void {
    if (!this.socket) throw new ConfigurationError('The connect socket is not open.', 'state');
    this.socket.send(data);
    this.options.debug?.('out', data);
    this.emit('raw', { direction: 'out', data });
  }

  private handleIncoming(data: unknown): void {
    const text = typeof data === 'string' ? data : this.decodeBinary(data);
    if (!text) return;
    this.options.debug?.('in', text);
    this.emit('raw', { direction: 'in', data: text });

    const separator = text.indexOf('\n\n');
    if (separator === -1) return;

    const rawHeaders = text.slice(0, separator);
    const rawBody = text.slice(separator + 2);
    const headerLines = rawHeaders.split('\n');
    const command = headerLines[0] ?? '';

    const headers: Record<string, string> = {};
    for (let i = 1; i < headerLines.length; i += 1) {
      const line = headerLines[i]!;
      const colon = line.indexOf(':');
      if (colon === -1) continue;
      headers[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
    }

    let body: Record<string, unknown> = {};
    const trimmed = rawBody.replace(/\0+$/, '');
    if (trimmed.length > 0) {
      try {
        body = asRecord(JSON.parse(trimmed));
      } catch {
        body = {};
      }
    }

    const frame: ConnectFrame = { command, headers, body };
    this.emit('frame', frame);
    this.routeFrame(frame);
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

  private routeFrame(frame: ConnectFrame): void {
    const { command, headers, body } = frame;

    if (command === 'CONNECTED') {
      this.startHeartbeat(headers['heart-beat']);
      this.sendRaw(`SUBSCRIBE\nid:0\ndestination:launcher\n\n${NUL}`);
      return;
    }

    if (command === 'ERROR') {
      const statusCode = typeof body['statusCode'] === 'number' ? (body['statusCode'] as number) : undefined;
      if (statusCode === 4019) {
        void this.restart();
        return;
      }
      const message = typeof headers['message'] === 'string' ? headers['message'] : 'connect stream error';
      this.emit('error', new Error(`Connect error frame: ${message}`));
      return;
    }

    if (command !== 'MESSAGE') return;
    this.emit('message', frame);

    const type = typeof body['type'] === 'string' ? (body['type'] as string) : '';
    if (type === 'core.connect.v1.connected') {
      const connectionId = typeof body['connectionId'] === 'string' ? (body['connectionId'] as string) : '';
      this.finishConnect(connectionId);
      return;
    }

    if (type === 'social.chat.v1.NEW_MESSAGE') {
      this.handleNewMessage(body);
      return;
    }

    if (type === 'presence.v1.UPDATE') {
      const payload = asRecord(body['payload']);
      const accountId = typeof payload['accountId'] === 'string' ? (payload['accountId'] as string) : '';
      if (!accountId) return;
      const normalized = normalizeConnectPresence(payload);
      if (normalized) {
        if (normalized.available) {
          this.presenceCache.set(accountId, normalized);
        } else {
          this.presenceCache.delete(accountId);
        }
      }
      this.emit('presence', { accountId, payload, receivedAt: new Date().toISOString() });
    }
  }

  private handleNewMessage(body: Record<string, unknown>): void {
    const payload = asRecord(body['payload']);
    const conversation = asRecord(payload['conversation']);
    const message = asRecord(payload['message']);
    const conversationType = typeof conversation['type'] === 'string' ? (conversation['type'] as string) : '';
    const senderId = typeof message['senderId'] === 'string' ? (message['senderId'] as string) : '';
    const rawBody = typeof message['body'] === 'string' ? (message['body'] as string) : '';
    const conversationId =
      (typeof conversation['conversationId'] === 'string' && (conversation['conversationId'] as string)) ||
      (typeof conversation['id'] === 'string' && (conversation['id'] as string)) ||
      null;
    if (!senderId) return;
    const content = decodeMessageBody(rawBody);
    const receivedAt = new Date().toISOString();

    if (conversationType === 'dm') {
      this.emit('friend:message', {
        conversationId,
        accountId: senderId,
        body: content,
        receivedAt,
        raw: payload,
      });
      return;
    }

    if (conversationType === 'party') {
      if (senderId === this.options.accountId) return;
      this.emit('party:message', {
        partyId: stripPartyPrefix(conversationId),
        conversationId,
        accountId: senderId,
        body: content,
        receivedAt,
        raw: payload,
      });
    }
  }

  private startHeartbeat(headerValue: string | undefined): void {
    if (this.heartbeatStarted) return;
    const parts = (headerValue ?? '0,0').split(',');
    const requested = Number.parseInt(parts[1] ?? '0', 10);
    const delayMs = Number.isFinite(requested) && requested > 0 ? requested : 30_000;
    this.heartbeatStarted = true;
    this.heartbeatTimer = setInterval(() => {
      if (!this.socket || this.socket.readyState !== WS_OPEN) return;
      try {
        this.sendRaw('\n');
      } catch {
        // transient heartbeat failures are non-fatal
      }
    }, delayMs);
    const timer = this.heartbeatTimer as { unref?: () => void };
    if (typeof timer.unref === 'function') timer.unref();
  }

  private finishConnect(connectionId: string): void {
    this.connectionId = connectionId || this.connectionId;
    if (this.currentState !== 'connected') {
      this.currentState = 'connected';
      if (this.connectTimer) {
        clearTimeout(this.connectTimer);
        this.connectTimer = null;
      }
      const resolve = this.connectResolve;
      this.connectResolve = null;
      this.connectReject = null;
      this.connectPromise = null;
      this.emit('connected', { connectionId: this.connectionId ?? '' });
      resolve?.();
    }
    if (this.connectionId) {
      void Promise.resolve(this.options.onConnected?.(this.connectionId)).catch((error) => {
        this.emit('error', error instanceof Error ? error : new Error(String(error)));
      });
    }
  }

  private async restart(): Promise<void> {
    if (!this.autoReconnect) {
      await this.disconnect();
      return;
    }
    try {
      this.socket?.close(1000, 'restart');
    } catch {
      // ignore
    }
    this.socket = null;
    this.teardownTimers();
    this.currentState = 'idle';
    this.heartbeatStarted = false;
    try {
      await this.connect();
    } catch (error) {
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private teardownTimers(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
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
    this.connectionId = null;
    this.heartbeatStarted = false;

    if (wasConnecting) {
      this.failConnect(new ConfigurationError(`The connect stream closed before it was established (code ${code}).`, 'state'));
      return;
    }
    this.emit('disconnected', { code, reason });
  }
}
