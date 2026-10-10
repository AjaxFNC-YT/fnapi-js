# XmppClient (Real-time Presence & Chat)

Epic's social layer runs over **XMPP-on-WebSocket** (`wss://xmpp-service-prod.ol.epicgames.com`). `XmppClient` is a zero-dependency client for that stream: it performs the full SASL handshake, keeps the connection alive, and exposes a typed event emitter for friend **presence**, incoming **chat messages**, and your own XMPP **custom status**.

::: warning In-game status is EOS, not XMPP
Modern Fortnite no longer reads XMPP presence for the **in-game** status line — that comes from EOS presence. To set the status that renders in-game, use [`session.setCustomStatus`](/epic/chat#in-game-custom-status). The XMPP status methods below still publish over XMPP (useful for XMPP-only tooling and receiving friend presence), but do not change the in-game line.
:::

It is reached through a live [`EpicAuthSession`](/epic/session) — `session.connectXmpp()` builds and connects one lazily, wiring token refresh in automatically — or constructed directly with an `accountId` and a `getAccessToken` function. The class is fully standalone and takes an injectable WebSocket factory, so it runs anywhere a `WebSocket` global exists (Node 18+, browsers) or wherever you pass a `ws`-backed factory.

```ts
import { EpicGamesClient } from 'fnapi-js';

const epic = new EpicGamesClient();
const session = await epic.loginWithDeviceAuth(creds);

const xmpp = await session.connectXmpp();
console.log('online as', xmpp.jid);

xmpp.on('presence', (presence) => {
  console.log(presence.accountId, presence.available ? 'online' : 'offline', presence.status?.Status ?? '');
});

xmpp.on('message', (message) => {
  console.log(`${message.accountId}: ${message.body}`);
});

xmpp.setCustomStatus('Playing with fnapi-js');
```

## Session helpers

A few XMPP operations are surfaced directly on `EpicAuthSession` so you rarely touch the client by hand. Each one connects on demand.

| Method | Description |
| --- | --- |
| `session.connectXmpp(options?)` | Connect (or reuse) the XMPP client and return it. |
| `session.disconnectXmpp()` | Close the stream and drop the client. |
| `session.friendPresences()` | Connect if needed and return the cached `FriendPresence[]`. |
| `session.xmpp` | The current `XmppClient` or `null` (no connect). |

`session.logout()` disconnects the XMPP stream before killing the token.

::: tip Setting status
The session no longer wraps the XMPP status setters. To change the **in-game** status line, use [`session.setCustomStatus`](/epic/chat#in-game-custom-status) (EOS presence). To publish an XMPP-only status, connect with `session.connectXmpp()` and call the client methods below (`setCustomStatus`, `setStatus`, `showStatusWhenOffline`, `setAway`, `clearStatus`) directly on the returned `XmppClient`.
:::

## connect
<Badge type="info" text="method" />

```ts
connect(): Promise<void>
```

Opens the WebSocket and drives the RFC 7395 framing handshake: `<open/>` → SASL `PLAIN` auth → stream restart → resource bind → optional session → initial presence. Resolves once the session is bound and the first presence has been sent; rejects (with a `ConfigurationError`) on auth failure, timeout, or an early close. Calling it while already connected is a no-op; concurrent calls share one promise.

## disconnect
<Badge type="info" text="method" />

```ts
disconnect(): Promise<void>
```

Sends an `unavailable` presence and a `<close/>`, then closes the socket. Emits `disconnected`. A `disconnect()` you call yourself is treated as intentional — it never triggers an auto-reconnect.

## Auto-reconnect

Once the session has connected at least once, an **unexpected** stream drop (Epic idle timeout, network blip, token expiry) is recovered automatically: the client waits, reconnects, refreshes the access token via `getAccessToken`, replays the last status you set (including the `away`/`show` indicator and, if you opted in, the persist `<delay>`), and resumes keepalive. It emits a `reconnecting` event before each attempt and a fresh `connected` event once the session is rebound.

| Option | Default | Description |
| --- | --- | --- |
| `autoReconnect` | `true` | Reconnect after an unexpected drop. Set `false` to disable. |
| `reconnectInitialDelayMs` | `1000` | Delay before the first retry; doubles each attempt (exponential backoff). |
| `reconnectMaxDelayMs` | `30000` | Upper bound on the backoff delay. |
| `maxReconnectAttempts` | `0` | Cap on consecutive attempts (`0` = unlimited). Emits `error` when exhausted. |

A keepalive watchdog also catches half-open connections (laptop sleep, Wi-Fi switch, NAT timeout) that never fire a `close` event: if nothing — not even a ping reply — arrives for two `pingIntervalMs` windows, the socket is dropped with code `4000` and the normal reconnect runs. Call `reconnect()` to force a fresh session yourself.

Only unexpected drops reconnect — a `disconnect()` you call yourself does not, and the very first `connect()` still rejects on failure so you can handle initial errors directly. Backoff resets to zero on every successful reconnect. There is **no** periodic re-broadcast: the status is only ever (re)sent on connect, so it is refreshed on every reconnect.

```ts
const xmpp = await session.connectXmpp({ reconnectMaxDelayMs: 10_000 });
xmpp.on('reconnecting', ({ attempt, delay }) => {
  console.log(`reconnect #${attempt} in ${delay}ms`);
});
```

## setStatus
<Badge type="info" text="method" />

```ts
setStatus(input?: SetStatusInput): void
```

Publishes a presence stanza. Fields are merged over the last sent status, so `setStatus({ joinable: true })` keeps your existing status text and playing flag. Pass `online: false` to broadcast `unavailable`, or `raw` to send a fully-formed `FortniteStatus` verbatim.

| Field | Type | Description |
| --- | --- | --- |
| `status` | `string` | Visible status line. |
| `online` | `boolean` | `false` sends `unavailable` (truly offline, no status shown). |
| `away` | `AwayStatus` | Online indicator: `online` (no `<show>`), `away`, or `extended` (`xa`). |
| `show` | `PresenceShow` | Raw `<show>` value (`chat` / `away` / `xa` / `dnd`); overrides `away` if both are set. |
| `playing` | `boolean` | Sets `bIsPlaying` (only added to the payload when you pass it). |
| `joinable` | `boolean` | Sets `bIsJoinable` (only added when you pass it). |
| `voice` | `boolean` | Sets `bHasVoiceSupport` (only added when you pass it). |
| `sessionId` | `string` | Game session id for joins. |
| `productName` | `string` | Advertised product (only added when you pass it). |
| `properties` | `Record<string, unknown>` | Extra presence properties. |
| `raw` | `FortniteStatus` | Send this status object verbatim. |
| `to` | `string` | Direct the presence to a single account id / JID instead of broadcasting. |
| `persistWhileOffline` | `boolean` | Attach a far-future `<delay>` (**off by default**) to keep the status showing after you disconnect. Leave it off for a normal live status. |
| `delayStamp` | `string` | Override the persist timestamp (defaults to `PRESENCE_OFFLINE_PERSIST_STAMP`). |

### Online, away, and offline

Epic's XMPP presence has two independent knobs:

- **The online indicator** — the `<show>` element. `away: 'online'` sends no `<show>` (the green "online" dot), `away: 'away'` sends `<show>away</show>` (idle), `away: 'extended'` sends `<show>xa</show>`. `online: false` is different: it sends `unavailable`, which takes you **truly offline** and shows no status at all.
- **Persistence** — whether the status survives a disconnect (see below).

### The status payload

A plain custom status serializes to the **minimal** `{"Status": "your text"}` — nothing else is injected. This matters: adding `bIsPlaying` / `ProductName` without the full Fortnite `Properties` block makes the payload look like a rich Fortnite presence that fails to parse, which drops you to **offline** in-game. The extra fields (`playing`, `joinable`, `voice`, `sessionId`, `productName`, `properties`) are only serialized when you explicitly pass them, so opt in only if you are building a complete rich presence.

### Directed presence

Set `to` to send the update to one friend only — useful for revealing a status to a specific account without broadcasting it to your whole friends list.

### The `<delay>` element (off by default)

A normal presence — just `<status>` (plus an optional `<show>`) with **no** `<delay>` — is what Epic renders as your live status line while you are connected. This matches how the working reference clients (e.g. rebootpy) send presence, and is the default here.

An [XEP-0203](https://xmpp.org/extensions/xep-0203.html) `<delay>` element marks a presence as *delayed / last-known* delivery. Stamping it in the far future (`9999-12-31T23:59:59.999Z`) is a trick to keep the status pinned to friends after you disconnect. It is **opt-in** because a delayed presence is easily treated as a stale echo and dropped — attaching it by default is exactly what stops the live status from showing.

- `setCustomStatus(text)` → normal live status; shows while online, clears when you disconnect (no `<delay>`).
- `setCustomStatus(text, { persistWhileOffline: true })` → also attach the far-future `<delay>` to keep it visible after disconnect.
- `showStatusWhenOffline(text)` → explicit alias for the `persistWhileOffline: true` behavior.
- `clearStatus()` → blanks the status so friends stop seeing it.

## setCustomStatus / showStatusWhenOffline / setAway / clearStatus / goOnline / goOffline
<Badge type="info" text="method" />

```ts
setCustomStatus(status: string, options?: CustomStatusOptions): void
showStatusWhenOffline(status: string, options?: Omit<CustomStatusOptions, 'persistWhileOffline'>): void
setAway(away: AwayStatus, status?: string): void
clearStatus(): void
goOnline(): void
goOffline(): void
```

Convenience wrappers over `setStatus`. `setCustomStatus` sets the live status line — shown while online, cleared on disconnect — and accepts `away`, `show`, `to`, `persistWhileOffline`, and `delayStamp` (pass `persistWhileOffline: true` to keep it showing after you disconnect); `showStatusWhenOffline` is an explicit alias for that persisted behavior; `setAway` flips the online indicator (`online` / `away` / `extended`), optionally with new status text; `clearStatus` blanks the line and clears the playing/joinable flags; `goOnline`/`goOffline` toggle availability.

```ts
xmpp.setCustomStatus('In a match', { away: 'away' });
xmpp.showStatusWhenOffline('Back later ✌️');
xmpp.setAway('extended', 'AFK');
xmpp.clearStatus();
```

## sendMessage
<Badge type="info" text="method" />

```ts
sendMessage(accountId: string, body: string): void
```

Sends a direct chat message. `accountId` may be a bare id (the domain is appended) or a full JID.

## requestPresence / ping
<Badge type="info" text="method" />

```ts
requestPresence(accountId: string): void
ping(): void
```

`requestPresence` probes a specific friend's presence. `ping` sends a XEP-0199 keepalive; the client already pings on an interval (default 60s) while connected.

## getPresence / presences
<Badge type="info" text="method" />

```ts
getPresence(accountId: string): FriendPresence | null
get presences(): ReadonlyMap<string, FriendPresence>
```

The client caches the latest presence per friend. `presences` is the live cache keyed by account id; `unavailable` friends are removed. The cache clears when the connection closes.

## Events
<Badge type="tip" text="emitter" />

`on` / `once` / `off` register typed listeners.

| Event | Payload | Fired when |
| --- | --- | --- |
| `connected` | `void` | The session is bound and ready. |
| `disconnected` | `{ code, reason }` | The stream closes. |
| `reconnecting` | `{ attempt, delay }` | An auto-reconnect is scheduled after an unexpected drop. |
| `presence` | `FriendPresence` | A friend's presence changes. |
| `message` | `XmppMessage` | A chat message arrives. |
| `stanza` | `XmlNode` | Any parsed stanza (advanced). |
| `raw` | `{ direction, data }` | Every frame in/out (debugging). |
| `error` | `Error` | A non-fatal client error. |

## Types
<Badge type="tip" text="interface" />

```ts
type PresenceShow = 'chat' | 'away' | 'xa' | 'dnd';

