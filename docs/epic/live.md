# Live Bot (events)

`session.live()` returns a `LiveClient` — one event-driven object that turns Epic's raw realtime notifications into typed, named events and keeps a self-refreshing view of your party and friends.

Under the hood it wires **both** realtime transports for you:

- **XMPP** carries party and friendship **notifications** (invites, member joins, new captains, incoming friend requests, removals). `LiveClient` decodes each `com.epicgames.social.party.notification.v0.*` / `com.epicgames.friends.core.apiobjects.Friend` body into a typed event.
- **EOS connect** (STOMP) carries **chat and presence** — those are already decoded by [`ConnectClient`](/epic/chat) and re-emitted here as `friend:message`, `party:message` and `presence`.

You never hand-parse a notification string, and accept/decline live directly on the event object.

```ts
import { EpicGamesClient } from 'fnapi-js';

const epic = new EpicGamesClient();
const session = await epic.loginWithDeviceAuth(creds);

const bot = await session.live();

bot.on('friend:request', (request) => {
  console.log(`friend request from ${request.accountId}`);
  void request.accept();
});

bot.on('party:invite', (invite) => {
  console.log(`party invite from ${invite.fromId}`);
  void invite.accept();
});

bot.on('party:member:joined', (event) => {
  console.log(`${event.accountId} joined — party now has ${event.party?.members.length} members`);
});
```

## session.live
<Badge type="info" text="method" />

```ts
live(options?: LiveClientOptions): Promise<LiveClient>
```

Lazily creates the `LiveClient`, connects XMPP + the connect stream, seeds `bot.party` / `bot.friends`, and caches it on the session — a second `session.live()` returns the same instance. `session.liveClient` is the current client (or `null`), and `session.disconnectLive()` clears it and closes both transports. `session.logout()` tears it down automatically.

```ts
interface LiveClientOptions {
  xmpp?: Partial<XmppClientOptions>;      // minus accountId / getAccessToken
  connect?: Partial<ConnectClientOptions>; // minus accountId / getAccessToken
  seedParty?: boolean;                     // default true — fetch current party on start
  seedFriends?: boolean;                   // default true — fetch friends list on start
}
```

## LiveClient
<Badge type="tip" text="class" />

A `TypedEmitter` over `LiveEventMap`. Register listeners with `on` / `once` / `off`; `removeAllListeners()` clears your listeners (the internal transport wiring lives on the XMPP/connect channels, so it stays intact).

### Live state

| Member | Type | Description |
| --- | --- | --- |
| `party` | `Party \| null` | Your current party, re-fetched on every party notification and cleared when you leave or it disbands. |
| `friends` | `ReadonlyMap<string, ResolvedFriendEntry>` | Live friend cache, seeded from the friends list and mutated on `friend:added` / `friend:removed`. |
| `pendingInvites` | `ReadonlyMap<string, PartyInviteEvent>` | Party invites seen this session, keyed by sender account id. |
| `incomingRequests` | `ReadonlyMap<string, FriendRequestEvent>` | Inbound friend requests seen this session, keyed by account id. |

### Methods

