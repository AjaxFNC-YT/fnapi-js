# AccountManager

Reads Epic account records from the account service, exposed as `client.accounts` on `EpicGamesClient` (and on a live `EpicAuthSession`). Every method requires a valid bearer token. Results are `EpicAccount` objects — most fields beyond `id` and `displayName` only appear when the token has permission to see them (e.g. querying your own account).

## accounts.byId
<Badge type="info" text="method" />

```ts
byId(accessToken: string, accountId: string, options?: { signal?: AbortSignal }): Promise<EpicAccount>
```

Fetches a single account by its account id.

| Parameter | Type | Description |
| --- | --- | --- |
| `accessToken` | `string` | Bearer token. |
| `accountId` | `string` | The account id to look up. |
| `options` | `{ signal?: AbortSignal }` | Optional abort signal. |

**Returns:** `Promise<EpicAccount>`

```ts
import { EpicGamesClient } from 'fnapi-js';

const epic = new EpicGamesClient();
const account = await epic.accounts.byId(accessToken, accountId);
console.log(account.displayName, account.country);
```

## accounts.byIds
<Badge type="info" text="method" />

```ts
byIds(accessToken: string, accountIds: string[], options?: { signal?: AbortSignal }): Promise<EpicAccount[]>
```

Bulk-fetches accounts by id in a single request. The array must be non-empty and hold at most 100 ids.

| Parameter | Type | Description |
| --- | --- | --- |
| `accessToken` | `string` | Bearer token. |
| `accountIds` | `string[]` | 1-100 account ids. |
| `options` | `{ signal?: AbortSignal }` | Optional abort signal. |

**Returns:** `Promise<EpicAccount[]>`

```ts
const accounts = await epic.accounts.byIds(accessToken, [id1, id2, id3]);
console.log(accounts.map((a) => a.displayName));
```

::: tip Note
Throws `ValidationError` when the array is empty or exceeds 100 ids.
:::

## accounts.resolveAccounts
<Badge type="info" text="method" />

```ts
resolveAccounts(accessToken: string, accountIds: string[], options?: { signal?: AbortSignal }): Promise<Map<string, EpicAccount>>
```

Resolves any number of account ids into a `Map` keyed by account id. Blank ids are dropped and duplicates deduped, then the remaining ids are chunked into requests of 100 automatically, so unlike `byIds` there is no length limit and no throw on an empty list (it simply makes no request). Ids Epic does not return are absent from the map.

| Parameter | Type | Description |
| --- | --- | --- |
| `accessToken` | `string` | Bearer token. |
| `accountIds` | `string[]` | Any number of account ids. |
| `options` | `{ signal?: AbortSignal }` | Optional abort signal. |

**Returns:** `Promise<Map<string, EpicAccount>>`

```ts
const accounts = await epic.accounts.resolveAccounts(accessToken, friendIds);
console.log(accounts.get(friendIds[0])?.displayName);
```

## accounts.resolveNames
<Badge type="info" text="method" />

```ts
resolveNames(accessToken: string, accountIds: string[], options?: { signal?: AbortSignal }): Promise<Map<string, string>>
```

Convenience wrapper over `resolveAccounts` that returns a `Map` of account id → display name — the common case when turning a list of ids into readable names.

```ts
const names = await epic.accounts.resolveNames(accessToken, friendIds);
for (const [id, name] of names) console.log(id, '→', name);
```

**Session:** `session.resolveAccountNames(accountIds)` (and `session.resolveAccounts(accountIds)`).

## accounts.byDisplayName
<Badge type="info" text="method" />

```ts
byDisplayName(accessToken: string, displayName: string, options?: { signal?: AbortSignal }): Promise<EpicAccount>
```

Resolves an account by its exact (Epic) display name.

| Parameter | Type | Description |
| --- | --- | --- |
| `accessToken` | `string` | Bearer token. |
| `displayName` | `string` | Exact Epic display name. |
| `options` | `{ signal?: AbortSignal }` | Optional abort signal. |

**Returns:** `Promise<EpicAccount>`

```ts
const account = await epic.accounts.byDisplayName(accessToken, 'Ninja');
console.log(account.id);
```

## accounts.byEmail
<Badge type="info" text="method" />

