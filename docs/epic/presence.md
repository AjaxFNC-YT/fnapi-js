# PresenceManager

Reads **last-online** presence from Epic's presence service, exposed as `client.presence` on `EpicGamesClient` and mirrored with `lastOnline*` convenience methods on a live `EpicAuthSession`. Every method requires a bearer token.

```ts
import { EpicGamesClient } from 'fnapi-js';

const epic = new EpicGamesClient();
const session = await epic.loginWithDeviceAuth(creds);

const entry = await session.lastOnlineFor();
console.log(entry ? `last online ${entry.last_online}` : 'no record');
```

::: tip Namespace
Calls default to the `Fortnite` namespace. Override per-call with `options.namespace`, or construct `new PresenceManager(rest, { namespace })` for a different default.
:::

## presence.lastOnline
<Badge type="info" text="method" />

```ts
lastOnline(accessToken: string, accountId: string, options?: PresenceOptions): Promise<LastOnlineResponse>
```

Returns the raw last-online map for an account — keyed by account id, each value a list of per-namespace entries.

| Parameter | Type | Description |
| --- | --- | --- |
| `accessToken` | `string` | Bearer token. |
| `accountId` | `string` | Account to read. |
| `options.namespace` | `string` | Namespace override (defaults to `Fortnite`). |

**Returns:** `Promise<LastOnlineResponse>` · **Session:** `session.lastOnline(accountId?)` — `accountId` defaults to the signed-in account.

## presence.lastOnlineFor
<Badge type="info" text="method" />

```ts
lastOnlineFor(accessToken: string, accountId: string, options?: PresenceOptions): Promise<LastOnlineEntry | null>
```

Convenience wrapper that pulls the first entry for the requested account out of the map, or `null` when there is none.

**Session:** `session.lastOnlineFor(accountId?)`

## presence.friendsPresence
<Badge type="info" text="method" />

```ts
friendsPresence(accessToken: string, accountId: string, options?: { signal?: AbortSignal }): Promise<FriendPresenceRow[]>
```

Reads the **bulk friends-presence snapshot** — the current presence of every friend in one REST call (`GET /presence/api/v1/_/{accountId}/presence?circle=friends`). The service returns presence grouped into `self` / `friends` circles; this flattens the friends circle into a flat `FriendPresenceRow[]`. Non-array bodies coerce to `[]`.

::: warning Requires a `presence` READ scope
This endpoint needs the `presence:_:{accountId} READ` permission, which the Fortnite game clients (`fortniteAndroid`, `fortniteNewSwitch`, …) are **not** granted — the call returns `403` for them, and `friendPresences()` silently treats that as an empty snapshot. Live friend presence for those clients comes from the EOS connect stream instead (below); this REST snapshot is only useful with a token that actually holds the scope.
:::

**Returns:** `Promise<FriendPresenceRow[]>` · **Session:** `session.friendsPresence(options?)` — always reads the signed-in account.

### session.friendPresences
<Badge type="info" text="method" />

```ts
friendPresences(options?: { signal?: AbortSignal }): Promise<FriendPresence[]>
```

The ergonomic view. Merges three wires — the REST snapshot above, the live EOS connect stream, and the legacy XMPP presence cache — into one normalized `FriendPresence[]`, last-writer-wins by `receivedAt`.

Because the REST snapshot `403`s on the Fortnite clients, the **reliable source is the EOS connect stream** — so connect it first (via [`session.connectEvents()`](./chat) or a [`LiveClient`](./live.md)) and let a moment pass for the initial `presence.v1.UPDATE` frames to arrive. Calling `friendPresences()` cold, before any stream is up, returns an empty list on those clients.

```ts
await session.connectEvents({ webSocket: factory }); // ws-backed factory on Node
await new Promise((r) => setTimeout(r, 3000));        // let presence frames land
for (const p of await session.friendPresences()) {
  console.log(`${p.accountId} — ${p.show ?? 'online'} — ${p.statusText ?? ''}`);
}
```

## Types
<Badge type="tip" text="interface" />

```ts
interface LastOnlineEntry {
  namespace?: string;
  last_online: string;
}

type LastOnlineResponse = Record<string, LastOnlineEntry[]>;

interface PresenceOptions {
  namespace?: string;
  signal?: AbortSignal;
}

interface FriendPresenceRow {
  accountId: string;
  status?: string;
  perNs?: unknown[];
  [key: string]: unknown;
}

interface PresenceCircle {
  circle?: string;
  presences?: FriendPresenceRow[];
}
```

`last_online` is an ISO timestamp. `PRESENCE_BASE_URL` and `PRESENCE_NAMESPACE` are exported for advanced use.
