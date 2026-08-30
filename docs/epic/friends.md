# FriendsManager

Manage an account's Epic **friends list**, incoming/outgoing requests, per-friend nicknames and notes, and the blocklist over the friends service. Exposed as `client.friends` on `EpicGamesClient`, and mirrored with account-scoped convenience methods on a live `EpicAuthSession`. Every method requires a bearer token and the account id whose friends list is being read or changed.

```ts
import { EpicGamesClient } from 'fnapi-js';

const epic = new EpicGamesClient();
const session = await epic.loginWithDeviceAuth(creds);

const summary = await session.friendsSummary();
console.log(`${summary.friends.length} friends, ${summary.incoming.length} incoming`);

const friends = await session.friendsListResolved();
for (const friend of friends) {
  console.log(`${friend.displayName ?? friend.accountId}${friend.nickname ? ` "${friend.nickname}"` : ''}`);
}

await session.addFriend(targetAccountId);
await session.setFriendNickname(targetAccountId, 'best pal');
```

::: tip Session convenience methods
On an `EpicAuthSession` the account id is filled in from the signed-in account, so you call `session.friendsList()` instead of `client.friends.list(accessToken, accountId)`. Both are listed below.
:::

::: info nickname vs the wire `alias`
Epic's friends service calls this field `alias` on the wire (endpoint `.../friends/:id/alias`). The SDK normalizes it to `nickname` on every entry it returns and accepts `nickname` on writes, so you only ever deal with `nickname`.
:::

## friends.summary
<Badge type="info" text="method" />

```ts
summary(accessToken: string, accountId: string, options?: { signal?: AbortSignal }): Promise<FriendsSummary>
```

Fetches the full friends snapshot in one request — friends, incoming, outgoing, suggested, blocklist, settings, and which limits have been reached.

| Parameter | Type | Description |
| --- | --- | --- |
| `accessToken` | `string` | Bearer token. |
| `accountId` | `string` | The account whose summary to read. |
| `options` | `{ signal?: AbortSignal }` | Optional abort signal. |

**Returns:** `Promise<FriendsSummary>` · **Session:** `session.friendsSummary()`

## friends.list
<Badge type="info" text="method" />

```ts
list(accessToken: string, accountId: string, options?: { signal?: AbortSignal }): Promise<FriendEntry[]>
```

Lists accepted friends. **Session:** `session.friendsList()`

## friends.listResolved / friends.resolveEntries
<Badge type="info" text="method" />

```ts
listResolved(accessToken: string, accountId: string, options?: { signal?: AbortSignal }): Promise<ResolvedFriendEntry[]>
resolveEntries(accessToken: string, entries: FriendEntry[], options?: { signal?: AbortSignal }): Promise<ResolvedFriendEntry[]>
```

Fetch (or take) friend entries and resolve every `accountId` to its Epic display name in one batched account lookup, returning `ResolvedFriendEntry[]` with `displayName` and the full `account` attached. `resolveEntries` reuses a list you already have; `listResolved` fetches the friends list first. Account ids are deduped and chunked by 100 automatically.

Both require the `FriendsManager` to be wired with an `AccountManager`. `client.friends` already is; a hand-built `new FriendsManager(rest)` without one throws `ConfigurationError`. **Session:** `session.friendsListResolved()`, `session.resolveFriends(entries)`.

## friends.incoming / friends.outgoing / friends.suggested
<Badge type="info" text="method" />

```ts
incoming(accessToken, accountId, options?): Promise<FriendEntry[]>
outgoing(accessToken, accountId, options?): Promise<FriendEntry[]>
suggested(accessToken, accountId, options?): Promise<FriendEntry[]>
```

Pending incoming requests, pending outgoing requests, and suggested friends. **Session:** `session.incomingFriendRequests()`, `session.outgoingFriendRequests()`, `session.suggestedFriends()`.

## friends.acceptBulk
<Badge type="info" text="method" />

```ts
acceptBulk(accessToken: string, accountId: string, targetIds: string[], options?: { signal?: AbortSignal }): Promise<string[]>
```

Accepts several incoming requests at once. The ids are sent as a single comma-joined `targetIds` query param; the returned array holds the ids that were accepted.

| Parameter | Type | Description |
| --- | --- | --- |
| `targetIds` | `string[]` | Account ids to accept. Must be non-empty. |

**Returns:** `Promise<string[]>` · **Session:** `session.acceptFriendRequests(targetIds)`

::: tip Note
Throws `ValidationError` when `targetIds` is empty.
:::

## friends.clearAll
<Badge type="info" text="method" />

```ts
clearAll(accessToken: string, accountId: string, options?: { signal?: AbortSignal }): Promise<void>
```

Removes **all** friends. **Session:** `session.clearFriends()`

