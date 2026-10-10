# Chat & Live Events

Epic splits social chat across two transports, and `fnapi-js` wires both into [`EpicAuthSession`](/epic/session):

- **Sending** DMs and party messages goes over the **EOS ChatService** (`https://api.epicgames.dev/epic/chat/v1`) with Ed25519-signed message bodies.
- **Receiving** live text — new DMs, party chat, presence — arrives over a **STOMP-over-WebSocket** connection to `wss://connect.epicgames.dev/`. `ConnectClient` speaks that protocol and re-emits each frame as a typed event.

The two are independent: you can send without opening the live stream, and you can listen for incoming messages without sending. A session exposes both so you rarely construct the clients by hand.

```ts
import { EpicGamesClient } from 'fnapi-js';

const epic = new EpicGamesClient();
const session = await epic.loginWithDeviceAuth(creds);

const events = await session.connectEvents();

events.on('friend:message', (dm) => {
  console.log(`DM from ${dm.accountId}: ${dm.body}`);
  void session.sendDM(dm.accountId, `you said: ${dm.body}`);
});

events.on('party:message', (msg) => {
  console.log(`party ${msg.accountId}: ${msg.body}`);
});
```

## Sending messages

Both send helpers connect to the ChatService on demand, register a chat public key the first time, sign the body, and post it.

### sendDM
<Badge type="info" text="method" />

```ts
sendDM(targetAccountId: string, content: string): Promise<ChatSendResult>
```

Sends a direct message. It resolves (or creates) the DM conversation, signs the message with your Ed25519 chat key, and posts it with the signature metadata Epic expects. If the conversation's `isReportable` flag is rejected, it retries once without it.

### sendPartyMessage
<Badge type="info" text="method" />

```ts
sendPartyMessage(content: string): Promise<ChatSendResult>
```

Sends a message to every other member of your current party. Throws a `ValidationError` if you are not in a party or are the only member. Messages are capped just under `CHAT_MAX_MESSAGE_LENGTH` characters.

### chatHistory
<Badge type="info" text="method" />

```ts
chatHistory(targetAccountId: string, options?: { limit?: number; signal?: AbortSignal }): Promise<ChatMessage[]>
```

Fetches previous messages for a DM conversation. Bodies are decoded from their signed base64 envelope back to plain text.

## Live events

`session.connectEvents(options?)` opens (or reuses) the `ConnectClient` and returns it. On connect it publishes your presence so the stream starts delivering events. `session.events` is the current client or `null`, and `session.disconnectEvents()` closes it. `session.logout()` closes the stream automatically.

```ts
const events = await session.connectEvents();
console.log('live connection', events.connection);
```

### Events
<Badge type="tip" text="emitter" />

`on` / `once` / `off` register typed listeners.

| Event | Payload | Fired when |
| --- | --- | --- |
| `connected` | `{ connectionId }` | The STOMP session is established (again after every reconnect). |
| `disconnected` | `{ code, reason }` | The socket closes. |
| `reconnecting` | `{ attempt, delay }` | An auto-reconnect is scheduled after an unexpected drop. |
| `friend:message` | `ConnectFriendMessage` | A DM arrives (body decoded to text). |
| `party:message` | `ConnectPartyMessage` | A party chat message arrives (your own echoes are skipped). |
| `presence` | `ConnectPresenceUpdate` | A friend's presence changes. |
| `frame` / `message` | `ConnectFrame` | Any parsed STOMP frame (advanced). |
| `raw` | `{ direction, data }` | Every frame in/out (debugging). |
| `error` | `Error` | A non-fatal client error. |

Once connected, an **unexpected** drop is recovered automatically with exponential backoff (`reconnectInitialDelayMs` 1000, doubling up to `reconnectMaxDelayMs` 30000; `maxReconnectAttempts` 0 = unlimited), and an `ERROR` frame with status `4019` (stale connection) restarts the session immediately. `onConnected` runs again on every reconnect, which is how the session re-applies your custom status. A `disconnect()` you call yourself never reconnects; `reconnect()` forces a fresh session on demand.

Epic refuses server heartbeats on this stream (`4005 Invalid heartbeat`), so a silently dead socket cannot be detected from the socket alone. The session covers this through its 30s presence re-send: when Epic answers `user_is_not_effectively_connected`, the session calls `reconnect()` for you.

## In-game custom status
<Badge type="info" text="method" />

```ts
setCustomStatus(status: string, options?: { onlineType?: string; signal?: AbortSignal }): Promise<EosOwnPresence | null>
clearCustomStatus(options?: { signal?: AbortSignal }): Promise<EosOwnPresence | null>
get customStatus(): string | null
```

