# FnccAPI

`FnccAPI` wraps **fn-api.cc** (`https://prod.fn-api.cc`) — a CUE4Parse-backed dataset service that surfaces Fortnite cosmetics, banners, OG sprites, AES keys, `.usmap` mappings, raw asset exports, and a live image renderer. Every route sits under a `/v1` prefix and needs **no API key**.

::: warning A different service
fn-api.cc is its own service — not fortnite-api.com ([`FortniteAPI`](/fortnite/fortnite-api)) nor fortniteapi.com ([`DillyAPI`](/dilly/dilly)). Cosmetic/banner/sprite list routes return the `{ status, data }` envelope (unwrapped for you); status, game, search, and asset routes return their bodies **raw**. Shapes are typed from live-sampled responses.
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

The tracked build (`gameVersion`, `datasetBuild`, per-category counts), the current AES keys (`mainKey` + `dynamicKeys[]`), and the active `.usmap` mappings file. `fncc.version()`/`fncc.aes()`/`fncc.mappings()` are flat shortcuts for the `game.*` methods.

```ts
const aes = await fncc.aes();
console.log(aes.mainKey, aes.dynamicKeys.length);
```

## cosmetics
<Badge type="info" text="endpoint" /> `fncc.cosmetics`

```ts
all(options?: FnccBaseOptions): Promise<FnccCosmeticsByCategory>
categories(options?: FnccBaseOptions): Promise<FnccCosmeticCategories>
category(category: string, options?: FnccBaseOptions): Promise<FnccCosmetic[]>
get(category: string, id: string, options?: FnccBaseOptions): Promise<FnccCosmetic>
search(category: string, options?: FnccCosmeticSearchOptions): Promise<FnccCosmeticSearchResponse>
```

`all` returns every category keyed by name; `categories` is the name → count map; `category` pulls one category's array; `get` fetches a single cosmetic by category + id. `search` filters within a category by `name`, `id`, `type`, `rarity`, `series`, `set`, `artist`, `album`, `introduction`, plus `matchMethod`/`limit`/`offset`, and keeps the `total` alongside `data`. A blank `category` or `id` throws `ValidationError` before any request.

```ts
const categories = await fncc.cosmetics.categories();
const cars = await fncc.cosmetics.category('cars');
const renegade = await fncc.cosmetics.get('br', 'CID_028_Athena_Commando_F');
const hits = await fncc.cosmetics.search('br', { rarity: 'legendary', limit: 20 });
```

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

OG sprite data (dex number, species, perks, variants). `list` accepts `enabled` and `library` filters and keeps `count`/hotfix metadata on the envelope; `get` resolves one sprite by id (blank id throws `ValidationError`).

## search
<Badge type="info" text="endpoint" /> `fncc.search`

```ts
paths(query: string, options?: FnccPageOptions): Promise<FnccPage<FnccSearchHit>>
content(query: string, options?: FnccContentSearchOptions): Promise<FnccContentSearchResult>
```

`paths` searches asset paths by substring with `offset`/`limit` paging. `content` searches inside asset bytes, scoped by `prefix`/`extension` and bounded by `maxFiles`/`timeBudgetMs` (`ignoreCase` optional). Both require a non-empty `query`.

```ts
const page = await fncc.search.paths('renegade', { limit: 20 });
console.log(page.total, page.items[0]?.path);
```

## assets
<Badge type="info" text="endpoint" /> `fncc.assets`

```ts
list(options?: FnccAssetsListOptions): Promise<FnccPage<FnccAssetEntry>>
search(query: string, options?: FnccPageOptions): Promise<FnccPage<FnccAssetEntry>>
exports(path: string, options?: FnccBaseOptions): Promise<FnccAssetExport[]>
json<T>(path: string, name?: string, options?: FnccBaseOptions): Promise<T>
package(path: string, options?: FnccBaseOptions): Promise<FnccAssetPackage>
archives(options?: FnccBaseOptions): Promise<FnccArchive[]>
rawUrl(path: string): string
```

`list`/`search` page the asset index (`prefix`/`extension` filters on `list`). `exports` returns the export table for a `.uasset`; `json` pulls a parsed export (optionally a single named export); `package` returns the package's dependency map; `archives` lists mounted paks. `rawUrl` builds the raw-bytes download URL without sending a request. The `path`/`query` arguments are validated non-empty.

```ts
const exports = await fncc.assets.exports('FortniteGame/Content/Athena/Items/.../CID_028');
const parsed = await fncc.assets.json<{ Name: string }>('FortniteGame/Content/.../CID_028');
```

## images
<Badge type="info" text="endpoint" /> `fncc.images`

```ts
url(options: FnccImageOptions): string
```

Builds an absolute URL to fn-api.cc's on-the-fly image renderer for an asset `path` (optional `name`, `format`, `maxSize`). Pure string builder — it never sends a request. A blank `path` throws `ValidationError`.

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

`list` keeps the `{ total, count, data }` envelope and filters by `search`, `category`, `rarity`, `ammo`, `trigger`, `type`, `tag`, `ranged`, `melee`, `hasIcon`, `hasStats`, `sort`, `order`, `limit`, `offset`. `categories` returns the filter facet counts; `get` unwraps a single weapon (`includeRaw` adds the raw asset export).

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

`list` filters by `search`, `rarity`, `enabled`, `needsProFishingRod`; `get` unwraps a single fish by id.

## itemshop
<Badge type="info" text="endpoint" /> `fncc.itemshop`

```ts
current(options?: FnccItemShopOptions): Promise<FnccItemShop>
sections(options?: FnccBaseOptions): Promise<FnccItemShopSections>
```

`current` returns the live shop with `offerCount`/`resetsAt` metadata and every `FnccShopOffer` in `data` (`section` filter narrows it). `sections` lists the shop's layout sections.

## playlists
<Badge type="info" text="endpoint" /> `fncc.playlists`

```ts
list(options?: FnccPlaylistsOptions): Promise<FnccPlaylist[]>
get(id: string, options?: FnccPlaylistOptions): Promise<FnccPlaylist>
```

`list` filters by `gameType`, `tag`, `tournament`, `ranked`, `limitedTime`, `default`, `fetchImages`; `get` pulls one playlist (`fetchImages` attaches the rendered images).

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

Account lookup by `name`, `accountId`, `platform`, or free-text `search`. The envelope splits `exact` from `more` matches with their counts. `byName`/`byAccountId` are validated convenience wrappers.

## mnemonic
<Badge type="info" text="endpoint" /> `fncc.mnemonic`

```ts
list(options?: FnccMnemonicListOptions): Promise<FnccMnemonic[]>
get(mnemonic: string, options?: FnccMnemonicOptions): Promise<FnccMnemonic>
```

Creative/island link-code metadata. `list` filters by `type`; `get` resolves a single mnemonic (`related` attaches related experiences).

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

`list` returns the system cloud-storage file index; `file` fetches one file's raw contents as a string (e.g. hotfix `.ini` files).

## anticheat
<Badge type="info" text="endpoint" /> `fncc.anticheat`

```ts
info(options?: FnccBaseOptions): Promise<FnccAntiCheat>
file(name: string, options?: FnccBaseOptions): Promise<FnccAntiCheatFileContent>
```

`info` returns the anti-cheat provider/version summary; `file` fetches a single referenced file's contents.

## Errors

fn-api.cc failures surface as the package's standard [`HttpError`](/guide/error-handling) subclasses (`NotFoundError`, `ServerError`, …) with the raw body attached. Synchronous argument validation (blank `category`, `id`, `path`, `query`) rejects with `ValidationError` before any request is sent.
