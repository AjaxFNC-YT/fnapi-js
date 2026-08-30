# Utilities

Exported helper functions, the `Routes` path builder, and the package-level constants. These back the client internals but are public and safe to reuse in your own code.

## toUnixSeconds
<Badge type="tip" text="function" />

```ts
function toUnixSeconds(value: number | string | Date): number
```

Converts a `Date`, epoch number (auto-detecting ms vs seconds via a `1e11` threshold), or date-like string to Unix seconds. Throws `TypeError` on unparseable strings.

```ts
import { toUnixSeconds } from 'fnapi-js';

toUnixSeconds(new Date('2026-01-01T00:00:00Z'));
toUnixSeconds('2026-01-01');
```

## buildQuery
<Badge type="tip" text="function" />

```ts
function buildQuery(params: QueryParams | undefined): string
```

Serializes a params object into a query string (with leading `?`), skipping `null`/`undefined` and expanding array values into repeated keys. Returns `''` when empty.

```ts
import { buildQuery } from 'fnapi-js';

buildQuery({ language: 'en', ids: ['a', 'b'] }); // '?language=en&ids=a&ids=b'
```

## mergeQuery
<Badge type="tip" text="function" />

```ts
function mergeQuery(...sources: Array<QueryParams | undefined>): QueryParams
```

Shallow-merges multiple param objects left-to-right, skipping `undefined` values and later keys winning over earlier ones.

```ts
import { mergeQuery } from 'fnapi-js';

mergeQuery({ a: 1 }, { a: 2, b: 3 }); // { a: 2, b: 3 }
```

## sleep
<Badge type="tip" text="function" />

```ts
function sleep(ms: number, signal?: AbortSignal): Promise<void>
```

Promise-based delay that rejects immediately if the optional `AbortSignal` is (or becomes) aborted.

```ts
import { sleep } from 'fnapi-js';

await sleep(500);
```

## backoffDelay
<Badge type="tip" text="function" />

```ts
function backoffDelay(attempt: number, minDelay: number, maxDelay: number): number
```

Computes an exponential backoff delay (ms) for a given attempt, adding up to 25% jitter and clamping to `maxDelay`.

```ts
import { backoffDelay } from 'fnapi-js';

const wait = backoffDelay(3, 200, 5000);
```

## linkSignals
<Badge type="tip" text="function" />

```ts
function linkSignals(external: AbortSignal | undefined, timeout: number | undefined): LinkedSignal
```

Merges an external abort signal with a timeout into one `AbortController`. Returns `{ signal, timedOut(), dispose() }`; `timedOut()` distinguishes a timeout abort from an external one.

```ts
import { linkSignals } from 'fnapi-js';

const linked = linkSignals(undefined, 3000);
try {
  await fetch('https://fortnite-api.com/v2/aes', { signal: linked.signal });
} finally {
  linked.dispose();
}
```

::: tip Note
Call `dispose()` to clear the timer and detach listeners when done.
:::

## normalizeAssetPath
<Badge type="tip" text="function" />

```ts
function normalizeAssetPath(path: string): string
```

Normalizes a raw game asset path, rewriting known `FortniteGame/...` prefixes to short forms (`/BRCosmetics`, `/CosmeticShoes`, `/Game`) and guaranteeing a leading slash.

```ts
import { normalizeAssetPath } from 'fnapi-js';

normalizeAssetPath('FortniteGame/Content/Athena/Foo'); // '/Game/Athena/Foo'
```

## assetDirectory
<Badge type="tip" text="function" />

```ts
function assetDirectory(path: string): string
```

Returns the directory portion of a normalized asset path (everything before the final segment).

```ts
import { assetDirectory } from 'fnapi-js';

assetDirectory('/Game/Athena/Foo'); // '/Game/Athena'
```

## assetName
<Badge type="tip" text="function" />

```ts
function assetName(path: string): string
```

Returns the final segment (file name) of a normalized asset path.

```ts
import { assetName } from 'fnapi-js';

assetName('/Game/Athena/Foo'); // 'Foo'
```

## safeGet
<Badge type="tip" text="function" />

```ts
function safeGet<T = unknown>(source: unknown, path: string, defaultValue?: T | null): T | null
```

Safely reads a dot-delimited nested path from an unknown value, returning `defaultValue` (default `null`) when any segment is missing.

```ts
import { safeGet } from 'fnapi-js';

safeGet({ a: { b: 1 } }, 'a.b'); // 1
safeGet({ a: {} }, 'a.b.c', 0); // 0
```

## basicAuthHeader
<Badge type="tip" text="function" />

```ts
function basicAuthHeader(client: AuthClient): string
```

Builds an HTTP `Basic` Authorization header value from an Epic `AuthClient`'s id and secret. Used internally by the Epic auth layer.

```ts
import { basicAuthHeader } from 'fnapi-js';
```

## Routes
<Badge type="warning" text="constant" />

```ts
const Routes: { aes(): string; banners(): string; bannerColors(): string; cosmetics(): string; cosmeticById(id: string): string; cosmeticsSearch(): string; creatorCode(): string; map(): string; news(): string; shop(): string; stats(): string; statsByAccountId(id: string): string; /* ...and more */ }
```

Frozen map of endpoint path builders for fortnite-api.com. Static routes are zero-arg functions; parameterized routes take an id and URL-encode it (e.g. `cosmeticById`, `playlistById`, `statsByAccountId`).

```ts
import { Routes } from 'fnapi-js';

Routes.stats(); // '/v2/stats/br/v2'
Routes.cosmeticById('CID_001'); // '/v2/cosmetics/br/CID_001'
```

## VERSION
<Badge type="warning" text="constant" />

```ts
const VERSION: '2.0.0'
```

The package version string.

```ts
import { VERSION } from 'fnapi-js';

console.log(VERSION); // '2.0.0'
```

## USER_AGENT
<Badge type="warning" text="constant" />

```ts
const USER_AGENT: 'fnapi-js/2.0.0 (+https://github.com/AjaxFNC-YT/fnapi-js)'
```

Default `User-Agent` header sent with every request, derived from `VERSION`.

```ts
import { USER_AGENT } from 'fnapi-js';
```

## DEFAULT_BASE_URL
<Badge type="warning" text="constant" />

```ts
const DEFAULT_BASE_URL: 'https://fortnite-api.com'
```

Base URL for the fortnite-api.com REST API used by `FortniteAPI` unless overridden.

```ts
import { DEFAULT_BASE_URL } from 'fnapi-js';
```

## EPIC_ACCOUNT_SERVICE
<Badge type="warning" text="constant" />

```ts
const EPIC_ACCOUNT_SERVICE: 'https://account-public-service-prod.ol.epicgames.com'
```

Base URL of the Epic Games account service used by `EpicGamesClient` for authentication.

```ts
import { EPIC_ACCOUNT_SERVICE } from 'fnapi-js';
```
