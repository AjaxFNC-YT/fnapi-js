# Content Pages & MOTDs

Two sources feed Fortnite's in-game news. The **content pages** (`fortnitecontent-website-prod07`) are a public CMS document holding emergency notices, tournament artwork, lobby backgrounds, shop sections and more — no login needed, exposed as `epic.content`. The personalised **MOTDs** (the news tiles you see in the lobby) come from Epic's PRM dialog service and need an account, so they live on the session as `session.motds()`.

```ts
import { EpicGamesClient } from 'fnapi-js';

const epic = new EpicGamesClient();

const notices = await epic.content.emergencyNotices();
const shadowCup = await epic.content.tournament('s42_shadow');

const session = await epic.loginWithDeviceAuth(creds);
const motds = await session.motds();
console.log(motds.map((motd) => motd.contentFields.TeaserTitle));
```

## content.pages / content.page
<Badge type="info" text="method" />

```ts
pages(key?: ContentPageKey | string, options?: ContentPageOptions): Promise<ContentPage>
page<T>(key: ContentPageKey | string, subKey: string, options?: ContentPageOptions): Promise<T>
```

`pages` returns the whole document for `'fortnite-game'` (default) or `'fortnite-editor'` (UEFN). Every top-level section carries `_title`, `_templateName`, `_activeDate` and `lastModified`. `page` fetches one section by its lowercase `_title` — `shopSections` has the title `shop-sections`, so that is the sub key.

`ContentPageOptions`: `lang` (default `en`), `signal`, and `cache`. Content pages are cached for 60 seconds by default, so calling several accessors in a row costs one request; pass `cache: false` to force a fresh read or `cache: { ttl }` to change the window.

## Typed accessors
<Badge type="info" text="method" />

```ts
emergencyNotices(options?): Promise<ContentEmergencyNotice[]>
motds(options?): Promise<ContentMotd[]>
tournaments(options?): Promise<ContentTournament[]>
tournament(displayId: string, options?): Promise<ContentTournament | null>
backgrounds(options?): Promise<ContentBackground[]>
shopSections(options?): Promise<ContentShopSection[]>
loginMessage(options?): Promise<ContentLoginMessage | null>
```

| Accessor | Section | Notes |
| --- | --- | --- |
| `emergencyNotices` | `emergencynoticev2` | Downtime / incident banners; each has `title`, `body`, `hidden` and optional `platforms` / `gamemodes`. Empty when nothing is posted. |
| `motds` | `battleroyalenewsv2` | The legacy CMS MOTDs. Epic now serves lobby MOTDs from PRM — use [`session.motds()`](#session-motds) for the live tiles. |
| `tournaments` / `tournament` | `tournamentinformation` | Display info for every tournament: titles, descriptions, poster/tile/background images and colours, keyed by `tournament_display_id`. |
| `backgrounds` | `dynamicbackgrounds` | Lobby and vault background images with their `stage`. |
| `shopSections` | `shopSections` | Shop section ids, display names, landing priority and visibility flags. |
| `loginMessage` | `loginmessage` | `null` unless Epic has a login message up. |

Every section not covered here is still on the raw `pages()` result.

## session.motds
<Badge type="info" text="method" />

```ts
motds(options?: MotdOptions): Promise<MotdItem[]>
```

Posts the PRM `channel/motd/target` request for the signed-in account and returns its `contentItems` (an empty array when Epic answers `204`). `MotdOptions`: `channel` (default `motd`), `tags` (default `['Product.BR']`; use e.g. `Product.Juno` or `Product.DelMar` for other modes) and `parameters` merged over `{ platform: 'Windows', language: 'en', serverRegion: 'NAE', country: 'US' }`.

Each `MotdItem` has a `contentHash`, `contentSchemaName` (`DynamicMotd`), `placements` (tracking id, tag, position) and `contentFields`: `TeaserTitle`, `FullScreenTitle`, `FullScreenBody`, `TeaserBackground` / `FullScreenBackground` (sized `Image[]` plus an optional `Video`) and `Buttons` with their `Action`.

`MotdManager` is also exposed as `epic.motd.target(accessToken, options)` for use with your own token.
