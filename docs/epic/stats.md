# StatsProxyManager

Reads Fortnite **StatsV2** data through Epic's stats proxy — per-account stat maps, bulk stat queries, and named leaderboards. Exposed as `client.stats` on `EpicGamesClient` and mirrored on a live `EpicAuthSession`. Every method requires a bearer token.

```ts
import { EpicGamesClient } from 'fnapi-js';

const epic = new EpicGamesClient();
const session = await epic.loginWithDeviceAuth(creds);

const stats = await session.userStats();
console.log(stats ? stats.stats : 'private profile');
```

## stats.userStats
<Badge type="info" text="method" />

```ts
userStats(accessToken: string, accountId: string, options?: UserStatsOptions): Promise<UserStats | null>
```

Fetches the stat map for a single account. Optionally window the read with `startTime` / `endTime` (epoch seconds). Returns `null` when the profile is private (Epic answers `204`).

| Parameter | Type | Description |
| --- | --- | --- |
| `accessToken` | `string` | Bearer token. |
| `accountId` | `string` | Account to read. |
| `options.startTime` | `number` | Window start (epoch seconds). |
| `options.endTime` | `number` | Window end (epoch seconds). |

**Returns:** `Promise<UserStats | null>` · **Session:** `session.userStats(accountId?)`

## stats.userStatsBulk
<Badge type="info" text="method" />

```ts
userStatsBulk(accessToken: string, accountIds: string[], options?: StatsQueryOptions): Promise<UserStats[]>
```

Queries stats for up to a full batch of accounts in one POST. `owners` comes from `accountIds` (must be non-empty); `appId` defaults to `Fortnite`, `startDate` to `0`, `endDate` to the max timestamp. The stats service **requires** an explicit `stats` list (each name is a full stat window key such as `br_placetop1_keyboardmouse_m0_playlist_defaultsolo`) unless you scope the query with a `category` (e.g. `StatsCategory.Fish`) for collection stats.

**Returns:** `Promise<UserStats[]>` · **Session:** `session.userStatsBulk(accountIds, options)`

::: tip Note
Throws `ValidationError` when `accountIds` is empty, or when neither `stats` nor `category` is supplied.
:::

## stats.leaderboard
<Badge type="info" text="method" />

```ts
leaderboard(accessToken: string, leaderboardName: string, options?: LeaderboardOptions): Promise<Leaderboard>
```

Fetches a named leaderboard (e.g. `br_placetop1_keyboardmouse_m0_playlist_defaultsolo`).

**Returns:** `Promise<Leaderboard>` · **Session:** `session.leaderboard(leaderboardName)`

## Types
<Badge type="tip" text="interface" />

```ts
interface UserStats {
  startTime: number;
  endTime: number;
  stats: Record<string, number>;
  accountId: string;
}

interface Leaderboard {
  entries: LeaderboardEntry[];
  maxSize: number;
}

interface LeaderboardEntry {
  account: string;
  value: number;
}

const StatsCategory = {
  Fish: 'collection_fish',
  Character: 'collection_character',
} as const;
```

`STATS_PROXY_BASE_URL`, `STATS_APP_ID`, and `STATS_MAX_TIMESTAMP` are exported for advanced use.