```ts
byEmail(accessToken: string, email: string, options?: { signal?: AbortSignal }): Promise<EpicAccount>
```

Resolves an account by email address. Requires an elevated token — most tokens cannot query by email.

| Parameter | Type | Description |
| --- | --- | --- |
| `accessToken` | `string` | Bearer token with email-lookup permission. |
| `email` | `string` | Account email address. |
| `options` | `{ signal?: AbortSignal }` | Optional abort signal. |

**Returns:** `Promise<EpicAccount>`

```ts
const account = await epic.accounts.byEmail(accessToken, 'user@example.com');
```

## accounts.externalAuths
<Badge type="info" text="method" />

```ts
externalAuths(accessToken: string, accountId: string, options?: { signal?: AbortSignal }): Promise<ExternalAuth[]>
```

Lists every external connection (console, social, etc.) linked to an account — Xbox, PlayStation, Nintendo, Steam, and the rest.

**Returns:** `Promise<ExternalAuth[]>` · **Session:** `session.externalAuths(accountId?)` — `accountId` defaults to the signed-in account.

## accounts.externalAuth
<Badge type="info" text="method" />

```ts
externalAuth(accessToken: string, accountId: string, externalAuthType: string, options?: { signal?: AbortSignal }): Promise<ExternalAuth>
```

Fetches a single linked connection by its type (`xbl`, `psn`, `nintendo`, …).

**Session:** `session.externalAuth(externalAuthType, accountId?)`

## accounts.byExternalDisplayName
<Badge type="info" text="method" />

```ts
byExternalDisplayName(accessToken: string, externalAuthType: string, displayName: string, options?: { caseInsensitive?: boolean; signal?: AbortSignal }): Promise<ExternalAuthAccountMatch[]>
```

Finds Epic accounts by their display name **on an external platform** — e.g. an Xbox gamertag or PSN online id. Set `caseInsensitive` to relax the match.

| Parameter | Type | Description |
| --- | --- | --- |
| `externalAuthType` | `string` | Platform, e.g. `xbl` / `psn` / `nintendo`. |
| `displayName` | `string` | The platform display name to resolve. |
| `options.caseInsensitive` | `boolean` | Match without case sensitivity. |

**Returns:** `Promise<ExternalAuthAccountMatch[]>` · **Session:** `session.accountByExternalDisplayName(externalAuthType, displayName, options?)`

## accounts.byExternalDisplayNames
<Badge type="info" text="method" />

```ts
byExternalDisplayNames(accessToken: string, authType: string, displayNames: string[], options?: { signal?: AbortSignal }): Promise<ExternalDisplayNameLookup>
```

Bulk variant of `byExternalDisplayName` — resolves 1–100 platform display names in one POST. Returns a lookup keyed by the queried name.

**Session:** `session.accountsByExternalDisplayNames(authType, displayNames)`

::: tip Note
Throws `ValidationError` when the array is empty or exceeds 100 names.
:::

## accounts.byExternalIds
<Badge type="info" text="method" />

```ts
byExternalIds(accessToken: string, authType: string, ids: string[], options?: { signal?: AbortSignal }): Promise<ExternalIdLookup>
```

Resolves 1–100 external platform account ids (e.g. raw XUIDs / PSN account ids) into their Epic links in one POST. Returns a lookup keyed by the external id.

**Session:** `session.accountsByExternalIds(authType, ids)`

## accounts.metadata
<Badge type="info" text="method" />

```ts
metadata(accessToken: string, accountId: string, options?: { signal?: AbortSignal }): Promise<AccountMetadata>
```

Reads the account's metadata bag — a flat `Record<string, string>` of onboarding and feature flags Epic keeps on the account. Uses the `/account/api/accounts/:id/metadata` route.

**Session:** `session.accountMetadata(accountId?)`

## EpicAccount
<Badge type="tip" text="interface" />

```ts
interface EpicAccount { id: string; displayName: string; name?: string; email?: string; country?: string; externalAuths?: Record<string, ExternalAuth>; /* ...plus many optional profile fields */ }
```

An Epic account record. `id` and `displayName` are always present; the rest (`email`, `country`, `tfaEnabled`, `emailVerified`, `ageGroup`, `externalAuths`, etc.) are optional and only returned when the token is authorized to see them.
