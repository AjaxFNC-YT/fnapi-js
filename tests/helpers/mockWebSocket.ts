import type { WebSocketLike, WebSocketFactory } from '../../src/epic/xmpp.js';
import type { ConnectSocketOptions, ConnectWebSocketFactory } from '../../src/epic/connect.js';

type OpenListener = () => void;
type MessageListener = (event: { data: unknown }) => void;
type CloseListener = (event: { code?: number; reason?: string }) => void;
type ErrorListener = (event: unknown) => void;

export class MockWebSocket implements WebSocketLike {
  static instances: MockWebSocket[] = [];

  readyState = 0;
  readonly url: string;
  readonly protocols?: string | string[];
  readonly options?: ConnectSocketOptions;
  readonly sent: string[] = [];

  private readonly openListeners = new Set<OpenListener>();
  private readonly messageListeners = new Set<MessageListener>();
  private readonly closeListeners = new Set<CloseListener>();
  private readonly errorListeners = new Set<ErrorListener>();

  constructor(url: string, protocols?: string | string[], options?: ConnectSocketOptions) {
    this.url = url;
    this.protocols = protocols;
    this.options = options;
    MockWebSocket.instances.push(this);
  }

  get headers(): Record<string, string> {
    return this.options?.headers ?? {};
  }

  addEventListener(type: 'open', listener: OpenListener): void;
  addEventListener(type: 'message', listener: MessageListener): void;
  addEventListener(type: 'close', listener: CloseListener): void;
  addEventListener(type: 'error', listener: ErrorListener): void;
  addEventListener(type: string, listener: (...args: never[]) => void): void {
    if (type === 'open') this.openListeners.add(listener as OpenListener);
    else if (type === 'message') this.messageListeners.add(listener as MessageListener);
    else if (type === 'close') this.closeListeners.add(listener as CloseListener);
    else if (type === 'error') this.errorListeners.add(listener as ErrorListener);
  }

  removeEventListener(_type: string, listener: (...args: never[]) => void): void {
    this.openListeners.delete(listener as OpenListener);
    this.messageListeners.delete(listener as MessageListener);
    this.closeListeners.delete(listener as CloseListener);
    this.errorListeners.delete(listener as ErrorListener);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(code = 1000, reason = ''): void {
    if (this.readyState === 3) return;
    this.readyState = 3;
    for (const listener of [...this.closeListeners]) listener({ code, reason });
  }

  open(): void {
    this.readyState = 1;
    for (const listener of [...this.openListeners]) listener();
  }

  serverSend(data: unknown): void {
    for (const listener of [...this.messageListeners]) listener({ data });
  }

  serverClose(code = 1000, reason = ''): void {
    if (this.readyState === 3) return;
    this.readyState = 3;
    for (const listener of [...this.closeListeners]) listener({ code, reason });
  }

  emitError(payload: unknown = new Error('mock error')): void {
    for (const listener of [...this.errorListeners]) listener(payload);
  }

  lastSent(): string {
    return this.sent[this.sent.length - 1] ?? '';
  }
}

export function createMockWebSocket(): { factory: WebSocketFactory; sockets: MockWebSocket[] } {
  const sockets: MockWebSocket[] = [];
  const factory: WebSocketFactory = (url, protocols) => {
    const socket = new MockWebSocket(url, protocols);
    sockets.push(socket);
    return socket;
  };
  return { factory, sockets };
}

export function createMockConnectWebSocket(): {
  factory: ConnectWebSocketFactory;
  sockets: MockWebSocket[];
} {
  const sockets: MockWebSocket[] = [];
  const factory: ConnectWebSocketFactory = (url, protocols, options) => {
    const socket = new MockWebSocket(url, protocols, options);
    sockets.push(socket);
    return socket;
  };
  return { factory, sockets };
}