## friends.get
<Badge type="info" text="method" />

```ts
get(accessToken: string, accountId: string, friendId: string, options?: { signal?: AbortSignal }): Promise<FriendEntry>
```

Fetches a single friendship, including its `nickname`, `note`, `mutual` count, and `created` timestamp. **Session:** `session.friend(friendId)`

## friends.add
<Badge type="info" text="method" />

```ts
add(accessToken: string, accountId: string, friendId: string, options?: FriendAddOptions): Promise<void>
```

Sends a friend request (or accepts a pending one from `friendId`). Pass `{ pin }` only when a parental-controls PIN is required — it is sent as a JSON body; without it the request has no body.

| Parameter | Type | Description |
| --- | --- | --- |
| `friendId` | `string` | The account to add. |
| `options.pin` | `string` | Optional parental-controls PIN. |

**Session:** `session.addFriend(friendId, { pin? })`

## friends.remove
<Badge type="info" text="method" />

```ts
remove(accessToken: string, accountId: string, friendId: string, options?: { signal?: AbortSignal }): Promise<void>
```

Removes a friend, or cancels/declines a pending request. **Session:** `session.removeFriend(friendId)`

## friends.mutual
<Badge type="info" text="method" />

```ts
mutual(accessToken: string, accountId: string, friendId: string, options?: { signal?: AbortSignal }): Promise<string[]>
```

Returns the account ids you and `friendId` have in common. **Session:** `session.mutualFriends(friendId)`

## friends.setNickname / friends.setNote
<Badge type="info" text="method" />

```ts
setNickname(accessToken, accountId, friendId, nickname: string, options?): Promise<void>
setNote(accessToken, accountId, friendId, note: string, options?): Promise<void>
```

Set a private per-friend nickname or note. Both send the value as a `text/plain` body. **Session:** `session.setFriendNickname(friendId, nickname)`, `session.setFriendNote(friendId, note)`.

::: warning text/plain body
Nickname and note are written with a raw `text/plain` request body — not JSON. A blank nickname/note throws `ValidationError`; use `removeNickname` / `removeNote` to clear one.
:::

## friends.removeNickname / friends.removeNote
<Badge type="info" text="method" />

```ts
removeNickname(accessToken, accountId, friendId, options?): Promise<void>
removeNote(accessToken, accountId, friendId, options?): Promise<void>
```

Clear the nickname or note. **Session:** `session.removeFriendNickname(friendId)`, `session.removeFriendNote(friendId)`.

## friends.blocklist
<Badge type="info" text="method" />

```ts
blocklist(accessToken: string, accountId: string, options?: { signal?: AbortSignal }): Promise<BlocklistEntry[]>
```

Lists blocked accounts. **Session:** `session.blocklist()`

## friends.block / friends.unblock
<Badge type="info" text="method" />

```ts
block(accessToken, accountId, userId: string, options?): Promise<void>
unblock(accessToken, accountId, userId: string, options?): Promise<void>
```

Block or unblock an account. **Session:** `session.blockAccount(userId)`, `session.unblockAccount(userId)`.

## FriendsSummary
<Badge type="tip" text="interface" />

```ts
interface FriendsSummary {
  friends: FriendEntry[];
  incoming: FriendEntry[];
  outgoing: FriendEntry[];
  suggested: FriendEntry[];
  blocklist: BlocklistEntry[];
  settings: FriendSettings;
  limitsReached: FriendsLimitsReached;
}
```

## FriendEntry
<Badge type="tip" text="interface" />

```ts
interface FriendEntry {
  accountId: string;
  groups?: string[];
  mutual?: number;
  nickname?: string;
  note?: string;
  favorite?: boolean;
  created?: string;
}
```

A single friendship. `nickname` and `note` are private to you; `mutual` is the shared-friend count; `created` is an ISO timestamp.

## ResolvedFriendEntry
<Badge type="tip" text="interface" />

```ts
interface ResolvedFriendEntry extends FriendEntry {
  displayName?: string;
  account?: EpicAccount;
}
```

A `FriendEntry` with the account's current `displayName` and full `account` attached, as returned by `listResolved` / `resolveEntries`. Both stay `undefined` when the account id could not be resolved.

## BlocklistEntry
<Badge type="tip" text="interface" />

```ts
interface BlocklistEntry { accountId: string; created: string; }
```

## FriendSettings / FriendsLimitsReached / FriendAddOptions
<Badge type="tip" text="interface" />

```ts
interface FriendSettings { acceptInvites?: string; mutualPrivacy?: string; }
interface FriendsLimitsReached { incoming: boolean; outgoing: boolean; accepted: boolean; }
interface FriendAddOptions { pin?: string; signal?: AbortSignal; }
```
