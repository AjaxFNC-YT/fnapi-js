# Habanero (Ranked)

Read Fortnite **ranked** (competitive) data from the FN-Habanero service — the ranked seasons ("tracks"), their divisions, and a player's progress within a track. Exposed as `client.habanero` on `EpicGamesClient`, and mirrored with `ranked*` convenience methods on a live `EpicAuthSession`. Every method requires a bearer token.

Ranked seasons are identified by a **track GUID**; each track has a `rankingType` (the mode it belongs to) and a `divisionCount`. Progress is expressed as the player's `currentDivision` / `highestDivision` and a `promotionProgress` fraction toward the next division.

```ts
import { EpicGamesClient, RankingType } from 'fnapi-js';

const epic = new EpicGamesClient();
const session = await epic.loginWithDeviceAuth(creds);

const tracks = await session.rankedTracks({ rankingType: RankingType.ZeroBuild });
const guid = tracks[0]?.trackguid;

const me = await session.rankedProgress(guid);
console.log(`Division ${me.currentDivision} (peak ${me.highestDivision})`);
```

::: tip Namespace
Every call defaults to the `fortnite` namespace. Override per-call with `options.namespace`, or construct `new HabaneroManager(rest, { namespace })` for a different default.
:::

## RankingType
<Badge type="tip" text="enum" />

The known ranked modes. Values are the raw `rankingType` strings the service uses.

```ts
RankingType.BattleRoyaleBuild      // 'ranked-br'
RankingType.BattleRoyaleCombined   // 'ranked-br-combined'
RankingType.ZeroBuild              // 'ranked-zb'
RankingType.RocketRacing           // 'delmar-competitive'
RankingType.ReloadBuild            // 'ranked_blastberry_build'
RankingType.ReloadZeroBuild        // 'ranked_blastberry_nobuild'
RankingType.ReloadCombined         // 'ranked-blastberry-combined'
RankingType.Ballistic              // 'ranked-feral'
RankingType.OgBuild                // 'ranked-figment-build'
RankingType.OgZeroBuild            // 'ranked-figment-nobuild'
RankingType.Getaway                // 'ranked-bling'
RankingType.GetawayZeroBuild       // 'ranked-bling-nobuild'
RankingType.FallGuysCrownJam       // 'ranked-pimlico'
RankingType.Arenas                 // 'ranked-squareclub'
```

`RANKING_TYPES` is the list of all values; `isRankingType(value)` is a type guard. Methods that take a ranking type also accept any raw string, so newly-added modes work before the enum is updated.

## habanero.tracks
<Badge type="info" text="method" />

```ts
tracks(accessToken: string, options?: HabaneroTracksOptions): Promise<HabaneroTrack[]>
```

Lists ranked tracks. Filter with `endsAfter` (ISO date — only tracks ending after it) and `rankingType`.

| Parameter | Type | Description |
| --- | --- | --- |
| `options.endsAfter` | `string` | Only tracks ending after this ISO date. |
| `options.rankingType` | `RankingType \| string` | Filter to one mode. |
| `options.namespace` | `string` | Namespace override. |

**Returns:** `Promise<HabaneroTrack[]>` · **Session:** `session.rankedTracks(options?)`

## habanero.trackByGuid
<Badge type="info" text="method" />

```ts
trackByGuid(accessToken: string, trackguid: string, options?: HabaneroBaseOptions): Promise<HabaneroTrack>
```

Fetches a single track by its GUID. **Session:** `session.rankedTrack(trackguid)`

## habanero.activeTracks
<Badge type="info" text="method" />

```ts
activeTracks(accessToken: string, startDate: string, options?: HabaneroBaseOptions): Promise<HabaneroTrack[]>
```

Lists the tracks active as of `startDate` (ISO date). **Session:** `session.rankedActiveTracks(startDate)`

## habanero.progress
<Badge type="info" text="method" />

```ts
progress(accessToken: string, accountId: string, trackguid: string, options?: HabaneroBaseOptions): Promise<HabaneroProgress>
```

An account's progress within one track.

**Session:** `session.rankedProgress(trackguid, accountId?)` — `accountId` defaults to the signed-in account.

## habanero.allProgress
<Badge type="info" text="method" />

```ts
allProgress(accessToken: string, accountId: string, options?: HabaneroProgressOptions): Promise<HabaneroProgress[]>
```

Every track's progress for an account. `options.endsAfter` limits to tracks ending after the given ISO date.

**Session:** `session.rankedProgressAll(accountId?, options?)`

## habanero.bulkProgress
<Badge type="info" text="method" />

```ts
bulkProgress(accessToken: string, trackguid: string, accountIds: string[], options?: HabaneroBaseOptions): Promise<HabaneroProgress[]>
```

Progress in one track for up to **25** accounts in a single request. The ids are sent as a JSON `{ accountIds }` body.

| Parameter | Type | Description |
| --- | --- | --- |
| `trackguid` | `string` | The track to read. |
| `accountIds` | `string[]` | 1–25 account ids. |

**Returns:** `Promise<HabaneroProgress[]>` · **Session:** `session.rankedProgressBulk(trackguid, accountIds)`

::: tip Note
Throws `ValidationError` when `accountIds` is empty or exceeds 25 (`HABANERO_MAX_BULK_ACCOUNTS`).
:::

## habanero.bulkProgressByRankingType
<Badge type="info" text="method" />

```ts
bulkProgressByRankingType(accessToken: string, rankingType: RankingType | string, accountIds: string[], options?: HabaneroRankingTypeOptions): Promise<HabaneroProgress[]>
```

Like `bulkProgress`, but resolves the current track for a `rankingType` instead of a fixed GUID — the ranking type is a required query param, `accountIds` (max 25) is the JSON body, and `options.endsAfter` is optional.

**Session:** `session.rankedProgressBulkByType(rankingType, accountIds, options?)`

## HabaneroTrack
<Badge type="tip" text="interface" />

```ts
interface HabaneroTrack {
  gameId: string;
  trackguid: string;
  rankingType: string;
  beginTime: string;
  endTime: string;
  divisionCount: number;
  leaderboardTrackingEventId: string;
}
```

A ranked season. `divisionCount` is how many divisions the track has; `beginTime` / `endTime` are ISO timestamps.

## HabaneroProgress
<Badge type="tip" text="interface" />

```ts
interface HabaneroProgress {
  gameId: string;
  trackguid: string;
  accountId: string;
  rankingType: string;
  lastUpdated: string;
  currentDivision: number;
  highestDivision: number;
  promotionProgress: number;
  currentPlayerRanking: number | null;
}
```

An account's standing in a track. `promotionProgress` is a `0..1` fraction toward the next division; `currentPlayerRanking` is only set for tracks with a numeric ladder (otherwise `null`).

## Options
<Badge type="tip" text="interface" />

```ts
interface HabaneroBaseOptions { namespace?: string; signal?: AbortSignal; }
interface HabaneroTracksOptions extends HabaneroBaseOptions { endsAfter?: string; rankingType?: RankingType | string; }
interface HabaneroProgressOptions extends HabaneroBaseOptions { endsAfter?: string; }
interface HabaneroRankingTypeOptions extends HabaneroBaseOptions { endsAfter?: string; }
```
