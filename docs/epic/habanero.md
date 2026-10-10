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

## Named ranks & standings
<Badge type="info" text="method" />

The raw API only returns division numbers. The session turns them into what players see, using the ladder, mode names and colours from the game's own Habanero data:

```ts
const standings = await session.rankedStandings();
for (const s of standings) {
  const place = s.unrealRank !== null ? `#${s.unrealRank}` : `${Math.round(s.progress * 100)}%`;
  console.log(`${s.mode.name}: ${s.played ? s.current.name : 'Unranked'} ${place}`);
}
// Reload: Unreal #1007
// Battle Royale: Bronze II 48%
```

```ts
rankedCurrentTracks(options?): Promise<HabaneroTrack[]>
rankedStandings(accountId?: string, options?: { history?: boolean; playedOnly?: boolean; signal? }): Promise<RankedStanding[]>
rankedStanding(rankingType: string, accountId?: string, options?): Promise<RankedStanding | null>
rankedStandingsBulk(accountIds: string[], options?: { rankingTypes?: string[]; signal? }): Promise<Map<string, RankedStanding[]>>
```

`rankedCurrentTracks` returns only the tracks running right now (cached for five minutes). `rankedStandings` joins an account's progress with those tracks — played modes first, current modes before legacy ones, then by mode name; `history: true` covers every season the account ever had a track in, `playedOnly` drops tracks with no matches, and `includeLegacy: false` drops legacy modes. `rankedStanding` picks one mode. `rankedStandingsBulk` resolves any number of accounts across the current tracks, 25 per request.

```ts
interface RankedStanding {
  accountId: string;
  rankingType: string;
  mode: RankedModeInfo;          // { name: 'Reload', zeroBuild: null, combined: true, legacy, limited }
  trackguid: string;
  track: HabaneroTrack | null;
  active: boolean;               // the track is running now
  played: boolean;               // false when lastUpdated is the 1970 epoch
  current: RankInfo;
  highest: RankInfo;
  progress: number;              // 0..1 toward the next division, 1 at Unreal
  unrealRank: number | null;     // leaderboard placement once Unreal
  unrealLegend: boolean;         // top 500 Unreal in a mode that has Unreal Legend
  rating: number | null;
  highestRating: number | null;
  lastPlayed: string | null;
}

interface RankInfo {
  division: number;
  divisionCount: number;
  name: string;                  // 'Elite II', 'Unreal', 'Unreal Legend', 'Unranked'
  seasonalName: string | null;   // themed name shown that season, e.g. 'Emperor' in season 35
  tier: RankTier;                // 'bronze' … 'champion' | 'unreal' | 'unreal-legend' | 'unranked'
  subdivision: 1 | 2 | 3 | null;
  colors: { text; background; progressBar; progressBackground };
}
```

### Legacy modes

`mode.legacy` is `true` for ranked modes that are no longer part of the current lineup: the pre-combined Battle Royale / Zero Build and Reload build / zero-build tracks, Fortnite OG, The Getaway, Ballistic, Fall Guys and Rocket Racing. Legacy modes are never hidden by the package — if Epic still returns a track for them (Rocket Racing's runs until its end date) they appear in the standings, sorted after current modes. The current modes are Battle Royale, Reload and Arenas (all combined build / zero-build).

### Unreal Legend

Battle Royale and Reload (the combined tracks) show **Unreal Legend** instead of Unreal for the top of the Unreal leaderboard — the game flags these two modes with `TopTierTopLeaderboardPositions`, and `mode.unrealLegend` mirrors that. Epic does not ship the cut-off in the client, so the package uses the top **500** (`UNREAL_LEGEND_TOP_POSITIONS`); pass `unrealLegendTop` to `rankedStandings` / `rankedStandingsBulk` / `toRankedStanding` to change it. An Unreal Legend standing has `unrealLegend: true`, a `current` rank of tier `unreal-legend`, and keeps `unrealRank`. Peak (`highest`) stays Unreal, since the API does not record a peak placement.

### Seasonal rank names

Some seasons rename the top ranks — in season 35 Elite, Champion and Unreal were shown as Admiral, Grand Moff and Emperor `rankForTrack(division, track)` reads the season from the track's leaderboard id and fills `seasonalName`; `name` always stays the standard ladder name.

### Ladders

Current tracks have **22 divisions**: Bronze, Silver, Gold, Platinum, Diamond, Elite and Champion each with I–III, then Unreal. Older seasons (and Rocket Racing, Fall Guys, OG, The Getaway) use the **18-division** ladder where Elite, Champion and Unreal are single ranks. `rankForDivision(division, divisionCount)` does the mapping on its own; ladders it does not know (some event tracks have 101 divisions) come back as `Division N`.

### Helpers

`rankForDivision`, `unrankedRank`, `rankedMode(rankingType)`, `RANKED_MODES`, `RankTier`, `RANK_TIER_COLORS` and `toRankedStanding(progress, track)` are exported for raw progress you fetched yourself.

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
  currentPlayerRanking?: number;
  rankingRating?: number;
  highestRating?: number;
  startDivision?: number;
}
```

An account's standing in a track. `promotionProgress` is a `0..1` fraction toward the next division. `currentPlayerRanking` is the Unreal leaderboard placement and is only present at Unreal; `rankingRating` / `highestRating` are the matchmaking rating (`-1` when the account never played). An account that never played the track has `lastUpdated: "1970-01-01T00:00:00Z"`.

## Options
<Badge type="tip" text="interface" />

```ts
interface HabaneroBaseOptions { namespace?: string; signal?: AbortSignal; }
interface HabaneroTracksOptions extends HabaneroBaseOptions { endsAfter?: string; rankingType?: RankingType | string; }
interface HabaneroProgressOptions extends HabaneroBaseOptions { endsAfter?: string; }
interface HabaneroRankingTypeOptions extends HabaneroBaseOptions { endsAfter?: string; }
```
