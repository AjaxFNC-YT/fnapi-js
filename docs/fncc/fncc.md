# FnccAPI

`FnccAPI` wraps **fn-api.cc** (`https://prod.fn-api.cc`) — a CUE4Parse-backed dataset service that surfaces Fortnite cosmetics, banners, OG sprites, AES keys, `.usmap` mappings, raw asset exports, and a live image renderer. Every route sits under a `/v1` prefix and needs **no API key**.

::: warning A different service
fn-api.cc is its own service — not fortnite-api.com ([`FortniteAPI`](/fortnite/fortnite-api)) nor fortniteapi.com ([`DillyAPI`](/dilly/dilly)). Most routes return the `{ status, data }` envelope (unwrapped for you); status, game, search, asset, and lookup routes return their bodies **raw**. Every type is checked field-for-field against the live API by `tests/live/fncc.test.ts` — a missing, mistyped, or new field fails that suite.
:::

```ts
import { FnccAPI } from 'fnapi-js';

const fncc = new FnccAPI();

const version = await fncc.game.version();
console.log(version.gameVersion, version.datasetBuild);

const results = await fncc.cosmetics.search('br', { name: 'renegade', matchMethod: 'contains' });
console.log(`${results.total} matches`);
```

Reachable standalone (`new FnccAPI()`) or through the [umbrella client](/guide/client-options) as `fn.fncc`. Transport options (`timeout`, `retry`, `headers`, `query`, `cache`, `fetch`, `userAgent`, `baseUrl`) match the rest of the package — see [`FnccAPIOptions`](/guide/client-options).

## status
<Badge type="info" text="endpoint" /> `fncc.status`

```ts
overview(options?: FnccBaseOptions): Promise<FnccStatus>
download(options?: FnccBaseOptions): Promise<FnccDownload>
parser(options?: FnccBaseOptions): Promise<FnccParser>
maintenance(options?: FnccBaseOptions): Promise<FnccMaintenance>
```

Backend health. `overview` bundles the dataset, game-download, parser, and maintenance sub-states in one call; the other three drill into each subsystem (raw passthrough).

```ts
const status = await fncc.status.overview();
console.log(status.ready, status.parser.state, status.game.installedVersion);
```

## game
<Badge type="info" text="endpoint" /> `fncc.game` · `fncc.version()` · `fncc.aes()` · `fncc.mappings()`

```ts
version(options?: FnccBaseOptions): Promise<FnccVersion>
aes(options?: FnccBaseOptions): Promise<FnccAes>
mappings(options?: FnccBaseOptions): Promise<FnccMappings>
```

The tracked build (`gameVersion`, the `cleanBuild` people call the version such as `42.30`, `changelist`, `branch`, `datasetBuild`, per-category counts), the current AES keys (`mainKey` + `dynamicKeys[]`), and the active `.usmap` mappings file. `fncc.version()`/`fncc.aes()`/`fncc.mappings()` are flat shortcuts for the `game.*` methods.

```ts
const aes = await fncc.aes();
console.log(aes.mainKey, aes.dynamicKeys.length);
```

## cosmetics
<Badge type="info" text="endpoint" /> `fncc.cosmetics`

```ts
all(options?: FnccBaseOptions): Promise<FnccCosmeticsByCategory>
searchAll(options: FnccCosmeticSearchOptions): Promise<FnccCosmeticSearchAllResponse>
categories(options?: FnccBaseOptions): Promise<FnccCosmeticCategories>
types(options?: FnccBaseOptions): Promise<FnccCosmeticType[]>
category(category: string, options?: FnccBaseOptions): Promise<FnccCosmetic[]>
get(category: string, id: string, options?: FnccBaseOptions): Promise<FnccCosmetic>
search(category: string, options?: FnccCosmeticSearchOptions): Promise<FnccCosmeticSearchResponse>
```

`all` returns every category keyed by name (tens of megabytes); `searchAll` searches every category at once and returns a flat page where each hit carries its `category` — it requires at least one filter so it never falls back to the full dump. `categories` is the name → count map; `types` lists every cosmetic type with its locker icon and item count. `category` pulls one category's array and `get` fetches one item by id or exact display name (`get` also carries `media` — a turntable video / audio preview — and `images.render` when Epic has one).

