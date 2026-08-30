# FortniteAPI

The main client for fortnite-api.com. Bundles every endpoint namespace over a shared `RestClient` and holds default `language`/`responseFlags` applied to each request. Aliased as `ApiClient`.

## FortniteAPI
<Badge type="tip" text="class" />

```ts
class FortniteAPI
```

Root client exposing typed endpoint namespaces (`aes`, `banners`, `cosmetics`, `creatorCode`/`sac`, `map`, `news`, `playlists`, `shop`, `stats`) plus the underlying `rest` transport. Construct once and reuse; setter methods return `this` for chaining.

```ts
import { FortniteAPI, Language } from 'fnapi-js';

const client = new FortniteAPI({
  apiKey: process.env.FORTNITE_API_KEY,
  language: Language.English,
});

const shop = await client.shop.get();
console.log(`${shop.entries.length} shop entries`);
```

::: tip Note
Endpoint namespaces are `readonly` properties. `sac` is the same instance as `creatorCode`. All construction options are optional — an API key is only required for `stats`.
:::

## constructor
<Badge type="info" text="method" />

```ts
constructor(options?: FortniteAPIOptions)
```

Creates the client and all endpoint namespaces. `language` and `responseFlags` become defaults for every request; transport options (`baseUrl`, `timeout`, `retry`, `cache`, `headers`, `fetch`, `userAgent`) configure the shared `RestClient`.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `FortniteAPIOptions` | Optional config: `apiKey`, `language`, `baseUrl`, `timeout`, `headers`, `query`, `responseFlags`, `retry`, `cache`, `fetch`, `userAgent`. All fields optional. |

**Returns:** `FortniteAPI instance`

```ts
import { FortniteAPI, Language } from 'fnapi-js';

const client = new FortniteAPI({
  apiKey: 'my-key',
  language: Language.German,
  cache: true,
  retry: 3,
});
```

## aes
<Badge type="info" text="getter" />

```ts
readonly aes: AesEndpoint
```

Namespace for AES encryption keys (main key and dynamic pak keys).

```ts
const aes = await client.aes.get();
console.log(aes.build, aes.mainKey);
```

## banners
<Badge type="info" text="getter" />

```ts
readonly banners: BannersEndpoint
```

Namespace for profile banners and banner colors.

```ts
const banners = await client.banners.all();
```

## cosmetics
<Badge type="info" text="getter" />

```ts
readonly cosmetics: CosmeticsEndpoint
```

Namespace for all cosmetic listings and search (BR, tracks, instruments, cars, LEGO, beans, and more).

```ts
const outfits = await client.cosmetics.br();
```

## creatorCode
<Badge type="info" text="getter" />

```ts
readonly creatorCode: CreatorCodeEndpoint
```

Namespace for Support-A-Creator code lookups. Also exposed as `client.sac` (same instance).

```ts
const creator = await client.creatorCode.get('ninja');
```

## sac
<Badge type="info" text="getter" />

```ts
readonly sac: CreatorCodeEndpoint
```

Alias of `creatorCode` — the identical `CreatorCodeEndpoint` instance for Support-A-Creator lookups.

```ts
const exists = await client.sac.exists('ninja');
```

## map
<Badge type="info" text="getter" />

```ts
readonly map: MapEndpoint
```

Namespace for the current BR map and its named POIs.

```ts
const map = await client.map.get();
```

## news
<Badge type="info" text="getter" />

```ts
readonly news: NewsEndpoint
```

Namespace for in-game news feeds (combined, BR, STW).

```ts
const news = await client.news.br();
```

## playlists
<Badge type="info" text="getter" />

```ts
readonly playlists: PlaylistsEndpoint
```

Namespace for available playlists.

```ts
const playlists = await client.playlists.all();
```

## shop
<Badge type="info" text="getter" />

```ts
readonly shop: ShopEndpoint
```

Namespace for the current item shop, its entries, and section grouping.

```ts
const shop = await client.shop.get();
```

## stats
<Badge type="info" text="getter" />

```ts
readonly stats: StatsEndpoint
```

Namespace for BR player stats by name or account id. Requires an API key.

```ts
const stats = await client.stats.byName('Ninja');
```

## rest
<Badge type="info" text="getter" />

```ts
readonly rest: RestClient
```

The shared low-level transport backing every endpoint. Use for raw requests, header management, or cache access.

```ts
const res = await client.rest.get('/v2/aes');
```

## apiKey
<Badge type="info" text="getter" />

```ts
get apiKey(): string | null
```

The API key currently set on the transport, or `null` if none.

**Returns:** `active API key string, or null`

```ts
if (client.apiKey === null) {
  console.warn('stats endpoint will fail without a key');
}
```

## language
<Badge type="info" text="getter" />

```ts
get language(): Language | undefined
```

The default `Language` applied to requests, or `undefined` if unset.

**Returns:** `default Language, or undefined`

```ts
console.log(client.language);
```

## baseUrl
<Badge type="info" text="getter" />

```ts
get baseUrl(): string
```

The base URL the transport sends requests to.

**Returns:** `base URL string`

```ts
console.log(client.baseUrl);
```

## setApiKey
<Badge type="info" text="method" />

```ts
setApiKey(apiKey: string | null): this
```

Sets or clears the API key on the transport. Pass `null` to remove it. Returns `this` for chaining.

| Parameter | Type | Description |
| --- | --- | --- |
| `apiKey` | `string \| null` | The API key, or `null` to clear it. |

**Returns:** `this, for chaining`

```ts
client.setApiKey('new-key').setLanguage(Language.Spanish);
```

## setLanguage
<Badge type="info" text="method" />

```ts
setLanguage(language: Language | undefined): this
```

Sets the default `Language` for subsequent requests. Pass `undefined` to clear it. Returns `this`.

| Parameter | Type | Description |
| --- | --- | --- |
| `language` | `Language \| undefined` | The default language, or `undefined` to clear it. |

**Returns:** `this, for chaining`

```ts
import { Language } from 'fnapi-js';
client.setLanguage(Language.French);
```

## setResponseFlags
<Badge type="info" text="method" />

```ts
setResponseFlags(responseFlags: number | string | undefined): this
```

Sets the default `responseFlags` bitmask (number or string) applied to flag-aware endpoints such as cosmetics and shop. Pass `undefined` to clear. Returns `this`.

| Parameter | Type | Description |
| --- | --- | --- |
| `responseFlags` | `number \| string \| undefined` | The default response-flags bitmask, or `undefined` to clear it. |

**Returns:** `this, for chaining`

```ts
client.setResponseFlags(3);
```

## setHeader
<Badge type="info" text="method" />

```ts
setHeader(name: string, value: string): this
```

Sets a default request header on the transport, sent with every request. Returns `this`.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | `string` | Header name. |
| `value` | `string` | Header value. |

**Returns:** `this, for chaining`

```ts
client.setHeader('x-trace-id', 'abc-123');
```

## clearCache
<Badge type="info" text="method" />

```ts
clearCache(): this
```

Clears the transport's in-memory response cache. Returns `this`.

**Returns:** `this, for chaining`

```ts
client.clearCache();
```
