# EpicAuthSession

An authenticated session wrapping an `OAuthToken` and its `AuthClient`. Returned by every `EpicGamesClient.loginWith*` helper. Exposes token metadata as getters, self-refresh logic, and account/device-auth operations that automatically apply the session's access token. Account-scoped methods throw `ValidationError` when the session has no bound account (e.g. a `client_credentials` session).

## accessToken
<Badge type="info" text="getter" />

```ts
get accessToken(): string
```

The current access token string.

**Returns:** `string`

## accountId
<Badge type="info" text="getter" />

```ts
get accountId(): string | null
```

The bound account id, or `null` for app-scoped (`client_credentials`) sessions.

**Returns:** `string | null`

## displayName
<Badge type="info" text="getter" />

```ts
get displayName(): string | null
```

The account display name from the token, or `null` if absent.

**Returns:** `string | null`

## expiresAt
<Badge type="info" text="getter" />

```ts
get expiresAt(): Date
```

Absolute expiry of the access token as a `Date`.

**Returns:** `Date`

## expiresInMs
<Badge type="info" text="getter" />

```ts
get expiresInMs(): number
```

Milliseconds until the access token expires (negative once expired).

**Returns:** `number`

## isExpired
<Badge type="info" text="getter" />

```ts
get isExpired(): boolean
```

`true` once the access token has expired.

**Returns:** `boolean`

## canRefresh
<Badge type="info" text="getter" />

```ts
get canRefresh(): boolean
```

`true` when the token carries a refresh token, i.e. `refresh()`/`ensureValid()` can renew it.

**Returns:** `boolean`

## token
<Badge type="info" text="getter" />

```ts
get token(): OAuthToken
```

The raw underlying `OAuthToken` (useful for persistence). Also note the sibling getter `refreshTokenValue: string | null`.

**Returns:** `OAuthToken`

## client
<Badge type="info" text="getter" />

```ts
readonly client: AuthClient
```

The `AuthClient` this session is bound to. Read-only property (not a getter).

**Returns:** `AuthClient`

## refresh
<Badge type="info" text="method" />

```ts
refresh(options?: TokenRequestOptions): Promise<OAuthToken>
```

Renews the token using its refresh token and stores the result on the session. Throws `ValidationError` if the session has no refresh token.

**Returns:** `Promise<OAuthToken> (the new token)`

```ts
if (session.canRefresh) await session.refresh();
```

## ensureValid
<Badge type="info" text="method" />

```ts
ensureValid(options?: TokenRequestOptions): Promise<string>
```

Returns a valid access token, transparently refreshing first when it is within ~15s of expiry and a refresh token is available. The preferred way to obtain a token before a call.

**Returns:** `Promise<string> access token`

```ts
const token = await session.ensureValid();
```

## verify
<Badge type="info" text="method" />

```ts
verify(options?: { includePerms?: boolean; signal?: AbortSignal }): Promise<VerifyResponse>
```

Verifies the session's current access token via the account service.

**Returns:** `Promise<VerifyResponse>`

```ts
const info = await session.verify({ includePerms: true });
```

## createExchangeCode
<Badge type="info" text="method" />

```ts
createExchangeCode(options?: ExchangeCodeOptions): Promise<ExchangeCode>
```

Mints an exchange code from this session's access token.

**Returns:** `Promise<ExchangeCode>`

```ts
const exchange = await session.createExchangeCode();
```

## switchClient
<Badge type="info" text="method" />

```ts
switchClient(toClient: AuthClientInput, options?: TokenRequestOptions & { codeChallenge?: string; codeChallengeMethod?: 'S256' | 'plain' }): Promise<EpicAuthSession>
```

Returns a new session on `toClient` by performing the exchange-code dance: creates an exchange code scoped to the target client, then redeems it against that client. Supports optional PKCE.

**Returns:** `Promise<EpicAuthSession> on the target client`

```ts
const android = await session.switchClient('fortniteAndroid');
const deviceAuth = await android.createDeviceAuth();
```

## me
<Badge type="info" text="method" />

```ts
me(options?: { signal?: AbortSignal }): Promise<EpicAccount>
```

Fetches the account bound to this session. Throws `ValidationError` if the session is not account-bound.

**Returns:** `Promise<EpicAccount>`