Filters: `search` (name, id, description, artist, type, series and set at once), `name`, `description`, `id`, `artist`, `album`, `type`, `rarity`, `series`, `set`, `introduction`, plus `matchMethod` (`contains` | `full` | `starts` | `ends`), `limit`, `offset`. A blank `category` or `id` throws `ValidationError` before any request.

Two categories have their own item shape and the overloads type them for you: `'tracks'` returns `FnccTrack` (jam tracks: `title`, `artist`, `bpm`, `difficulty`, `albumArt`, …) and `'beans'` returns `FnccBean` (Fall Guys). Every other category returns `FnccCosmetic`.

```ts
const categories = await fncc.cosmetics.categories();
const hits = await fncc.cosmetics.searchAll({ search: 'hiroshi', limit: 10 });
const tracks = await fncc.cosmetics.category('tracks');
const trooper = await fncc.cosmetics.get('br', 'CID_017_Athena_Commando_M');
console.log(trooper.images.render, trooper.rarity?.hexColors);
```

## rarities
<Badge type="info" text="endpoint" /> `fncc.rarities`

```ts
list(options?: FnccBaseOptions): Promise<FnccRarityTier[]>
```

Every rarity tier with the game's own colours (`colors`, `hexColors`), the card `gradient` numbers, the rendered `image` and real `card`, and how many `cosmetics` / `weapons` carry it. Every embedded `rarity` object on cosmetics, banners and shop items has the same colour fields.

## banners
<Badge type="info" text="endpoint" /> `fncc.banners`

```ts
list(options?: FnccBaseOptions): Promise<FnccBanner[]>
colors(options?: FnccBaseOptions): Promise<FnccBannerColor[]>
```

Banner icons and the banner color palette (each color carries `primaryColor`/`secondaryColor` as RGBA + hex).

## sprites
<Badge type="info" text="endpoint" /> `fncc.sprites`

```ts
list(options?: FnccSpritesOptions): Promise<FnccSpritesResponse>
get(id: string, options?: FnccBaseOptions): Promise<FnccSprite>
```

Extraction sprites with perks, variants, spawn rules (`spawn`) and how each is obtained (`acquisition`). `enabled` reflects Epic's live hotfix. `list` accepts `enabled` and `library` filters and keeps `count`, `hotfixAppliedAt` and the `hotfixRules` count on the envelope; `get` resolves one sprite by registry or mapping id (blank id throws `ValidationError`).

## search
<Badge type="info" text="endpoint" /> `fncc.search`

```ts
paths(query: string, options?: FnccPageOptions): Promise<FnccPage<FnccSearchHit>>
content(query: string, options?: FnccContentSearchOptions): Promise<FnccContentSearchResult>
```

`paths` searches asset paths by substring with `offset`/`limit` paging. `content` searches inside asset bytes (UTF-8 and UTF-16), scoped by `prefix`/`extension` and bounded by `maxFiles`/`timeBudgetMs` (`ignoreCase` optional); each item carries `matchCount` and `matches[]` with the surrounding `text`, byte `offset` and `encoding`, and the result reports `scanned`, `hits` and whether it was `truncated`. Both require a non-empty `query`.

```ts
const page = await fncc.search.paths('renegade', { limit: 20 });
console.log(page.total, page.items[0]?.path);
```

## assets
<Badge type="info" text="endpoint" /> `fncc.assets`

```ts
list(options?: FnccAssetsListOptions): Promise<FnccPage<FnccAssetEntry>>
search(query: string, options?: FnccPageOptions): Promise<FnccPage<FnccAssetEntry>>
paths(options?: FnccAssetPathsOptions): Promise<FnccPage<string>>
pathsTextUrl(options?: FnccAssetPathsOptions): string
fixPath(path: string, options?: FnccBaseOptions): Promise<FnccFixedPath>
fixPaths(paths: string[], options?: FnccBaseOptions): Promise<FnccFixedPath[]>
exports(path: string, options?: FnccBaseOptions): Promise<string[]>
json<T>(path: string, name?: string, options?: FnccBaseOptions): Promise<T>
package(path: string, options?: FnccBaseOptions): Promise<FnccAssetPackage>
archives(options?: FnccBaseOptions): Promise<FnccArchive[]>
rawUrl(path: string): string
```