| Method | Description |
| --- | --- |
| `start()` | Connect + seed. Called for you by `session.live()`; idempotent. |
| `refreshParty()` | Force a re-fetch of the current party. |
| `refreshFriends()` | Rebuild the friend cache from the friends list. |
| `createParty(config?)` | Create a fresh party and set it as `bot.party`. |
| `leaveParty()` | Leave the current party and clear `bot.party`. |
| `joinParty(partyId)` | Join a party by id. |
| `joinFriend(accountId)` | Join a friend by reading their presence `join_info`. |
| `acceptInvite(invite \| fromId)` | Accept a pending invite (also on the event's `accept()`). |
| `declineInvite(invite \| fromId)` | Decline a pending invite (also on the event's `decline()`). |

`createParty` / `joinParty` need a live XMPP JID (they fill `join_info.connection.id` from `session.xmpp.jid`), which is why they live on the client, not the stateless [`PartyClient`](/epic/party#partyclient).

## Events
<Badge type="tip" text="emitter" />

| Event | Payload | Fired when |
| --- | --- | --- |
| `connected` | `void` | Both transports are up and state is seeded. |
| `disconnected` | `{ code, reason }` | The XMPP socket closes. |
| `error` | `Error` | A non-fatal client/transport error. |
| `notification` | `DecodedNotification` | Every decoded XMPP notification (before the specific event). |
| `party:invite` | `PartyInviteEvent` | Someone invites/pings you into their party. |
| `party:invite:declined` | `PartyInviteDeclinedEvent` | An invite you sent was declined. |
| `party:join:request` | `PartyJoinRequestEvent` | Someone asks to join your party (needs confirmation). |
| `party:member:joined` | `PartyMemberEvent` | A member joins your party. |
| `party:member:left` | `PartyMemberEvent` | A member leaves. |
| `party:member:expired` | `PartyMemberEvent` | A member's connection expires. |
| `party:member:kicked` | `PartyMemberEvent` | A member is kicked. |
| `party:member:connected` | `PartyMemberEvent` | A member's connection comes online. |
| `party:member:disconnected` | `PartyMemberEvent` | A member's connection drops. |
| `party:member:updated` | `PartyMemberEvent` | A member's meta changes. |
| `party:member:promoted` | `PartyMemberEvent` | A member becomes captain. |
| `party:member:confirmation` | `PartyMemberEvent` | A member requires confirmation. |
| `party:updated` | `PartyUpdatedEvent` | The party meta/config changes. |
| `party:disbanded` | `{ partyId }` | You left or were kicked and the party view is cleared. |
| `friend:request` | `FriendRequestEvent` | An inbound (or outbound) friend request. |
| `friend:added` | `FriendAddedEvent` | A friend request is accepted. |
| `friend:removed` | `FriendRemovedEvent` | A friendship is removed/rejected/aborted. |
| `friend:message` | `ConnectFriendMessage` | A DM arrives (via the connect stream). |
| `party:message` | `ConnectPartyMessage` | A party chat message arrives. |
| `presence` | `ConnectPresenceUpdate` | A friend's presence changes. |

Every `party:member:*` and `party:updated` payload carries the freshly re-fetched `party`, so you can read `event.party?.members` without a manual refresh.

## Accept / decline ergonomics

The accept/decline handlers hang off the event object, so a bot can act without threading tokens or ids back through a call:

```ts
bot.on('friend:request', async (request) => {
  if (request.direction === 'INBOUND') await request.accept(); // else request.decline()
});

bot.on('party:invite', async (invite) => {
  const party = await invite.accept();  // joins and returns the Party
  await party?.me?.fakeReady(true);
});

bot.on('party:join:request', async (request) => {
  await request.confirm();               // or request.reject()
});
```

You can also drive them from the lookup maps later:

```ts
for (const request of bot.incomingRequests.values()) await request.accept();
await bot.acceptInvite('a1b2c3…');       // by sender account id
```

## Types
<Badge type="tip" text="interface" />

```ts
interface FriendRequestEvent {
  accountId: string;
  displayName?: string;
  direction: 'INBOUND' | 'OUTBOUND';
  favorite: boolean;
  created: string | null;
  accept(): Promise<void>;
  decline(): Promise<void>;
  raw: RawNotification;
}

interface PartyInviteEvent {
  fromId: string;
  accept(): Promise<Party | null>;
  decline(): Promise<void>;
  raw: RawNotification;
}

interface PartyJoinRequestEvent {
  partyId: string;
  requesterId: string;
  confirm(): Promise<void>;
  reject(): Promise<void>;
  raw: RawNotification;
}

interface PartyMemberEvent {
  partyId: string;
  accountId: string;
  party: Party | null;
  raw: RawNotification;
}
```

`decodeNotification(body)`, the notification-type constants (`PARTY_NOTIFICATION_PREFIX`, `FRIEND_NOTIFICATION_TYPE`, `FRIENDSHIP_REMOVE_TYPE`) and the `DecodedNotification` union are exported for advanced use.

## Node without a global WebSocket

`LiveClient` connects the same [`XmppClient`](/epic/xmpp) and [`ConnectClient`](/epic/chat) a session builds, so it inherits their injectable WebSocket factories. On Node without a `WebSocket` global, pass one backed by [`ws`](https://www.npmjs.com/package/ws) through `options.connect` / `options.xmpp`. As with the connect stream, do **not** forward the `protocols` argument to `ws`:

```ts
import WebSocket from 'ws';

const factory = (url, _protocols, options) =>
  new WebSocket(url, { headers: options?.headers }) as never;

const bot = await session.live({
  connect: { webSocket: factory },
  xmpp: { webSocket: factory },
});
```
