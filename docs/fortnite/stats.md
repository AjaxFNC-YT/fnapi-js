# StatsEndpoint

Battle Royale player stats. Reached via `client.stats`. Every method REQUIRES an API key — without one they throw `ValidationError` before making a request. Construct the client with `new FortniteAPI({ apiKey })`. Lookups support `accountType` (`'epic' | 'psn' | 'xbl'`, name lookup only), `timeWindow` (`'lifetime' | 'season'`), and `image` (`'all' | 'keyboardMouse' | 'gamepad' | 'touch' | 'none'`).

## StatsEndpoint
<Badge type="tip" text="class" />

```ts
class StatsEndpoint extends BaseEndpoint
```

Endpoint wrapper for `/v2/stats/br`. `byName`/`byId` throw on missing players; the `find*` variants swallow `NotFoundError` and return `null`. All four require the client to have been given an `apiKey`.

```ts
import { FortniteAPI } from 'fnapi-js';

const client = new FortniteAPI({ apiKey: process.env.FN_API_KEY });
const stats = await client.stats.byName('Ninja');
console.log(stats.stats.all.overall.wins);
```

::: tip Note
Requires an API key from fortnite-api.com. Missing key throws `ValidationError`; a private or nonexistent account throws `NotFoundError` from `byName`/`byId`.
:::

## byName
<Badge type="info" text="method" />

```ts
byName(name: string, options?: StatsLookupOptions): Promise<BrStats>
```

Looks up a player's BR stats by display name. Requires an API key (throws `ValidationError` otherwise) and a non-empty `name`.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | `string` | The player's Epic display name. |
| `options` | `StatsLookupOptions` | Optional `accountType` (`'epic'\|'psn'\|'xbl'`), `timeWindow` (`'lifetime'\|'season'`), and `image` (`StatsImage`) plus transport controls. |

**Returns:** `Promise<BrStats> — the player's account info and stat breakdown`

```ts
const stats = await client.stats.byName('Ninja', {
  accountType: 'epic',
  timeWindow: 'lifetime',
  image: 'all',
});
console.log(stats.account.id, stats.image);
```

## byId
<Badge type="info" text="method" />

```ts
byId(accountId: string, options?: StatsByIdOptions): Promise<BrStats>
```

Looks up a player's BR stats by Epic account id. Requires an API key and a non-empty `accountId`. Note `StatsByIdOptions` has no `accountType`.

| Parameter | Type | Description |
| --- | --- | --- |
| `accountId` | `string` | The player's Epic account id. |
| `options` | `StatsByIdOptions` | Optional `timeWindow` and `image` plus transport controls (no `accountType`). |

**Returns:** `Promise<BrStats> — the player's account info and stat breakdown`

```ts
const stats = await client.stats.byId('4735ce9132924caf8a5b17789b40f79c', {
  timeWindow: 'season',
});
console.log(stats.stats.all.overall.kills);
```

## findByName
<Badge type="info" text="method" />

```ts
findByName(name: string, options?: StatsLookupOptions): Promise<BrStats | null>
```

Same as `byName()` but returns `null` instead of throwing `NotFoundError` when the player is missing or private. Other errors (including the missing-API-key `ValidationError`) still propagate.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | `string` | The player's Epic display name. |
| `options` | `StatsLookupOptions` | Optional `accountType`, `timeWindow`, `image`, and transport controls. |

**Returns:** `Promise<BrStats | null> — the stats, or null if not found`

```ts
const stats = await client.stats.findByName('SomeMaybeMissingPlayer');
if (!stats) console.log('No public stats');
```

## findById
<Badge type="info" text="method" />

```ts
findById(accountId: string, options?: StatsByIdOptions): Promise<BrStats | null>
```

Same as `byId()` but returns `null` instead of throwing `NotFoundError`. Other errors still propagate.

| Parameter | Type | Description |
| --- | --- | --- |
| `accountId` | `string` | The player's Epic account id. |
| `options` | `StatsByIdOptions` | Optional `timeWindow`, `image`, and transport controls. |

**Returns:** `Promise<BrStats | null> — the stats, or null if not found`

```ts
const stats = await client.stats.findById('4735ce9132924caf8a5b17789b40f79c');
console.log(stats?.stats.all.overall.matches ?? 0);
```