`list`/`search` page the asset index; each entry has `path`, `extension`, `size` and the `archiveName` it lives in. `paths` pages bare path strings (`q`, `prefix`, `extension`); for a full dump use `pathsTextUrl`, which points at the newline-separated text stream (`limit: 0` streams every match).

`fixPath` turns any file, game or object path into the object path the game uses (`/Game/...Name.Name`) with its `class`, `archive` and `exports`; `fixPaths` resolves a batch in one POST and keeps input order — unknown paths come back with `found: false` and an `error`.

`exports` returns the export names (`"Name (Class)"`); `json` pulls the parsed exports (optionally a single named one); `package` maps each package segment (`.uasset`/`.uexp`/`.ubulk`) to its base64 bytes; `archives` lists every pak/utoc with its encryption key guid and mount state. `rawUrl` builds the raw-bytes download URL without sending a request. The `path`/`query` arguments are validated non-empty.

```ts
const cid = 'FortniteGame/Plugins/GameFeatures/BRCosmetics/Content/Athena/Items/Cosmetics/Characters/CID_017_Athena_Commando_M';
const exports = await fncc.assets.exports(cid);
const fixed = await fncc.assets.fixPath(`${cid}.uasset`);
console.log(fixed.objectPath, fixed.class);
```

## images
<Badge type="info" text="endpoint" /> `fncc.images`

```ts
url(options: FnccImageOptions): string
```

Builds an absolute URL to fn-api.cc's on-the-fly image renderer for an asset `path` (optional `name`, `format` — `png` | `jpeg` | `webp` | `tga` — and `maxSize`). Pure string builder — it never sends a request. A blank `path` throws `ValidationError`.

```ts
const src = fncc.images.url({ path: 'FortniteGame/Content/.../CID_028', format: 'png', maxSize: 512 });
```

## weapons
<Badge type="info" text="endpoint" /> `fncc.weapons`

```ts
list(options?: FnccWeaponsOptions): Promise<FnccWeaponsResponse>
categories(options?: FnccBaseOptions): Promise<FnccWeaponFilters>
get(id: string, options?: FnccWeaponOptions): Promise<FnccWeapon>
```

`list` keeps the `{ total, count, data }` envelope and filters by `search`, `category`, `rarity`, `ammo`, `trigger`, `type`, `tag`, `ranged`, `melee`, `hasIcon`, `hasStats`, `sort`, `order`, `limit`, `offset`. `categories` returns the filter facet counts; `get` unwraps a single weapon (`includeRaw` attaches the untouched balance row as `stats.raw`). `rarity` is a plain string (`Legendary`), `tier` a number, and `stats` — damage per range band, DPS, fire rate, clip, reload, spread and recoil — is `null` for the few definitions with no balance row.

```ts
const ars = await fncc.weapons.list({ rarity: 'legendary', ranged: true, limit: 10 });
const facets = await fncc.weapons.categories();
```

## fish
<Badge type="info" text="endpoint" /> `fncc.fish`

```ts
list(options?: FnccFishOptions): Promise<FnccFish[]>
get(id: string, options?: FnccBaseOptions): Promise<FnccFish>
```

