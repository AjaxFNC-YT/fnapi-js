# Client & Options

## The `Fortnite` umbrella client

`Fortnite` is the all-in-one entry point. It composes the three providers this package covers, so one instance reaches everything:

```ts
import { Fortnite } from 'fnapi-js';

const fn = new Fortnite({ apiKey: config.apiKey });

const cosmetics = await fn.fortniteapi.cosmetics.all();  // fortnite-api.com
const aes = await fn.dilly.aes.keys();                   // fortniteapi.com
const { data } = await fn.epic.ecosystem.islands();      // api.fortnite.com (Epic)
```

| Member | Type | Provider |
| --- | --- | --- |
| `fn.fortniteapi` | [`FortniteAPI`](/fortnite/fortnite-api) | fortnite-api.com — cosmetics, shop, stats, news, … |
| `fn.dilly` | [`DillyAPI`](/dilly/dilly) | fortniteapi.com — AES, exports, mappings, manifests |
| `fn.epic` | [`EpicGamesClient`](/epic/client) | Epic auth + party + locker + mcp + [ecosystem](/epic/ecosystem) |
| `fn.ecosystem` | [`EcosystemEndpoint`](/epic/ecosystem) | sugar for `fn.epic.ecosystem` |

`FortniteOptions` extends [`FortniteAPIOptions`](#constructing-fortniteapi) and adds `epic?: EpicClientOptions` and `dilly?: DillyAPIOptions` for provider-specific overrides. Shared transport fields (`fetch`, `timeout`, `retry`, `headers`, `userAgent`, `cache`) propagate to all three sub-clients; `apiKey` is routed **only** to `fn.fortniteapi`, since neither fortniteapi.com nor the Epic ecosystem host takes one.

`FortniteAPI`, `DillyAPI`, and `EpicGamesClient` all remain exported standalone — reach for `Fortnite` when you want one handle, or a single provider directly when you don't.

## Constructing `FortniteAPI`

Every option is optional. Pass a `FortniteAPIOptions` object to the constructor:

```ts
import { FortniteAPI, Language, ALL_RESPONSE_FLAGS } from 'fnapi-js';

const client = new FortniteAPI({
  apiKey: config.apiKey,
  language: Language.English,
  responseFlags: ALL_RESPONSE_FLAGS,
  timeout: 15_000,
  retry: { attempts: 4, minDelay: 500, maxDelay: 5_000 },
  cache: { enabled: true, ttl: 120_000 },
  headers: { 'x-trace': 'abc' },
  baseUrl: 'https://fortnite-api.com',
});
```

| Option | Type | What it does |
| --- | --- | --- |
| `apiKey` | `string` | Sent as the `Authorization` header. Required only for authenticated endpoints (e.g. stats). |
| `language` | `Language` | Default response language applied to language-aware endpoints. |
| `timeout` | `number` | Per-request timeout in ms. Defaults to `30_000`. Exceeding it throws `TimeoutError`. |
| `retry` | `number \\| RetryOptions \\| false` | Retry policy. A number sets attempt count; `false` disables retries; an object tunes `attempts`, `minDelay`, `maxDelay`, `statusCodes`. Defaults to 3 attempts on `408, 425, 429, 500, 502, 503, 504`. |
| `cache` | `boolean \\| CacheOptions` | `true` enables an in-memory cache for GETs; an object sets `enabled`, `ttl` (default `60_000`ms), `maxEntries` (default `200`). Off by default. |
| `responseFlags` | `number \\| string` | Default response-flags bitmask controlling optional fields returned by the API. |
| `headers` | `Record<string,string>` | Default headers merged into every request. |
| `fetch` | `FetchLike` | Custom `fetch` implementation. Falls back to `globalThis.fetch`; throws at construction if neither is available. |
| `baseUrl` | `string` | Override the API base URL. Trailing slashes are trimmed. |
| `query` | `QueryParams` | Default query params appended to every request. |
| `userAgent` | `string` | Override the default `User-Agent`. |

## Mutating a client after construction

These setters return `this`, so they chain. They change defaults without rebuilding the client:

```ts
client
  .setLanguage(Language.German)
  .setApiKey(config.apiKey)
  .setResponseFlags(ALL_RESPONSE_FLAGS)
  .setHeader('x-trace', 'req-42');

client.clearCache();
```

- **`setLanguage(language)`** — set (or `undefined` to clear) the default language.
- **`setApiKey(apiKey)`** — set or clear (`null`) the API key used for `Authorization`.
- **`setResponseFlags(flags)`** — set or clear the default response-flags value.
- **`setHeader(name, value)`** — add or replace one default header (case-insensitive).
- **`clearCache()`** — empty the in-memory response cache.

Read-only getters `client.apiKey`, `client.language`, and `client.baseUrl` reflect the current state.

## Per-request overrides

Most endpoint methods accept an options object that can override defaults for that single call — `signal`, `timeout`, `cache`, `headers`, and where relevant `language`, `responseFlags`, `retry`:

```ts
const controller = new AbortController();
const news = await client.news.br({ signal: controller.signal, timeout: 5_000 });
```

## The `ApiResponse` object

Endpoint methods return the decoded resource directly. If you need the raw HTTP envelope, use `client.rest` (a `RestClient`), whose `get`/`post`/`request` return an `ApiResponse<T>`:

```ts
const res = await client.rest.get<{ data: unknown }>('/v2/aes');
console.log(res.status, res.ok, res.cached);
const body = res.body;
const ct = res.header('content-type');
```

`ApiResponse` exposes `status`, `headers`, `body`, `url`, `method`, `cached`, and `receivedAt`, plus `ok` / `failed` getters, a case-insensitive `header(name)` lookup, and `toJSON()`.

## `MemoryCache`

When caching is enabled, GET responses are stored in an LRU `MemoryCache` reachable at `client.rest.cache`. It is bounded by `maxEntries` (evicting the oldest entry) and each entry expires after its `ttl`. Cached hits are returned as fresh `ApiResponse` objects with `cached === true` and a deep-cloned body, so mutating a result never corrupts the cache. Useful methods: `get`, `has`, `set`, `delete`, `clear`, `prune`, and the `size` getter.
