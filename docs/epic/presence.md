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

Reads the **bulk friends-presence snapshot** — the current presence of every friend in one REST call (`GET /presence/api/v1/_/friends/{accountId}`). Non-array bodies coerce to `[]`.

**Returns:** `Promise<FriendPresenceRow[]>` · **Session:** `session.friendsPresence(options?)` — always reads the signed-in account.

### session.friendPresences
<Badge type="info" text="method" />

```ts
friendPresences(options?: { signal?: AbortSignal }): Promise<FriendPresence[]>
```

The ergonomic view. Merges three wires — the REST snapshot above, the live EOS connect stream, and the legacy XMPP presence cache — into one normalized `FriendPresence[]`, last-writer-wins by `receivedAt`. It returns immediately from the REST snapshot even before a realtime socket is connected, and live streams (when a [`LiveClient`](./live.md) is running) refine it as updates arrive.

```ts
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
  namespace?: string;
  lastOnline?: string;
  status?: string;
  activity?: unknown;
  props?: Record<string, unknown>;
  [key: string]: unknown;
}
```

`last_online` is an ISO timestamp. `PRESENCE_BASE_URL` and `PRESENCE_NAMESPACE` are exported for advanced use.