`list` filters by `search`, `rarity`, `enabled`, `needsProFishingRod`; `get` unwraps a single fish by id, asset name or display name. `rarity` is a plain string (`rare`); `image`/`smallImage` are texture paths you can render with [`images.url`](#images).

## itemshop
<Badge type="info" text="endpoint" /> `fncc.itemshop`

```ts
current(options?: FnccItemShopOptions): Promise<FnccItemShop>
sections(options?: FnccBaseOptions): Promise<FnccItemShopSections>
```

`current` returns the live shop with `offerCount`/`resetsAt`/`catalogExpiresAt` metadata and every `FnccShopOffer` in `data` (`section` filter narrows it). Each offer carries its `price` (regular, final, discount, sale type), tile `colors`, `layout`, resolved `items` (name, rarity, series, CDN images), `bundle` details and `media` previews. `sections` lists the layout sections with their offer groups and stack ranks.

## bundles
<Badge type="info" text="endpoint" /> `fncc.bundles`

```ts
list(options?: FnccBundlesOptions): Promise<FnccBundlesResponse>
get(id: string, options?: FnccBaseOptions): Promise<FnccBundle>
```

Shop bundles recorded every rotation: items with per-item prices, the bundle price, `firstSeen`/`lastSeen` and `occurrences`. `list` filters by `q`, `item`, `seen`, `inShop` with `limit`/`offset`; `get` accepts a bundle id, storefront bundle id, display asset or exact name.

```ts
const inShop = await fncc.bundles.list({ inShop: true });
const wayne = await fncc.bundles.get('NoiseClue_Bundle');
```

## playlists
<Badge type="info" text="endpoint" /> `fncc.playlists`

```ts
list(options?: FnccPlaylistsOptions): Promise<FnccPlaylist[]>
get(id: string, options?: FnccPlaylistOptions): Promise<FnccPlaylist>
```

`list` filters by `gameType`, `tag`, `tournament`, `ranked`, `limitedTime`, `default`, `fetchImages`; `get` pulls one playlist by id or display name (`fetchImages` resolves `images.cover`). Each playlist carries its `lootPool` summary, `parentExperience` mnemonic, structured `matchmaking` config and an `added` timestamp.

## lootpool
<Badge type="info" text="endpoint" /> `fncc.lootpool`

```ts
list(options?: FnccBaseOptions): Promise<FnccLootPoolSummary[]>
all(options?: FnccBaseOptions): Promise<FnccLootPoolWithContainers[]>
search(options?: FnccLootSearchOptions): Promise<FnccLootSearchResponse>
item(itemId: string, options?: FnccBaseOptions): Promise<FnccLootHit[]>
get(id: string, options?: FnccBaseOptions): Promise<FnccLootPool>
containers(id: string, options?: FnccBaseOptions): Promise<FnccLootPoolContainers>
container(id: string, container: string, options?: FnccBaseOptions): Promise<FnccLootContainer>
```

Loot pools resolved from the game's tier and package tables with live hotfixes applied — one entry per real pool, not per playlist. `get` returns a pool with its tables, playlists, hotfixes and every container's items and drop `chance`; `containers` lists the containers with item counts; `container` drills into one. `search` matches items across every pool (`q`, `item`, `container`, `experience`, `map`, `rarity`, `zeroBuild`, `ranked`, `minChance`) ordered by drop chance; `item` lists every pool and container one item drops from. `all` is the full breakdown of every pool — a large response.

```ts
const shotguns = await fncc.lootpool.search({ q: 'shotgun', experience: 'br', limit: 10 });
const floor = await fncc.lootpool.container('br-athenacompositelp', 'Loot_AthenaFloorLoot');
```

## seasons
<Badge type="info" text="endpoint" /> `fncc.seasons`

```ts
list(options?: FnccBaseOptions): Promise<FnccSeason[]>
get(season: string | number, options?: FnccBaseOptions): Promise<FnccSeason>
current(options?: FnccBaseOptions): Promise<FnccSeason>
```

Every season mapped to its chapter and display name; `current`, `gameName` and `storefront` follow the live build. `get` takes a season number, a display name or `'current'`.

## battlepasses
<Badge type="info" text="endpoint" /> `fncc.battlepasses`

```ts
list(options?: FnccBaseOptions): Promise<FnccBattlePass[]>
get(pass: string | number, options?: FnccBaseOptions): Promise<FnccBattlePass>
```

Every season pass in the build (Battle Pass, Music Pass, LEGO Pass, OG Pass) with its offer ids and reward track grouped into `categories`; each reward has its `tier`, `cost` and pass `currency`, joined to the cosmetic catalogue for name, rarity and images. `get` takes an asset id, season number or a name like `'Music Pass'`.

## modes
<Badge type="info" text="endpoint" /> `fncc.modes`

```ts
list(options?: FnccBaseOptions): Promise<FnccModes>
get(id: string, options?: FnccBaseOptions): Promise<FnccMode>
```

Game modes (Battle Royale, Reload, Blitz, OG) with their maps — internal `code` plus the `name` players see — what is `inRotation`, the rotation schedule with playlist `substitutions`, and where a mode or map is forced on or off. `list` also returns the current `season` window.

```ts
const { modes } = await fncc.modes.list();
const reload = await fncc.modes.get('reload');
```

## quests
<Badge type="info" text="endpoint" /> `fncc.quests`

```ts
catalog(options?: FnccQuestCatalogOptions): Promise<FnccQuestCatalog>
categories(options?: FnccQuestFilterOptions): Promise<FnccQuestCategories>
bundles(options?: FnccQuestFilterOptions): Promise<FnccQuestBundles>
stw(options?: FnccQuestTextOptions): Promise<FnccStwQuests>
get(templateId: string, options?: FnccQuestTextOptions): Promise<FnccQuestEntry>
lookup(templateIds: string[], options?: FnccQuestTextOptions): Promise<FnccQuestLookup>
```

The quest data from the game files, extracted once per Fortnite build:

- **Quests:** names, objective text and targets, sort priority, category tags and visibility.
- **Challenge bundles:** their tags and quests in order.
- **Quest page categories:** names, sort order, include tags and headers, plus the mode each belongs to.
- **Save the World:** STW quests and STW categories.

`catalog` returns everything in one response, and the other methods return one part. Every map key and `templateId` is lowercase.

Each quest also carries a few extra fields:

- `includedInCategories`: `false` for hidden tracker quests.
- `canShowInPostMatch`
- `completionText`
- on each objective, `displayStage` and `displayMaxStage`, for "step 1 of 4" chains. This is what [`QuestCatalog`](/epic/quests) loads.

| Option | Description |
| --- | --- |
| `lang` | Language for every text field (default `en`). |
| `mode` | One mode or a list, e.g. `'festival'` or `['battle-royale', 'reload']`. Keeps only those categories and the quests and bundles in them. |
| `includeDisabled` | Also return categories the game has switched off, marked `enabled: false`. |
| `excludeHidden` | Leave out quests the game never shows (`visibleToPlayers: false` or `includedInCategories: false`). |
| `sections` | `catalog` only: return only some of `quests`, `bundles`, `categories`, `stwQuests`, `stwCategories`. |
| `ids` | `catalog` only: return only these quest template ids. |
| `rewards` | Include each quest's resolved rewards. |

`get` returns one BR, mode or STW quest, with `source: 'athena' | 'stw'`, and throws `NotFoundError` for unknown ids. `lookup` resolves many ids at once, in batches of 1000, and lists any it couldn't find in `missing`.

```ts
const { categories } = await fncc.quests.categories({ mode: 'festival' });
const quest = await fncc.quests.get('Quest:quest_s42_weekly_w07_q01');
const { quests, missing } = await fncc.quests.lookup(['Quest:quest_s42_weekly_w07_q01', 'quest:reactivequest_flingers']);
```

## news
<Badge type="info" text="endpoint" /> `fncc.news`

```ts
all(options?: FnccBaseOptions): Promise<FnccNewsResponse>
feed(feed: string, options?: FnccBaseOptions): Promise<FnccNewsFeed>
```

`all` returns every news feed with `feedCount`/`messageCount` metadata; `feed` unwraps one feed by id (e.g. `br`, `stw`, `creative`).

## lightswitch
<Badge type="info" text="endpoint" /> `fncc.lightswitch`

```ts
all(options?: FnccBaseOptions): Promise<FnccLightswitchResponse>
service(service: string, options?: FnccBaseOptions): Promise<FnccLightswitchService>
```

`all` returns the service-status roll-up (`allUp`, `serviceCount`, per-service `data`); `service` unwraps a single service's status.

## lookup
<Badge type="info" text="endpoint" /> `fncc.lookup`

```ts
find(options?: FnccLookupOptions): Promise<FnccLookupResponse>
byName(name: string, options?: FnccLookupOptions): Promise<FnccLookupResponse>
byAccountId(accountId: string, options?: FnccLookupOptions): Promise<FnccLookupResponse>
```

Account lookup by `name` (with `platform`: `epic` | `psn` | `xbl` | `steam` | `nsw`) or `accountId` (one id or several comma-separated); `search: true` skips the exact-match step. The envelope splits `exact` from `more` matches with their counts, and each match carries its linked `externalAuths`. `byName`/`byAccountId` are validated convenience wrappers. Lookups resolve against Epic live and share a much tighter rate limit than other routes.

## mnemonic
<Badge type="info" text="endpoint" /> `fncc.mnemonic`

```ts
list(options?: FnccMnemonicListOptions): Promise<FnccMnemonic[]>
get(mnemonic: string, options?: FnccBaseOptions): Promise<FnccMnemonic>
related(mnemonic: string, options?: FnccBaseOptions): Promise<FnccMnemonicRelated>
```

Epic link codes — playlists, experiences and creative islands. `list` filters by part of the link `type` (e.g. `BR:Playlist`); `get` resolves one code with its images, `parentExperience` and `matchmaking` (`v1` / `v2` / `v3`). `related` returns Epic's raw related-links payload (`parentLinks` plus every linked code keyed by mnemonic). Links the server resolves live from Epic (rather than from its mirror) are normalised into the same shape — `title`, `description`, `image` and `images` are filled from the link metadata — and blank strings come back as `null`. `normalizeMnemonic` is exported for raw link objects you fetch yourself.

## discovery
<Badge type="info" text="endpoint" /> `fncc.discovery`

```ts
all(options?: FnccBaseOptions): Promise<FnccDiscoveryResponse>
surface(surface: string, options?: FnccBaseOptions): Promise<FnccDiscoverySurface>
```

`all` returns every discovery surface with `surfaceCount`/`panelCount`/`resultCount` metadata; `surface` unwraps one surface's panels.

## cloudstorage
<Badge type="info" text="endpoint" /> `fncc.cloudstorage`

```ts
list(options?: FnccBaseOptions): Promise<FnccCloudStorageFile[]>
file(filename: string, options?: FnccBaseOptions): Promise<string>
```

`list` returns the system cloud-storage (hotfix) file index; `file` fetches one file's raw contents as text, matched case-insensitively (e.g. `DefaultGame.ini`).

## anticheat
<Badge type="info" text="endpoint" /> `fncc.anticheat`

```ts
info(options?: FnccBaseOptions): Promise<FnccAntiCheat>
file(name: string, options?: FnccBaseOptions): Promise<string>
fileUrl(name: string): string
```

`info` returns the Easy Anti-Cheat build shipping with the install — `version`, marketing `productVersion`, `runtimeVersion` and every file, certificate and licence with its size, `sha256` and download `url`. `file` reads a text file (licences, `runtime.conf`, locale configs); for binary files such as `base.cer` use `fileUrl` and download the bytes yourself.

## shorten
<Badge type="info" text="endpoint" /> `fncc.shorten`

```ts
create(url: string, options?: FnccBaseOptions): Promise<FnccShortLink>
stats(options?: FnccBaseOptions): Promise<FnccShortenStats>
```

`create` returns a short link on fn-api.cc that redirects to an http/https `url` for 24 hours (`expiresAt`); anything else throws `ValidationError` before the request. Shortened content is monitored by fn-api.cc. `stats` reports how many links are live.

## Errors

fn-api.cc failures surface as the package's standard [`HttpError`](/guide/error-handling) subclasses (`NotFoundError`, `ServerError`, …) with the raw body attached. Synchronous argument validation (blank `category`, `id`, `path`, `query`) rejects with `ValidationError` before any request is sent.