```ts
const account = await session.me();
```

## account
<Badge type="info" text="method" />

```ts
account(accountId: string, options?: { signal?: AbortSignal }): Promise<EpicAccount>
```

Fetches any account by id using this session's token.

**Returns:** `Promise<EpicAccount>`

```ts
const other = await session.account('0123456789abcdef');
```

## accountsByIds
<Badge type="info" text="method" />

```ts
accountsByIds(accountIds: string[], options?: { signal?: AbortSignal }): Promise<EpicAccount[]>
```

Batch-fetches multiple accounts by id.

**Returns:** `Promise<EpicAccount[]>`

```ts
const accounts = await session.accountsByIds([id1, id2, id3]);
```

## accountByDisplayName
<Badge type="info" text="method" />

```ts
accountByDisplayName(displayName: string, options?: { signal?: AbortSignal }): Promise<EpicAccount>
```

Looks up an account by its display name.

**Returns:** `Promise<EpicAccount>`

```ts
const account = await session.accountByDisplayName('Ninja');
```

## resolveAccounts / resolveAccountNames
<Badge type="info" text="method" />

```ts
resolveAccounts(accountIds: string[], options?: { signal?: AbortSignal }): Promise<Map<string, EpicAccount>>
resolveAccountNames(accountIds: string[], options?: { signal?: AbortSignal }): Promise<Map<string, string>>
```