type AwayStatus = 'online' | 'away' | 'extended';

type XmppState =
  | 'idle' | 'connecting' | 'authenticating'
  | 'binding' | 'connected' | 'closing' | 'closed';

interface FortniteStatus {
  Status?: string;
  bIsPlaying?: boolean;
  bIsJoinable?: boolean;
  bHasVoiceSupport?: boolean;
  SessionId?: string;
  ProductName?: string;
  Properties?: Record<string, unknown>;
  [key: string]: unknown;
}

interface FriendPresence {
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

interface XmppMessage {
  id: string | null;
  from: string;
  accountId: string;
  type: string;
  body: string;
  receivedAt: string;
}

interface SetStatusInput {
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

interface CustomStatusOptions {
  away?: AwayStatus;
  show?: PresenceShow;
  to?: string;
  persistWhileOffline?: boolean;
  delayStamp?: string;
}

interface XmppClientOptions {
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
```

`XMPP_WEBSOCKET_URL`, `XMPP_DOMAIN`, `XMPP_SUBPROTOCOL`, `XMPP_DEFAULT_APP`, `XMPP_DEFAULT_PLATFORM`, and `PRESENCE_OFFLINE_PERSIST_STAMP` are exported as constants. The low-level stanza helpers (`buildStanza`, `parseStanza`, `findChild`, `findChildren`, `localName`, `escapeXml`, `unescapeXml`) are exported too for advanced stream work.

## Node without a global WebSocket

Node 18–20 without the `--experimental-websocket` flag has no `WebSocket` global. Pass a factory backed by the [`ws`](https://www.npmjs.com/package/ws) package:

```ts
import WebSocket from 'ws';

const xmpp = await session.connectXmpp({
  webSocket: (url, protocols) => new WebSocket(url, protocols) as never,
});
```
