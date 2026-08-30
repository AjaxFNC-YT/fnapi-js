# EcosystemEndpoint

Fortnite Ecosystem API — island discovery plus engagement and concurrency metrics for public, discoverable islands. This is one of Epic's **official** APIs, so it lives on the Epic client and is reached via `client.ecosystem` (or `fn.epic.ecosystem` / `fn.ecosystem` through the [umbrella](/guide/client-options)). It talks to Epic's own host (`https://api.fortnite.com/ecosystem/v1`), needs **no API key** and no login, and returns responses raw (they are not wrapped in the `{ status, data }` envelope fortnite-api.com uses).

::: tip Data limitations
The upstream API only exposes the last **7 days** of history and only public/discoverable islands. Intervals with fewer than 5 unique players report `null`, and `favorites`/`recommendations` return `0` for some Epic-made islands. Intervals are `'minute'`, `'hour'`, or `'day'`; an invalid interval throws `ValidationError` before any request is made.
:::

## EcosystemEndpoint
<Badge type="tip" text="class" />

```ts
class EcosystemEndpoint
```

Wrapper for `/ecosystem/v1`, built over the Epic client's unauthenticated `RestClient`. Island codes and genre slugs are validated (non-empty string) and URL-encoded. `from`, `to`, and `at` accept a `string`, epoch `number`, or `Date` and are normalized to ISO-8601.

```ts
import { EpicGamesClient } from 'fnapi-js';

const client = new EpicGamesClient();
const { data } = await client.ecosystem.islands({ size: 20 });
console.log(data[0]?.code, data[0]?.title);
```

## islands
<Badge type="info" text="method" />

```ts
islands(options?: EcosystemPageOptions): Promise<EcosystemIslandsResponse>
```

Lists public islands with cursor pagination.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `EcosystemPageOptions` | Optional `after`/`before` cursors, `size` page length, plus transport controls. |

**Returns:** `Promise<EcosystemIslandsResponse> — { links, meta, data[] }`

```ts
let page = await client.ecosystem.islands({ size: 50 });
while (page.meta.page.nextCursor) {
  page = await client.ecosystem.islands({ after: page.meta.page.nextCursor });
}
```

## island
<Badge type="info" text="method" />

```ts
island(code: string, options?: BaseOptions): Promise<EcosystemIslandSummary>
```

Fetches a single island by its `xxxx-xxxx-xxxx` code. Throws `NotFoundError` when the code is unknown.

| Parameter | Type | Description |
| --- | --- | --- |
| `code` | `string` | The island code. |
| `options` | `BaseOptions` | Transport controls. |

**Returns:** `Promise<EcosystemIslandSummary> — the island's metadata`

```ts
const island = await client.ecosystem.island('1865-4829-7018');
console.log(island.title, island.tags);
```

## findIsland
<Badge type="info" text="method" />

```ts
findIsland(code: string, options?: BaseOptions): Promise<EcosystemIslandSummary | null>
```

Same as `island()` but returns `null` instead of throwing `NotFoundError`. Other errors still propagate.

```ts
const island = await client.ecosystem.findIsland('0000-0000-0000');
if (!island) console.log('No such island');
```

## islandMetrics
<Badge type="info" text="method" />

```ts
islandMetrics(code: string, options?: EcosystemRangeOptions): Promise<EcosystemIslandMetricsResponse>
```

Aggregate engagement metrics for an island over an optional `from`/`to` range.

| Parameter | Type | Description |
| --- | --- | --- |
| `code` | `string` | The island code. |
| `options` | `EcosystemRangeOptions` | Optional `from`/`to` (`string \| number \| Date`) plus transport controls. |

**Returns:** `Promise<EcosystemIslandMetricsResponse>`

```ts
const metrics = await client.ecosystem.islandMetrics('1865-4829-7018', {
  from: '2026-08-13T00:00:00.000Z',
  to: new Date(),
});
console.log(metrics.peakCCU, metrics.uniquePlayers);
```

## islandMetricsByInterval
<Badge type="info" text="method" />

```ts
islandMetricsByInterval(code: string, interval: EcosystemInterval, options?: EcosystemIslandMetricsOptions): Promise<EcosystemFilterableIslandMetricsResponse>
```

Time-series metrics bucketed by `interval`. Pass `metrics` to request only a subset of series.

