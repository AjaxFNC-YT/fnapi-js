# DeviceAuthManager

Manages persistent device auths on Epic's account service, exposed as `client.deviceAuths` on `EpicGamesClient` (and on a live `EpicAuthSession`). Every method takes an account-bound access token that carries the `deviceAuths` permission plus the target `accountId`. Device auths are the long-lived credential you later feed to the `deviceAuth` grant to log back in without a password.

## deviceAuths.create
<Badge type="info" text="method" />

```ts
create(accessToken: string, accountId: string, options?: { signal?: AbortSignal }): Promise<DeviceAuth>
```

Creates a new device auth for the account. The returned `DeviceAuth` includes a one-time `secret` (only present on creation) alongside `deviceId` and `accountId` — store all three to reuse later.

| Parameter | Type | Description |
| --- | --- | --- |
| `accessToken` | `string` | Account-bound bearer token with `deviceAuths` permission. |
| `accountId` | `string` | The account the device auth is created for. |
| `options` | `{ signal?: AbortSignal }` | Optional abort signal. |

**Returns:** `Promise<DeviceAuth> with deviceId, accountId, and one-time secret`

```ts
import { EpicGamesClient } from 'fnapi-js';

const epic = new EpicGamesClient({ defaultClient: 'fortniteAndroid' });

const created = await epic.deviceAuths.create(accessToken, accountId);
console.log(created.deviceId, created.accountId, created.secret);
```

::: tip Note
Requires a token minted from `fortniteAndroid` to create device auths. The `secret` is never returned again by `list`/`get`.
:::

## deviceAuths.list
<Badge type="info" text="method" />

```ts
list(accessToken: string, accountId: string, options?: { signal?: AbortSignal }): Promise<DeviceAuth[]>
```

Lists all device auths registered for the account. Returned entries omit `secret`.

| Parameter | Type | Description |
| --- | --- | --- |
| `accessToken` | `string` | Account-bound bearer token with `deviceAuths` **READ** permission. |
| `accountId` | `string` | The account to list device auths for. |
| `options` | `{ signal?: AbortSignal }` | Optional abort signal. |

**Returns:** `Promise<DeviceAuth[]>`

```ts
const auths = await epic.deviceAuths.list(accessToken, accountId);
for (const a of auths) console.log(a.deviceId, a.lastAccess?.dateTime);
```

::: tip READ permission is handled for you
`list` and `get` require the `account:public:account:deviceAuths` **READ** action. A token minted from the **deviceAuth grant** (the one you log in with via `loginWithDeviceAuth`) carries `CREATE`+`DELETE` but not `READ`. When you call these through a session, it detects the `EpicPermissionError` and transparently mints a READ-capable token (exchange-code → `fortnitePC`) for the retry, so this just works:

```ts
const session = await epic.loginWithDeviceAuth(creds);
const auths = await session.listDeviceAuths();
```

Calling `DeviceAuthManager.list` / `.get` directly with a raw token still needs one that holds `READ` — switch clients yourself (`session.switchClient('fortnitePC')`) if you go around the session.
:::

## deviceAuths.get
<Badge type="info" text="method" />

```ts
get(accessToken: string, accountId: string, deviceId: string, options?: { signal?: AbortSignal }): Promise<DeviceAuth>
```

Fetches a single device auth by its `deviceId`. Includes `created`/`lastAccess` metadata but not the `secret`.

| Parameter | Type | Description |
| --- | --- | --- |
| `accessToken` | `string` | Account-bound bearer token with `deviceAuths` permission. |
| `accountId` | `string` | Owning account id. |
| `deviceId` | `string` | The device auth to fetch. |
| `options` | `{ signal?: AbortSignal }` | Optional abort signal. |

**Returns:** `Promise<DeviceAuth>`

```ts
const one = await epic.deviceAuths.get(accessToken, accountId, deviceId);
console.log(one.userAgent, one.created.dateTime);
```

## deviceAuths.delete
<Badge type="info" text="method" />

```ts
delete(accessToken: string, accountId: string, deviceId: string, options?: { signal?: AbortSignal }): Promise<void>
```

Revokes a device auth by `deviceId`. Resolves with no value on success.

| Parameter | Type | Description |
| --- | --- | --- |
| `accessToken` | `string` | Account-bound bearer token with `deviceAuths` permission. |
| `accountId` | `string` | Owning account id. |
| `deviceId` | `string` | The device auth to revoke. |
| `options` | `{ signal?: AbortSignal }` | Optional abort signal. |

**Returns:** `Promise<void>`

```ts
await epic.deviceAuths.delete(accessToken, accountId, deviceId);
```

## DeviceAuth
<Badge type="tip" text="interface" />

```ts
interface DeviceAuth { deviceId: string; accountId: string; secret?: string; userAgent?: string; created: DeviceAuthAccess; lastAccess?: DeviceAuthAccess }
```

A stored device auth. `secret` is only populated on `create`. `created`/`lastAccess` are `DeviceAuthAccess` records (`{ location?, ipAddress?, dateTime }`). Pair `accountId`+`deviceId`+`secret` as `DeviceAuthCredentials` for the `deviceAuth` grant.
