# UserSearchManager

The username search behind Fortnite's in-game **Add Friends** box. Searches a name prefix through Epic's user-search service and returns candidate accounts with the display name that matched **on each platform** — Epic, PlayStation, Xbox, Steam, or Switch. Exposed as `client.userSearch` on `EpicGamesClient` and mirrored with `searchUsers*` on a live `EpicAuthSession`. Every method requires a bearer token; the search is always scoped to the signed-in account.

```ts
import { EpicGamesClient } from 'fnapi-js';

const epic = new EpicGamesClient();
const session = await epic.loginWithDeviceAuth(creds);

const results = await session.searchUsersResolved('Ninja');
for (const r of results) {
  const platforms = r.matches.map((m) => `${m.platform}:${m.value}`).join(', ');
  console.log(`[${r.matchType}] ${r.displayName ?? r.accountId} — ${platforms}`);
}
```

::: tip Platform
`platform` picks which platform's names are searched — `epic` (default), `psn`, `xbl`, `steam`, or `nsw`. Searching `psn` matches PlayStation online ids, `xbl` matches gamertags, and so on. Use the `UserSearchPlatform` enum for the valid values.
:::

## userSearch.search
<Badge type="info" text="method" />

```ts
search(accessToken: string, accountId: string, prefix: string, options?: UserSearchOptions): Promise<UserSearchResult[]>
```

Runs the raw search. `accountId` is the searcher (your own account). Returns Epic's ranked list — `matchType` is `exact` or `prefix`, and each result's `matches` carry the value that hit on the requested platform.

| Parameter | Type | Description |
| --- | --- | --- |
| `accessToken` | `string` | Bearer token. |
| `accountId` | `string` | The account performing the search (yours). |
| `prefix` | `string` | The username to search for. |
| `options.platform` | `UserSearchPlatform` | Platform to search (defaults to `epic`). |
| `options.signal` | `AbortSignal` | Optional abort signal. |

**Returns:** `Promise<UserSearchResult[]>` · **Session:** `session.searchUsers(prefix, options?)`

## userSearch.searchResolved
<Badge type="info" text="method" />

```ts
searchResolved(accessToken: string, accountId: string, prefix: string, options?: UserSearchOptions): Promise<ResolvedUserSearchResult[]>
```

Same search, then resolves every hit's Epic account in one bulk call and stitches the `displayName` and full `account` onto each row — the common case when you want to show real names next to the platform matches.

**Returns:** `Promise<ResolvedUserSearchResult[]>` · **Session:** `session.searchUsersResolved(prefix, options?)`

## Types
<Badge type="tip" text="interface" />

```ts
const UserSearchPlatform = {
  Epic: 'epic',
  PlayStation: 'psn',
  Xbox: 'xbl',
  Steam: 'steam',
  Nintendo: 'nsw',
} as const;

interface UserSearchResult {
  accountId: string;
  matches: UserSearchMatch[];
  matchType: 'exact' | 'prefix';
  epicMutuals: number;
  sortPosition: number;
}

interface UserSearchMatch {
  value: string;
  platform: UserSearchPlatform;
}

interface ResolvedUserSearchResult extends UserSearchResult {
  displayName?: string;
  account?: EpicAccount;
}
```

`USER_SEARCH_BASE_URL`, `USER_SEARCH_PLATFORM_LIST`, and the `isUserSearchPlatform` guard are exported for advanced use.