| Parameter | Type | Description |
| --- | --- | --- |
| `code` | `string` | The island code. |
| `interval` | `EcosystemInterval` | `'minute' \| 'hour' \| 'day'`. |
| `options` | `EcosystemIslandMetricsOptions` | Optional `metrics` (`IslandMetric[]`), `from`/`to`, plus transport controls. |

**Returns:** `Promise<EcosystemFilterableIslandMetricsResponse>`

```ts
import { IslandMetric } from 'fnapi-js';

const series = await client.ecosystem.islandMetricsByInterval('1865-4829-7018', 'hour', {
  metrics: [IslandMetric.PeakCCU, IslandMetric.UniquePlayers],
});
```

## Single-metric island series
<Badge type="info" text="methods" />

Convenience wrappers that each return one series for a `code` + `interval`, over an optional `from`/`to` range. All resolve to `EcosystemMetricResponse` except `islandRetention`, which resolves to `EcosystemRetentionResponse`.

```ts
islandPeakCcu(code, interval, options?)               // .../metrics/{interval}/peak-ccu
islandFavorites(code, interval, options?)             // .../favorites
islandMinutesPlayed(code, interval, options?)         // .../minutes-played
islandAverageMinutesPerPlayer(code, interval, options?) // .../average-minutes-per-player
islandRecommendations(code, interval, options?)       // .../recommendations
islandUniquePlayers(code, interval, options?)         // .../unique-players
islandPlays(code, interval, options?)                 // .../plays
islandRetention(code, interval, options?)             // .../retention  → d1/d7 values
```

```ts
const ccu = await client.ecosystem.islandPeakCcu('1865-4829-7018', 'day');
const retention = await client.ecosystem.islandRetention('1865-4829-7018', 'day');
console.log(retention.intervals?.[0]?.d1, retention.intervals?.[0]?.d7);
```

## islandRankings
<Badge type="info" text="method" />

```ts
islandRankings(code: string, options?: EcosystemRangeOptions): Promise<EcosystemIslandRankingResponse>
```

Genre-rank snapshots for an island. Without a `from`/`to` range only the latest snapshot is returned.

**Returns:** `Promise<EcosystemIslandRankingResponse>`

```ts
const rankings = await client.ecosystem.islandRankings('1865-4829-7018');
for (const genre of rankings.data[0]?.genres ?? []) {
  console.log(genre.genre, genre.rank);
}
```

## genres
<Badge type="info" text="method" />

```ts
genres(options?: BaseOptions): Promise<EcosystemGenreListResponse>
```

Lists the ranking genres (slug + display name).

```ts
const { data } = await client.ecosystem.genres();
console.log(data.map((genre) => genre.slug));
```

## genreRankings
<Badge type="info" text="method" />

```ts
genreRankings(slug: string, options?: EcosystemGenreRankingOptions): Promise<EcosystemGenreRankingResponse>
```

Leaderboard of islands within a genre. Pass `at` to read a historical snapshot.

| Parameter | Type | Description |
| --- | --- | --- |
| `slug` | `string` | The genre slug (from `genres()`). |
| `options` | `EcosystemGenreRankingOptions` | Optional `at` (`string \| number \| Date`), `after`/`before`, `size`, plus transport controls. |

**Returns:** `Promise<EcosystemGenreRankingResponse>`

```ts
const board = await client.ecosystem.genreRankings('simulation-tycoon', { size: 25 });
for (const entry of board.data) {
  console.log(entry.rank, entry.islandCode);
}
```

## Ecosystem-wide concurrency
<Badge type="info" text="methods" />

```ts
metrics(interval: EcosystemInterval, options?: EcosystemMetricsOptions): Promise<EcosystemFilterableMetricsResponse>
inClientPeakCcu(interval: EcosystemInterval, options?: EcosystemRangeOptions): Promise<EcosystemMetricResponse>
inMatchPeakCcu(interval: EcosystemInterval, options?: EcosystemRangeOptions): Promise<EcosystemMetricResponse>
```

Global concurrency across all of Fortnite. `metrics` returns both series (filter with `metrics: EcosystemMetric[]`); the two helpers each return one series.

```ts
import { EcosystemMetric } from 'fnapi-js';

const all = await client.ecosystem.metrics('minute', {
  metrics: [EcosystemMetric.InMatchPeakCCU, EcosystemMetric.InClientPeakCCU],
});
const inMatch = await client.ecosystem.inMatchPeakCcu('hour');
```
