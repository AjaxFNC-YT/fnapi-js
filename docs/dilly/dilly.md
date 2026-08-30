# DillyAPI

`DillyAPI` wraps **fortniteapi.com** (`https://api.fortniteapi.com`) — a CUE4Parse-powered *Export Service* that surfaces raw game data straight out of Fortnite's packaged assets: AES keys, hotfixes, manifests, `.usmap` mappings, cosmetics, bundles, and arbitrary UE object exports.

::: warning A different service
fortniteapi.com is **not** the same service as fortnite-api.com ([`FortniteAPI`](/fortnite/fortnite-api)). It needs **no API key**, returns responses **raw** (there is no `{ status, data }` envelope), and is a beta service, so shapes can shift. Endpoints that return CUE4Parse blobs are typed through a generic envelope with `unknown` payloads you can narrow yourself.
:::

```ts
import { DillyAPI } from 'fnapi-js';

const dilly = new DillyAPI();

const aes = await dilly.aes.keys();
console.log(aes.mainKey, aes.dynamicKeys.length);

const versions = await dilly.versions();
console.log(versions[0]?.version.build);
```

Reachable standalone (`new DillyAPI()`) or through the [umbrella client](/guide/client-options) as `fn.dilly`. Transport options (`timeout`, `retry`, `headers`, `query`, `cache`, `fetch`, `userAgent`, `baseUrl`) match the rest of the package — see [`DillyAPIOptions`](/guide/client-options).

## Envelopes

Most non-list endpoints return one of three shapes, all fully typed:

| Shape | Type | Endpoints |
| --- | --- | --- |
| `{ hash, entries, bytes, jsonOutput: T[] }` | `DillyExport<T>` | everything under `exports.*` |
| `{ hash, entries, bytes, data: T[] }` | `DillyDataEnvelope<T>` | `cosmetics.*`, `aes.cosmetics` |
| nested dictionary | `DillyHotfixes` | `cloudStorage.hotfixes` |

Plain-list endpoints (`versions`, `backups`, `manifests`, `mappings`) return arrays directly.

## aes
<Badge type="info" text="endpoint" /> `dilly.aes`

```ts
keys(options?: DillyVersionOptions): Promise<DillyAesResponse>
forPak(pakId: string, options?: DillyPakOptions): Promise<DillyAesResponse>
cosmetics(pakId: string, options?: DillyPakOptions): Promise<DillyAesCosmeticsResponse>
```

`keys()` returns the main key plus every dynamic pak key (`{ version, mainKey, dynamicKeys[] }`). `forPak` narrows to a single pak; `cosmetics` returns the cosmetics unlocked by that pak. `pakId` is validated (non-empty) and URL-encoded; a blank id throws `ValidationError`.

```ts
const keys = await dilly.aes.keys();
const pak = await dilly.aes.forPak('pakchunk1000-WindowsClient');
```

## versions
<Badge type="info" text="endpoint" /> `dilly.common` · `dilly.versions()`

```ts
common.versions(options?: DillyBaseOptions): Promise<DillyVersion[]>
```

Tracked builds, newest first, each `{ version, meta, ... }` with the build number, tag, and state. `dilly.versions(...)` is a shortcut for `dilly.common.versions(...)`.

## cosmetics
<Badge type="info" text="endpoint" /> `dilly.cosmetics`

```ts
list(options?: DillyCosmeticsOptions): Promise<DillyCosmeticsResponse>
listNew(options?: DillyCosmeticsOptions): Promise<DillyCosmeticsResponse>
bundles(options?: DillyBaseOptions): Promise<DillyBundlesResponse>
bundlesFrom(fromDate: string, options?: DillyBaseOptions): Promise<DillyBundlesResponse>
```

`list`/`listNew` accept an optional `type` filter (forwarded as the `Type` query param). `bundlesFrom` scopes bundles to those added on/after `fromDate` (URL-encoded into the path).

```ts
const outfits = await dilly.cosmetics.list({ type: 'AthenaCharacter' });
const recent = await dilly.cosmetics.bundlesFrom('2026-08-01');
```

## exports
<Badge type="info" text="endpoint" /> `dilly.exports`

The Export Service proper. The typed helpers cover the common blobs; the four generic methods pull any UE asset by `path`.

```ts
get<T>(options: DillyExportOptions): Promise<DillyExport<T>>          // requires path; supports raw
ini<T>(options: DillyExportPathOptions): Promise<DillyExport<T>>       // requires path
parsed<T>(options: DillyExportPathOptions): Promise<DillyExport<T>>    // requires path
download<T>(options: DillyExportPathOptions): Promise<DillyExport<T>>  // requires path

seasons(options?)            cosmetics(options?)         cosmeticsNew(options?)
cosmeticsAll(options?)       cosmeticsSeries(options?)   cosmeticsSets(options?)
offerPopups(options?)        displayAssets(options?)     displayAssetsParsed<T>(options?)
bundles(options?)            search(options)
```

The four path methods require a non-empty `path` (throws `ValidationError` otherwise). `get` additionally accepts `raw`. All list helpers accept an optional `version`. `search` requires `query` and accepts `new`.

```ts
const seasons = await dilly.exports.seasons();
const hits = await dilly.exports.search({ query: 'renegaderaider', new: true });
const asset = await dilly.exports.parsed<{ Name: string }>({
  path: 'FortniteGame/Content/Athena/Items/Cosmetics/Characters/CID_028_Athena_Commando_F',
});
```

## cloudStorage
<Badge type="info" text="endpoint" /> `dilly.cloudStorage`

```ts
hotfixes(options?: DillyHotfixOptions): Promise<DillyHotfixes>
```

Current cloud-storage hotfixes as a nested `file → section → key/value` dictionary. Pass `lang` to localize.

## manifests
<Badge type="info" text="endpoint" /> `dilly.manifests`

```ts
list(options?: DillyBaseOptions): Promise<DillyManifest[]>
get(manifestId: string, options?: DillyBaseOptions): Promise<DillyManifest>
```

## mappings
<Badge type="info" text="endpoint" /> `dilly.mappings`

```ts
list(options?: DillyBaseOptions): Promise<DillyMapping[]>
legacy(options?: DillyBaseOptions): Promise<DillyMapping[]>
```

`.usmap` unversioned-property mappings — `list` for the current format, `legacy` for the older one.

## backups
<Badge type="info" text="endpoint" /> `dilly.backups`

```ts
list(options?: DillyBaseOptions): Promise<DillyBackup[]>
```

## Errors

fortniteapi.com publishes no error schema, so failures surface as the package's standard [`HttpError`](/guide/error-handling) subclasses (`NotFoundError`, `ServerError`, …) with the raw body attached. Synchronous argument validation (blank `pakId`, `path`, `query`) rejects with `ValidationError` before any request is sent.
