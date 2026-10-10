# Tournaments

Tournaments come from Epic's **Events service** (`events-public-service-live`). The session reads the event list and joins each event with its display info from the [content pages](/epic/content), such as names, posters and colours. For every window it resolves the playlist, match cap, scoring rules, prize tables and ranked brackets, and works out from the player's tokens whether they can enter. It also reads window leaderboards, score lookups and the player's own history.

```ts
const session = await epic.loginWithDeviceAuth(creds);

for (const cup of await session.tournaments({ region: 'EU' })) {
  console.log(`[${cup.status}] ${cup.name}`, cup.nextWindow?.beginTime, cup.nextWindow?.eligible);
}
```

All calls need an account-bound session.

## tournaments
<Badge type="info" text="method" />

```ts
tournaments(options?: {
  region?: string;
  showPastEvents?: boolean;
  showPrivateEvents?: boolean;
  eligibility?: boolean;
  now?: number;
  cache?: boolean | { ttl: number };
  signal?: AbortSignal;
}): Promise<Tournament[]>
```

Returns the tournaments in the order the game lists them:

1. live tournaments
2. upcoming ones, soonest first
3. finished ones, most recent first

Leave `region` out to get every region. Use `EventRegion` for the codes: `NAE`, `NAW`, `NAC`, `EU`, `BR`, `ASIA`, `OCE`, `ME`.

With `eligibility` on (the default), the player's tournament tokens are fetched and each window gets `eligible`. That flag checks only the token requirements: the required-all and required-any lists, and the banned or region-locked tokens. Other requirements are listed in `window.requirements` but not checked:

- `mfa`
- `eula:…`
- account level
- `leaderboard:…:rank:N`

The event list is cached for 60 seconds by default.

| Field | Description |
| --- | --- |
| `eventId` / `displayId` | Service id and content display id. |
| `name` / `subtitle` / `description` / `schedule` | Display text. `name` falls back to the event id. |
| `type` | `tournamentType`, e.g. `FNCS`, `CashCup`, `RankedCup`, `ShopCup`. |
| `status` | `'live' \| 'upcoming' \| 'ended'`. |
| `nextWindow` | The live window, else the next upcoming one, else `null`. |
| `windows` | Every `TournamentWindow`, in time order. |
| `regions` / `platforms` / `minimumAccountLevel` | Entry info. |
| `images` / `colors` | `poster`, `posterBack`, `square`, `background`, `loadingScreen` and `playlistTile` images, plus `primary`, `secondary` and `title` colours. |
| `linkCode` | The `tournament_…` link code. |
| `display` / `raw` | The content entry and the raw event. |

### TournamentWindow

| Field | Description |
| --- | --- |
| `id`, `round`, `status` | Window id, round number, and its own live/upcoming/ended status. |
| `countdownTime`, `beginTime`, `endTime`, `isTBD` | Schedule. |
| `playlistId`, `matchCap` | From the window's event template. |
| `requirements` | Extra requirements such as `mfa` and `eula:…`. |
| `requiredTokens` | `{ all, any, none }` token lists. |
| `eligible` | Token eligibility, or `null` when eligibility was skipped. |
| `scoring` | Scoring rules: `{ trackedStat, matchRule, rewardTiers }`. |
| `payouts` | Prize tiers: `{ scoringType, ranks: [{ threshold, payouts }] }`. |
| `brackets` | Sub-leaderboards with their own `scoring` and `payouts`, such as the per-rank brackets in Ranked Cups. |
| `leaderboards`, `canLiveSpectate`, `raw` | Leaderboard definition ids, spectating, and the raw window. |

## tournamentLeaderboard
<Badge type="info" text="method" />

```ts
tournamentLeaderboard(eventId: string, eventWindowId: string, options?: {
  page?: number;
  rank?: number;
  teamAccountIds?: string[];
  showLiveSessions?: boolean;
}): Promise<EventLeaderboard>
```

Returns one page of 100 entries from a window leaderboard. The service exposes at most 100 pages (`page` 0–99). Each entry has these fields:

- `rank`
- `pointsEarned`
- `score`, the tiebreaker-packed value
- `teamAccountIds`
- `pointBreakdown`
- `sessionHistory`, with the tracked stats of each match

```ts
const board = await session.tournamentLeaderboard(cup.eventId, cup.windows[0].id, { page: 0 });
console.log(board.entries[0].rank, board.entries[0].pointsEarned);
```

## tournamentScores
<Badge type="info" text="method" />

```ts
tournamentScores(eventId: string, eventWindowId: string, options: {
  teams: string[][];
  fromIndex?: number;
  aroundTeamIds?: string[][];
  findTeams?: boolean;
}): Promise<EventScore[]>
```

This is the in-game friends-leaderboard lookup. Pass the `teams` you care about and either `fromIndex` or `aroundTeamIds`; every account in `aroundTeamIds` must also be in `teams`. It resolves to `[]` when none of the teams have a score in range. It only works for events from Season 22 onwards.

## tournamentHistory
<Badge type="info" text="method" />

```ts
tournamentHistory(eventId: string, options?: { eventWindowId?: string; accountId?: string; teamAccountIds?: string[] }): Promise<EventScore[]>
```

Returns the player's scores across every window of an event, or for one window when you pass `eventWindowId`.

## tournamentPlayer / tournamentTokens
<Badge type="info" text="method" />

```ts
tournamentPlayer(accountId?: string): Promise<EventPlayer>
tournamentTokens(accountIds?: string[]): Promise<EventTokens>
```

`tournamentPlayer` returns the player's tournament profile: `tokens`, `teams`, `persistentScores` (Hype), `pendingPayouts` and `groupIdentity`. `tournamentTokens` returns just the tokens for several accounts.

## tournamentData
<Badge type="info" text="method" />

```ts
tournamentData(options?: { region?: string; showPastEvents?: boolean; showPrivateEvents?: boolean }): Promise<EventsData>
```

Returns the raw event bundle: events, templates, leaderboard definitions, scoring rule sets, payout tables and score-location maps. Pass it to `toTournaments(data, contentTournaments, { tokens, now })` to shape it yourself. `windowStatus(window)` and `windowEligible(window, tokens)` are exported too.

## EventsManager
<Badge type="tip" text="class" />

`epic.events` is the low-level client. Every method takes an access token:

- `data`
- `download`, which needs `region` and `platform`
- `player`
- `tokens`
- `history`
- `leaderboard`
- `scores`