Resolve any number of account ids into a `Map` keyed by id — full [`EpicAccount`](/epic/account-manager) objects, or just display names. Ids are deduped and chunked by 100 automatically. See [`AccountManager.resolveAccounts`](/epic/account-manager#accounts-resolveaccounts).

```ts
const names = await session.resolveAccountNames(friendIds);
console.log(names.get(friendIds[0]));
```

## eosAccounts / eosProductUsers
<Badge type="info" text="method" />

```ts
eosAccounts(accountIds: string[], options?: { deploymentId?: string; signal?: AbortSignal }): Promise<EosIdAccount[]>
eosProductUsers(productUserIds: string[], options?: { deploymentId?: string; signal?: AbortSignal }): Promise<EosProductUserMapping[]>
```

Resolve identities against the **EOS** id service (`api.epicgames.dev`). `eosAccounts` maps Epic account ids → `{ accountId, displayName, linkedAccounts }`; `eosProductUsers` maps EOS product user ids (PUIDs) → their linked account. Each takes 1-100 ids.

The two calls use **different tokens**, minted for you automatically: `eosAccounts` hits the Epic Account Services (EAS) id endpoint and needs an EAS token from `POST /epic/oauth/v2/token` (`grant_type=client_credentials`), which the session mints and caches via [`easToken`](#eastoken). `eosProductUsers` uses the EOS Connect token from [`eosToken`](#eostoken) and additionally requires the client policy `eosconnect:queryProductUsersForAnyUser` — the stock Fortnite clients do not grant it, so it throws `EpicPermissionError` unless your client is provisioned for it.

```ts
const [{ displayName }] = await session.eosAccounts([accountId]);
console.log(displayName);
```

## listDeviceAuths
<Badge type="info" text="method" />

```ts
listDeviceAuths(options?: { signal?: AbortSignal }): Promise<DeviceAuth[]>
```

Lists device auths registered on the bound account. Account-bound sessions only.

**Returns:** `Promise<DeviceAuth[]>`

```ts
const auths = await session.listDeviceAuths();
```

## createDeviceAuth
<Badge type="info" text="method" />

```ts
createDeviceAuth(options?: { signal?: AbortSignal }): Promise<DeviceAuth>
```

Creates a new reusable device auth on the bound account. The returned `secret` is only available now — persist it for silent logins via `loginWithDeviceAuth`.

**Returns:** `Promise<DeviceAuth>`

```ts
const android = await session.switchClient('fortniteAndroid');
const deviceAuth = await android.createDeviceAuth();
save({ accountId: deviceAuth.accountId, deviceId: deviceAuth.deviceId, secret: deviceAuth.secret });
```

::: tip Note
Device-auth creation typically requires a mobile client; combine with `switchClient('fortniteAndroid')`.
:::

## getDeviceAuth
<Badge type="info" text="method" />

```ts
getDeviceAuth(deviceId: string, options?: { signal?: AbortSignal }): Promise<DeviceAuth>
```

Fetches a single device auth by its device id (secret not returned).

**Returns:** `Promise<DeviceAuth>`

```ts
const auth = await session.getDeviceAuth(deviceId);
```

## deleteDeviceAuth
<Badge type="info" text="method" />

```ts
deleteDeviceAuth(deviceId: string, options?: { signal?: AbortSignal }): Promise<void>
```

Revokes a device auth by device id.

**Returns:** `Promise<void>`

```ts
await session.deleteDeviceAuth(deviceId);
```

## killOtherSessions
<Badge type="info" text="method" />

```ts
killOtherSessions(options?: { signal?: AbortSignal }): Promise<void>
```

Revokes every other session for the account except the current one (kill type `OTHERS_ACCOUNT_CLIENT_SERVICE`).

**Returns:** `Promise<void>`

```ts
await session.killOtherSessions();
```

## killSessions
<Badge type="info" text="method" />

```ts
killSessions(killType: KillType, options?: { signal?: AbortSignal }): Promise<void>
```

Bulk-revokes sessions by an explicit `KillType`.

**Returns:** `Promise<void>`

```ts
await session.killSessions('ALL');
```

## logout
<Badge type="info" text="method" />

```ts
logout(options?: { signal?: AbortSignal }): Promise<void>
```

Revokes just this session's access token (single-session logout).

**Returns:** `Promise<void>`

```ts
await session.logout();
```

## eosToken
<Badge type="info" text="method" />

```ts
eosToken(options?: { deploymentId?: string; signal?: AbortSignal }): Promise<EosToken>
```

Exchanges this session's Epic access token for an **EOS Connect** token (via `external_auth` on `api.epicgames.dev`), scoped to the Fortnite live deployment. The result is cached on the session until it nears expiry. EOS tokens unlock the EOS services (Locker, Inventories, Stats, …). Requires an account-bound session.

**Returns:** `Promise<EosToken>`

```ts
const eos = await session.eosToken();
console.log(eos.features); // ['LockerService', 'Inventories', ...]
```

## easToken
<Badge type="info" text="method" />

```ts
easToken(options?: { signal?: AbortSignal }): Promise<EasToken>
```

Mints an **Epic Account Services (EAS)** token via `POST /epic/oauth/v2/token` (`grant_type=client_credentials`) using this session's auth client. Distinct from [`eosToken`](#eostoken) — this app-level token is what the EAS id endpoint behind [`eosAccounts`](#eosaccounts-eosproductusers) requires, and it is minted and cached automatically when you call `eosAccounts`, so you rarely need it directly. The result is cached on the session until it nears expiry.

**Returns:** `Promise<EasToken>`

## lockerItems
<Badge type="info" text="method" />

```ts
lockerItems(options?: { deploymentId?: string; signal?: AbortSignal }): Promise<LockerItemsResponse>
```

Reads the raw **EOS Locker Service** `locker/v4` items — the `activeLoadoutGroup` (equipped character, emotes, vehicle, jam, …) and saved presets. [`Locker`](/epic/locker) uses this under the hood to fill the equipped loadout for migrated accounts; call it directly if you want the raw group.

**Returns:** `Promise<LockerItemsResponse>`

```ts
const { activeLoadoutGroup } = await session.lockerItems();
```

## Identity & connections
<Badge type="info" text="method" />

```ts
searchUsers(prefix: string, options?): Promise<UserSearchResult[]>
searchUsersResolved(prefix: string, options?): Promise<ResolvedUserSearchResult[]>
externalAuths(accountId?: string, options?): Promise<ExternalAuth[]>
externalAuth(externalAuthType: string, accountId?: string, options?): Promise<ExternalAuth>
accountByExternalDisplayName(externalAuthType: string, displayName: string, options?): Promise<ExternalAuthAccountMatch[]>
accountsByExternalDisplayNames(authType: string, displayNames: string[], options?): Promise<ExternalDisplayNameLookup>
accountsByExternalIds(authType: string, ids: string[], options?): Promise<ExternalIdLookup>
accountMetadata(accountId?: string, options?): Promise<AccountMetadata>
```

Search usernames the way the in-game **Add Friends** box does — matches across Epic, PlayStation, Xbox, Steam and Switch, with a settable `platform` — then resolve the console/social connections linked to an account and look Epic accounts up by their platform identities. `accountId` defaults to the signed-in account. See [`UserSearchManager`](/epic/user-search) and [`AccountManager`](/epic/account-manager#accounts-externalauths).

```ts
for (const hit of await session.searchUsersResolved('Ninja'))
  console.log(hit.displayName ?? hit.accountId, hit.matches.map((m) => `${m.platform}:${m.value}`).join(', '));

for (const conn of await session.externalAuths())
  console.log(conn.type, conn.externalDisplayName ?? conn.externalAuthId);

const [match] = await session.accountByExternalDisplayName('xbl', 'Some Gamertag', { caseInsensitive: true });
```

## Status & presence
<Badge type="info" text="method" />

```ts
lastOnline(accountId?: string, options?): Promise<LastOnlineResponse>
lastOnlineFor(accountId?: string, options?): Promise<LastOnlineEntry | null>
serviceStatus(serviceId?: string, options?): Promise<LightswitchStatus>
serviceStatusBulk(serviceIds: string[], options?): Promise<LightswitchStatus[]>
```

Read last-online presence and Lightswitch service status. See [`PresenceManager`](/epic/presence) and [`LightswitchManager`](/epic/lightswitch).

```ts
const entry = await session.lastOnlineFor();
const status = await session.serviceStatus();
console.log(status.status, entry?.last_online);
```

## In-game custom status
<Badge type="info" text="method" />

```ts
setCustomStatus(status: string, options?: { onlineType?: string; signal?: AbortSignal }): Promise<void>
clearCustomStatus(options?: { signal?: AbortSignal }): Promise<void>
```

Publish the friend-facing status that modern Fortnite renders **in-game** (the line that otherwise reads *"In the launcher"*). This runs over **EOS presence**, not XMPP — the text is sent as `activity.value` on a presence `PATCH` bound to your live connect session, so it opens (or reuses) `connectEvents` for you and holds only while that session stays open. It re-applies on reconnect; `clearCustomStatus`, `disconnectEvents`, or `logout` removes it. See [live events & presence](/epic/chat#in-game-custom-status).

```ts
await session.setCustomStatus('Playing with fnapi-js 🚀');
await session.clearCustomStatus();
```

## Realtime XMPP & presence
<Badge type="info" text="method" />

```ts
connectXmpp(options?): Promise<XmppClient>
disconnectXmpp(): Promise<void>
friendPresences(): Promise<FriendPresence[]>
get xmpp(): XmppClient | null
```

Open Epic's realtime **XMPP-over-WebSocket** stream to receive live friend presence and chat. `connectXmpp` builds an [`XmppClient`](/epic/xmpp) bound to this session — token refresh is wired in automatically — and reuses it on later calls; `friendPresences` returns the cached presence snapshot; `logout` disconnects the stream for you. Publishing your own status is done over EOS via [`setCustomStatus`](#in-game-custom-status) — Fortnite no longer reads XMPP presence for the in-game line, so the low-level XMPP setters live on the [`XmppClient`](/epic/xmpp) itself for XMPP-only tooling. See [`XmppClient`](/epic/xmpp) for the full event/method surface.

```ts
const xmpp = await session.connectXmpp();
xmpp.on('presence', (p) => console.log(p.accountId, p.available, p.status?.Status));
xmpp.on('message', (m) => console.log(`${m.accountId}: ${m.body}`));

console.log(await session.friendPresences());
```

## Economy & progress
<Badge type="info" text="method" />

```ts
vbucks(options?): Promise<number>
vbucksBalance(options?): Promise<VbucksBalance>
mtxPlatform(options?): Promise<string>
setMtxPlatform(platform: MtxPlatform | (string & {}), options?): Promise<CommonCoreProfile | null>
commonCore(options?): Promise<CommonCoreProfile>
brInventory(accountId?: string, options?): Promise<BrInventory>
receipts(accountId?: string, options?): Promise<Receipt[]>
userStats(accountId?: string, options?): Promise<UserStats | null>
userStatsBulk(accountIds: string[], options?): Promise<UserStats[]>
leaderboard(leaderboardName: string, options?): Promise<Leaderboard>
timeline(options?): Promise<Timeline>
```

Read the V-Bucks balance with its multi-platform breakdown, get and set the current purchase platform, and read inventory, purchase receipts, StatsV2 data, and the calendar timeline. The V-Bucks and platform methods query `common_core`, which is **self-only** — they always target the signed-in account and take no `accountId`. See [`FortniteGameManager`](/epic/game) and [`StatsProxyManager`](/epic/stats).

```ts
const balance = await session.vbucksBalance();
console.log('v-bucks:', balance.total, 'on', balance.platform);

await session.setMtxPlatform('PSN');
const stats = await session.userStats();
```

## Cloud storage
<Badge type="info" text="method" />

```ts
cloudStorageFiles(options?: CloudStorageOptions): Promise<CloudStorageFile[]>
readCloudStorage(filename: string, options?: CloudStorageOptions): Promise<Uint8Array>
readCloudStorageText(filename: string, options?: CloudStorageOptions): Promise<string>
writeCloudStorage(filename: string, data: string | Uint8Array, options?: CloudStorageWriteOptions): Promise<void>
deleteCloudStorage(filename: string, options?: CloudStorageOptions): Promise<void>
systemCloudStorageFiles(options?: CloudStorageOptions): Promise<CloudStorageFile[]>
readSystemCloudStorage(filename: string, options?: CloudStorageOptions): Promise<Uint8Array>
readSystemCloudStorageText(filename: string, options?: CloudStorageOptions): Promise<string>
```

Read and write the account's **cloud storage** — the `user/*` files where Fortnite keeps client settings (`ClientSettings.Sav`), plus the read-only `system/*` config files (e.g. `DefaultGame.ini`). User methods are account-scoped and refer to a file by its `uniqueFilename`; `writeCloudStorage`/`deleteCloudStorage` mutate the real account. System files are global and read-only. Both the raw bytes and a decoded-text convenience are provided.

```ts
for (const file of await session.cloudStorageFiles())
  console.log(file.filename, file.length, file.uniqueFilename);

const settings = await session.readCloudStorageText('ClientSettings.Sav');
await session.writeCloudStorage('ClientSettings.Sav', settings);
```

## Playtime
<Badge type="info" text="method" />

```ts
playtime(artifactId?: string, options?: PlaytimeOptions): Promise<PlaytimeInfo>
playtimeAll(options?: PlaytimeOptions): Promise<PlaytimeInfo[]>
addPlaytime(segment: PlaytimeSegment, options?: PlaytimeOptions): Promise<void>
addPlaytimeSeconds(seconds: number, options?: PlaytimeAddSecondsOptions): Promise<void>
```

Read and append to the account's tracked **playtime** artifacts. `playtimeAll` returns every artifact record; `playtime` reads one (defaulting to the main Fortnite artifact); the `add*` methods append a played segment. These run against the launcher service, so the session mints a launcher token for you automatically. Account-bound sessions only.

```ts
for (const record of await session.playtimeAll())
  console.log(record.artifactId, record.totalTime);
```

## Avatars
<Badge type="info" text="method" />

```ts
avatars(accountIds: readonly string[], options?: AvatarOptions): Promise<AvatarEntry[]>
avatar(accountId?: string, options?: AvatarOptions): Promise<AvatarEntry | null>
resolveAvatars(accountIds: readonly string[], options?: AvatarResolveOptions): Promise<ResolvedAvatar[]>
resolveAvatar(accountId?: string, options?: AvatarResolveOptions): Promise<ResolvedAvatar | null>
```

Read the KWS/Epic **avatar** (the account's chosen Fortnite icon) for one or many accounts. `avatar`/`avatars` return the raw `namespace:id` reference; the `resolve*` variants additionally resolve the id into its `characterId` and a rendered `iconUrl`. `avatar`/`resolveAvatar` default to the signed-in account and return `null` when none is set.

Two sources are supported: `fncc` (**fn-api.cc**, the default) and `fortnite-api` (**fortnite-api.com**). Pick one per call with `options.source`; the resolved value also carries every source's URL in `iconUrls` so you can fall back client-side. `options.size` is `smallicon` (default), `icon`, or `featured` — `fncc` serves the character icon only, never a full render.

When you construct the SDK through the umbrella `Fortnite` client, the default `fncc` source reads the cosmetic's real `images` object from fn-api.cc, so the resolved `iconUrl` is the exact CDN link the API reports and degrades to `smallicon` when a skin has no `icon`. Used standalone (a bare `EpicGamesClient`, or `fortnite-api` as the source), the icon URL is built directly from the skin id against the CDN with no extra request. Pass your own `avatarImageResolver` to `EpicGamesClient` to override the lookup.

```ts
const me = await session.resolveAvatar();
console.log(me?.avatarId, me?.characterId, me?.source, me?.iconUrl);
console.log(me?.iconUrls['fncc'], me?.iconUrls['fortnite-api']);

const large = await session.resolveAvatar(undefined, {
  size: AvatarIconSize.Featured,
  source: AvatarImageSource.FortniteApi,
});
```

## Matchmaking
<Badge type="info" text="method" />

```ts
sessionInfo(options?: MatchmakingOptions): Promise<MatchmakingSession[]>
matchmakingNetCL(options?: MatchmakingOptions): Promise<string>
matchmakingBan(options?: MatchmakingTicketOptions): Promise<MatchmakingBanResult>
socialBan(accountId?: string, options?: SocialBanOptions): Promise<SocialBanStatus>
checkBan(options?: MatchmakingTicketOptions): Promise<BanCheckResult>
```

Inspect **matchmaking** state. `sessionInfo` returns the live server sessions the signed-in account is currently in — Epic's `findPlayer` route only reports your own account. `matchmakingNetCL` fetches the live `buildUniqueId` (netCL) for the current build. `matchmakingBan` reads the raw matchmaking ticket ban; `socialBan` reads the dedicated social-ban service; `checkBan` combines three signals to report whether the account is banned:

- **`permanent`** — Lightswitch reports the account `banned` (parsed to a boolean; the raw Lightswitch payload is not returned).
- **`temporary`** — the matchmaking ticket is rejected with `player_banned_from_sub_game`, exposing `banDaysRemaining`.
- **`social`** — the social-ban service (`social-ban-public-service-prod`) returns a non-empty `bans` array, surfaced as `socialBan` with its `bans` and `warnings`. See [`SocialBanManager`](/epic/social-ban).

`banned` is `true` when any of the three is set.

The ticket the ban check submits needs a valid `bucketId` **and** a valid `User-Agent`, and both hinge on the current netCL — a stale or placeholder `bucketId` is rejected with `Failed to parse bucketId`, and a `User-Agent` without a `-CL-<number>` segment is rejected against Epic's regex. Both `matchmakingBan` and `checkBan` fetch the live netCL once and build the `{netCL}:{hotfixVersion}:{region}:{playlist}` bucketId **and** the `Fortnite/++Fortnite+Release-Live-CL-{netCL} Windows/…` user-agent from it automatically, so no configuration is needed. Override any bucket segment (`netCL`, `hotfixVersion`, `region`, `playlist`) or pass a fully-formed `bucketId` / `userAgent` through `MatchmakingTicketOptions` to skip the lookup.

```ts
const ban = await session.checkBan();
console.log(ban.banned, ban.permanent, ban.temporary, ban.social, ban.banDaysRemaining);
if (ban.social) console.log(ban.socialBan.bans, ban.socialBan.warnings);

const netCL = await session.matchmakingNetCL();
const euBan = await session.checkBan({ region: 'EU' });
```

## Status page
<Badge type="info" text="method" />

```ts
statusSummary(options?: StatusOptions): Promise<StatusSummary>
statusComponents(options?: StatusOptions): Promise<StatusComponent[]>
statusIncidents(options?: StatusOptions): Promise<StatusIncident[]>
statusMaintenances(options?: StatusOptions): Promise<StatusMaintenance[]>
```

Read Epic's public **status site** (`status.epicgames.com`, a Statuspage.io instance) — the overall summary, per-component status, unresolved incidents, and active/scheduled maintenances. These hit the public status host and take **no auth**, so they work on any session (or none). Distinct from [`serviceStatus`](#status-presence), which reads the internal Lightswitch service state.

```ts
const summary = await session.statusSummary();
console.log(summary.status.description);
for (const incident of await session.statusIncidents()) console.log(incident.name);
```