Publish the friend-facing status text that modern Fortnite renders in-game (the line that otherwise reads *"In the launcher"*). This is **EOS presence**, not XMPP: the status string is sent as `activity.value` on an EOS presence `PATCH` tied to your live connect connection, so `setCustomStatus` opens (or reuses) the connect session for you and the status holds only while that session stays open. `onlineType` accepts `online` (default), `away`, or `xa` (extended away).

Both calls resolve to the presence Epic stored (`own` from the `PATCH` response), so you can confirm the text landed: `presence.perNs[0].activity.value`. The status survives connection loss — it is re-applied on every reconnect, re-sent every 30s, and if Epic reports the connection gone the session reconnects and retries once. `clearCustomStatus` sends an empty `activity` (omitting it would keep the old text); `disconnectEvents` / `logout` also remove it.

```ts
const presence = await session.setCustomStatus('Playing with fnapi-js 🚀');
console.log(presence?.perNs[0]?.activity?.value);
await session.clearCustomStatus();
```

> The XMPP presence path (`session.connectXmpp()` → `XmppClient.setCustomStatus`) still exists for XMPP-only tooling, but Fortnite no longer reads it for the in-game line — use `session.setCustomStatus` (EOS) for anything that must render in-game.

## Types
<Badge type="tip" text="interface" />

```ts
interface ConnectFriendMessage {
  conversationId: string | null;
  accountId: string;
  body: string;
  receivedAt: string;
  raw: Record<string, unknown>;
}

interface ConnectPartyMessage {
  partyId: string | null;
  conversationId: string | null;
  accountId: string;
  body: string;
  receivedAt: string;
  raw: Record<string, unknown>;
}

interface ConnectPresenceUpdate {
  accountId: string;
  payload: Record<string, unknown>;
  receivedAt: string;
}

interface ConnectClientOptions {
  accountId: string;
  getAccessToken: () => string | Promise<string>;
  onConnected?: (connectionId: string) => void | Promise<void>;
  webSocket?: ConnectWebSocketFactory;
  url?: string;
  connectionTimeoutMs?: number;
  autoReconnect?: boolean;
  reconnectInitialDelayMs?: number;
  reconnectMaxDelayMs?: number;
  maxReconnectAttempts?: number;
  debug?: (direction: 'in' | 'out', data: string) => void;
}

interface EosOwnPresence {
  accountId: string;
  status: string;
  perNs: EosPresenceNamespace[];
}

interface EosPresenceNamespace {
  productId?: string;
  appId?: string;
  status: string;
  activity?: { value?: string };
  ns: string;
  props: Record<string, string>;
  conns: Array<{ id: string; props: Record<string, string> }>;
}
```

`CONNECT_WEBSOCKET_URL`, `CONNECT_SUBPROTOCOL`, and `CONNECT_SEC_PROTOCOLS` are exported as constants. The ChatService primitives (`ChatService`, `generateChatKeypair`, `buildSignedMessage`, `decodeMessageBody`, `CHAT_BASE_URL`, `CHAT_MAX_MESSAGE_LENGTH`) are exported for advanced use.

## WebSocket for the connect stream

The connect stream authenticates with an `Authorization` header on the WebSocket upgrade, which browser and Node global `WebSocket` implementations cannot send. When no factory is passed, `ConnectClient` loads the [`ws`](https://www.npmjs.com/package/ws) package on first connect (it is an optional peer dependency — `npm install ws`; discord.js bots already have it). If `ws` cannot be loaded, `connect()` rejects with a `ConfigurationError`.

To supply your own transport (Tauri, Electron renderer bridges, proxies), pass a factory per call or once for every session through the `connectWebSocket` client option. The factory contract is `(url, protocols, options)` where `protocols` is always `undefined` and `options.headers` carries everything the handshake needs — the bearer, `Epic-Connect-Protocol` and the STOMP subprotocol as a `Sec-WebSocket-Protocol` header. Forward `options.headers` and nothing else: Epic never echoes a negotiated subprotocol, so handing one to `ws` as a constructor argument makes it close the socket with "Server sent no subprotocol".

A failure while the handshake is being written — a socket that closed or timed out before its `open` fired — rejects `connect()` (or triggers the normal reconnect once connected) instead of throwing out of the socket's event handler.

```ts
import WebSocket from 'ws';

const epic = new EpicGamesClient({
  connectWebSocket: (url, _protocols, options) =>
    new WebSocket(url, { headers: options?.headers }) as never,
});
```
