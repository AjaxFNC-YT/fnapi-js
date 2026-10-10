# fnapi-js — Full Documentation

> Consolidated reference for **fnapi-js** — a zero-dependency TypeScript wrapper for the public Fortnite APIs with a complete Epic Games account-service auth, realtime and party layer. Generated from the individual pages under `docs/`; the live site is built with VitePress.

---


# ═══════════════  Guide  ═══════════════

# Introduction

**fnapi-js** is a typed API wrapper for [fortnite-api.com](https://fortnite-api.com) with a first-class Epic Games account-service authentication layer bundled in. It is written in TypeScript, ships with complete type declarations, and works identically from TypeScript and plain JavaScript.

Everything is imported from the package root:

```ts
import { FortniteAPI, EpicGamesClient } from 'fnapi-js';
```

## The two halves

The package is really two clients that share a common HTTP core, error hierarchy, and design language.

### `FortniteAPI` — the fortnite-api.com wrapper

The main client for the public REST API. It exposes one property per resource group — `shop`, `cosmetics`, `aes`, `banners`, `creatorCode` (aliased as `sac`), `map`, `news`, `playlists`, and `stats` — each with strongly typed methods and response objects. `ApiClient` is exported as an alias of `FortniteAPI`.

```ts
const client = new FortniteAPI();
const shop = await client.shop.get();
```

### `EpicGamesClient` — Epic Games auth

A client for the Epic Games account service: OAuth grants, token verification, exchange codes, the device-code login flow, device-auth credentials, account lookups, and session management. It resolves built-in auth clients by name or accepts custom `{ clientId, clientSecret }` credentials.

```ts
const epic = new EpicGamesClient();
const session = await epic.loginClientCredentials();
```

## Features

- **Zero runtime dependencies** — built on the native `fetch` available in Node 18+.
- **Dual ESM / CJS** — `import` and `require` both resolve to the correct build via the `exports` map.
- **First-class TypeScript and JavaScript** — full `.d.ts` type surface, typed responses and options, but equally usable from `.mjs` / `.cjs`.
- **Typed error hierarchy** — every failure is a subclass of `FortniteApiError`, so you can branch with `instanceof`.
- **Built-in retries, timeouts, and abort support** — configurable backoff, `Retry-After` awareness, and `AbortSignal` pass-through.
- **Optional in-memory caching** — an LRU `MemoryCache` for GET responses with TTL and size limits.
- **Rich cosmetic search** — a fluent `CosmeticSearchBuilder` plus `find*` / `*ById` helpers that return `null` on 404.
- **Complete Epic auth toolkit** — device-code login, client switching, reusable device auths, and account-service calls.

Continue to **Installation** to add it to a project, then **Quick Start** for a runnable example of each half.

---

# Installation

Install from npm with your package manager of choice:

```bash
npm install fnapi-js
```

```bash
pnpm add fnapi-js
```

```bash
yarn add fnapi-js
```

## Requirements

- **Node.js >= 18.0.0.** The package has zero runtime dependencies and relies on the global `fetch` introduced in Node 18. On older runtimes (or non-standard environments) you can supply your own implementation through the `fetch` client option — see **Client & Options**.
- **TypeScript is optional.** Type declarations are bundled; you do not install anything extra to get full IntelliSense.

## ESM import

The package is ESM-first. In an ES module (`.mjs`, or a `.ts`/`.js` file in a `"type": "module"` project):

```ts
import { FortniteAPI, Language } from 'fnapi-js';

const client = new FortniteAPI({ language: Language.English });
```

## CommonJS require

A CommonJS build is published alongside, resolved automatically for `require`:

```js
const { FortniteAPI, Language } = require('fnapi-js');

const client = new FortniteAPI({ language: Language.English });
```

Both entry points expose the same exports; the `exports` map in `package.json` picks `dist/index.js` for `import` and `dist/index.cjs` for `require`, each with matching `.d.ts` / `.d.cts` types.

## Configuration convention

This project uses a **`config.json`** file for API keys and secrets rather than `.env`. Load it yourself and pass values into the clients:

```ts
import { readFileSync } from 'node:fs';
import { FortniteAPI } from 'fnapi-js';

const config = JSON.parse(readFileSync('./config.json', 'utf8')) as { apiKey: string };
const client = new FortniteAPI({ apiKey: config.apiKey });
```

An API key from [dash.fortnite-api.com](https://dash.fortnite-api.com) is only required for authenticated endpoints such as player stats; most read-only endpoints (shop, cosmetics, AES, banners, map, news, playlists) work without one.

---

# Quick Start

Two short programs — one for each half of the package. Both are complete and runnable on Node 18+.

## Fortnite API

Construct a `FortniteAPI`, then reach into a resource group. This fetches the current item shop, searches for a specific cosmetic, and reads the current AES keys.

```ts
import { FortniteAPI, Language, MatchMethod } from 'fnapi-js';

const client = new FortniteAPI({ language: Language.English });

async function main(): Promise<void> {
  const shop = await client.shop.get();
  console.log(`Shop for ${shop.date} has ${shop.entries.length} entries`);

  const renegade = await client.cosmetics.search({
    name: 'Renegade Raider',
    matchMethod: MatchMethod.Full,
  });
  console.log(`${renegade.name} — ${renegade.rarity.displayValue} ${renegade.type.displayValue}`);

  const aes = await client.aes.get();
  console.log(`Build ${aes.build} main key ${aes.mainKey}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
```

`cosmetics.search` returns the single best match (and throws if nothing matches). To get `null` instead of a throw on no match, use `cosmetics.find`. See **Error Handling** for the `find*` / `*ById` helpers.

## Epic Games auth

The simplest Epic grant is **client credentials**, which yields an application-scoped token with no user interaction — useful for calling public account-service endpoints or verifying connectivity.

```ts
import { EpicGamesClient } from 'fnapi-js';

const epic = new EpicGamesClient();

async function main(): Promise<void> {
  const session = await epic.loginClientCredentials();
  console.log(`app token for ${session.client.name}: ${session.accessToken.slice(0, 8)}...`);

  const verified = await session.verify();
  console.log(`verified client ${verified.client_id}, expires in ${verified.expires_in}s`);

  await session.logout();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
```

A client-credentials session is **not bound to an account**, so account-scoped calls like `session.me()` will throw a `ValidationError`. To sign in as a user, use the device-code flow covered in **Epic Authentication**.

---

# Examples

A cookbook of complete, runnable programs for both halves of the package. Every snippet is copy-pasteable on Node 18+; import names match the real API surface.

## Today's item shop

```ts
import { FortniteAPI } from 'fnapi-js';

const client = new FortniteAPI();

const shop = await client.shop.get();
console.log(`${shop.entries.length} entries for ${shop.date}`);

for (const entry of shop.entries.slice(0, 5)) {
  const item = entry.brItems?.[0];
  console.log(`${item?.name ?? entry.devName} — ${entry.finalPrice} V-Bucks`);
}
```

## Group the shop into sections

```ts
const sections = await client.shop.sections();

for (const [name, entries] of sections) {
  console.log(`${name}: ${entries.length} offers`);
}

const containsRenegade = await client.shop.isInShop('CID_028_Athena_Commando_F');
console.log('Renegade Raider in the shop today?', containsRenegade);
```

## Search cosmetics

A one-shot search returns the single best match (and throws if nothing matches):

```ts
import { FortniteAPI, MatchMethod } from 'fnapi-js';

const client = new FortniteAPI();

const skin = await client.cosmetics.search({
  name: 'Renegade Raider',
  matchMethod: MatchMethod.Full,
});
console.log(skin.id, skin.rarity.displayValue, skin.type.displayValue);
```

For richer queries, use the fluent `CosmeticSearchBuilder` with `searchAll`:

```ts
import { CosmeticSearchBuilder, CosmeticType, Rarity, MatchMethod } from 'fnapi-js';

const query = new CosmeticSearchBuilder()
  .type(CosmeticType.outfit)
  .rarity(Rarity.Legendary)
  .matchMethod(MatchMethod.Contains)
  .addedSince(new Date('2024-01-01'));

const outfits = await client.cosmetics.searchAll(query);
console.log(`${outfits.length} legendary outfits added since 2024`);
```

## A cosmetic by ID, with extra data

`responseFlags` adds file paths, gameplay tags, and shop history to cosmetic responses:

```ts
import { FortniteAPI, ALL_RESPONSE_FLAGS } from 'fnapi-js';

const client = new FortniteAPI({ responseFlags: ALL_RESPONSE_FLAGS });

const cosmetic = await client.cosmetics.byId('CID_028_Athena_Commando_F');
console.log(cosmetic.name, '—', cosmetic.shopHistory?.length ?? 0, 'shop appearances');

const [renegade, ghoul] = await client.cosmetics.byIds([
  'CID_028_Athena_Commando_F',
  'CID_029_Athena_Commando_F_Halloween',
]);
```

## "Not found" without try/catch

The `find*` and `*ById` helpers return `null` on a 404 instead of throwing:

```ts
const maybe = await client.cosmetics.findById('CID_DOES_NOT_EXIST');
if (maybe === null) {
  console.log('no such cosmetic');
}

const creatorExists = await client.creatorCode.exists('ninja');
```

## Player stats (requires an API key)

Stats need an API key from [dash.fortnite-api.com](https://dash.fortnite-api.com); without one the call throws a `ValidationError`.

```ts
import { FortniteAPI, AccountType, TimeWindow, StatsImage } from 'fnapi-js';

const client = new FortniteAPI({ apiKey: config.apiKey });

const stats = await client.stats.byName('Ninja', {
  accountType: AccountType.Epic,
  timeWindow: TimeWindow.Lifetime,
  image: StatsImage.All,
});

const solo = stats.stats.all?.solo;
console.log(`${stats.account.name}: ${solo?.wins} solo wins, ${solo?.kd} K/D`);

const byId = await client.stats.findById(stats.account.id);
```

## AES keys

```ts
import { FortniteAPI, KeyFormat } from 'fnapi-js';

const client = new FortniteAPI();

const aes = await client.aes.get({ keyFormat: KeyFormat.Base64 });
console.log('build', aes.build, '\nmain key', aes.mainKey);

const key = await client.aes.dynamicKey('3AE64B8EFF45E9F5A32208648302B353');
```

## Map, news, and playlists

```ts
const pois = await client.map.pois();
console.log(`${pois.length} named locations`);

const news = await client.news.br();
console.log(`${news.motds?.length ?? 0} battle royale messages`);

const playlists = await client.playlists.all();
const solo = await client.playlists.byId('playlist_defaultsolo');
```

## Caching, retries, timeouts, and abort

```ts
import { FortniteAPI } from 'fnapi-js';

const client = new FortniteAPI({
  cache: { enabled: true, ttl: 120_000 },
  retry: { attempts: 4, minDelay: 500, maxDelay: 5_000 },
  timeout: 15_000,
});

const controller = new AbortController();
setTimeout(() => controller.abort(), 3_000);

const shop = await client.shop.get({ signal: controller.signal });
```

## Typed error handling

Every failure is a subclass of `FortniteApiError`, so you can branch with `instanceof`:

```ts
import { NotFoundError, RateLimitError, ValidationError } from 'fnapi-js';

try {
  await client.stats.byName('SomePlayer');
} catch (err) {
  if (err instanceof ValidationError) console.error('missing API key or bad input');
  else if (err instanceof NotFoundError) console.error('player not found');
  else if (err instanceof RateLimitError) console.error(`rate limited, retry after ${err.retryAfter}ms`);
  else throw err;
}
```

## Epic — application token

The simplest Epic grant needs no user interaction:

```ts
import { EpicGamesClient } from 'fnapi-js';

const epic = new EpicGamesClient();

const session = await epic.loginClientCredentials();
const verified = await session.verify();
console.log('verified client', verified.client_id);

await session.logout();
```

## Epic — device-code login, then a reusable device auth

Sign a user in with the device-code flow, then trade the temporary session for a reusable device auth. The device-code client can't create device auths, so switch to the android client first (an exchange-code hop):

```ts
import { EpicGamesClient } from 'fnapi-js';

const epic = new EpicGamesClient();

const login = await epic.loginWithDeviceCode({
  onPrompt: (flow) => console.log('Open', flow.verificationUriComplete),
  onPending: (info) => process.stdout.write(`\rwaiting for authorization (#${info.attempt})`),
});
console.log(`\nlogged in as ${login.displayName}`);

const android = await login.switchClient('fortniteAndroid');
const deviceAuth = await android.createDeviceAuth();

console.log('save these credentials for silent logins:');
console.log(JSON.stringify({
  accountId: deviceAuth.accountId,
  deviceId: deviceAuth.deviceId,
  secret: deviceAuth.secret,
}, null, 2));

await android.logout();
await login.logout();
```

## Epic — silent login with a saved device auth

```ts
const session = await epic.loginWithDeviceAuth({
  accountId: creds.accountId,
  deviceId: creds.deviceId,
  secret: creds.secret,
});

const me = await session.me();
console.log(`logged in as ${me.displayName} (${me.id})`);

const auths = await session.listDeviceAuths();
console.log(`${auths.length} device auths on this account`);

await session.ensureValid(); // refreshes the token if it is close to expiring
await session.logout();
```

## Epic — look up accounts

```ts
const byName = await session.accountByDisplayName('Ninja');
const byId = await session.account(byName.id);
const many = await session.accountsByIds([byName.id]);
```

## Epic — a custom auth client

Anywhere a client is accepted you can pass your own `{ clientId, clientSecret }` instead of a built-in name:

```ts
const session = await epic.loginClientCredentials({
  client: { name: 'my-app', clientId: 'your-client-id', clientSecret: 'your-secret' },
});
```

## Reading Epic error details

Epic failures are `EpicApiError` / `EpicAuthError` and carry the documented explanation of the error code:

```ts
import { EpicApiError } from 'fnapi-js';

try {
  await session.createDeviceAuth();
} catch (err) {
  if (err instanceof EpicApiError) {
    console.error(err.status, err.errorCode);
    console.error(err.description); // human-readable explanation from the docs
  }
}
```

## Lobby bot with fnbr.js

fnapi-js pairs well with [fnbr.js](https://github.com/fnbrjs/fnbr.js) for lobby bots: use fnbr.js for the account/party/XMPP side, and fnapi-js to turn a cosmetic name into an id. This bot sets the party outfit or emote from a friend message like `!skin renegade raider`.

```js
import { Client } from 'fnbr';
import { CosmeticSearchBuilder, CosmeticType, FortniteAPI, MatchMethod } from 'fnapi-js';

const client = new Client();
const fnapi = new FortniteAPI({ cache: { enabled: true } });

async function find(type, name) {
  return fnapi.cosmetics.find(
    new CosmeticSearchBuilder().type(type).name(name).matchMethod(MatchMethod.Contains),
  );
}

client.on('friend:message', async (message) => {
  if (!message.content.startsWith('!')) return;
  const args = message.content.slice(1).split(' ');
  const command = args.shift().toLowerCase();
  const name = args.join(' ');

  if (command === 'skin') {
    const skin = await find(CosmeticType.outfit, name);
    if (!skin) return message.reply(`Couldn't find the skin "${name}"`);
    await message.client.party.me.setOutfit(skin.id);
    await message.reply(`Set the skin to ${skin.name}!`);
  } else if (command === 'emote') {
    const emote = await find(CosmeticType.emote, name);
    if (!emote) return message.reply(`Couldn't find the emote "${name}"`);
    await message.client.party.me.setEmote(emote.id);
    await message.reply(`Set the emote to ${emote.name}!`);
  }
});

client.on('ready', () => console.log(`Logged in as ${client.user.displayName}`));
client.login();
```

The full runnable version lives in `examples/integrations/fnbrjs-lobbybot.mjs`.

---

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

A single call can opt in even when the client cache is off: `cache: { ttl: 300_000 }` stores that response for five minutes, and `cache: true` uses the client default. Identical GETs that are already in flight share one request regardless of caching, so ten concurrent `fncc.playlists.list()` calls hit the network once.

When caching is enabled, GET responses are stored in an LRU `MemoryCache` reachable at `client.rest.cache`. It is bounded by `maxEntries` (evicting the oldest entry) and each entry expires after its `ttl`. Cached hits are returned as fresh `ApiResponse` objects with `cached === true` and a deep-cloned body, so mutating a result never corrupts the cache. Useful methods: `get`, `has`, `set`, `delete`, `clear`, `prune`, and the `size` getter.

---

# Error Handling

Every error thrown by fnapi-js — from both the Fortnite and Epic clients — descends from a single base class, so you can catch broadly or narrowly with `instanceof`.

## The error hierarchy

**`FortniteApiError`** is the root. All others extend it (directly or through `HttpError`).

### HTTP errors

`HttpError` is thrown for non-2xx responses and carries `status`, `method`, `url`, `body`, and `headers`. Specific status codes map to dedicated subclasses:

| Class | Status |
| --- | --- |
| `BadRequestError` | 400 |
| `AuthenticationError` | 401 |
| `ForbiddenError` | 403 |
| `NotFoundError` | 404 |
| `GoneError` | 410 |
| `RateLimitError` | 429 — adds `retryAfter` (ms, or `null`) |
| `ServerError` | any 5xx |

Any other non-2xx status throws the base `HttpError`.

### Non-HTTP errors

- **`ValidationError`** — invalid arguments before a request is made; carries the offending `parameter` (or `null`).
- **`TimeoutError`** — the request exceeded its `timeout`; carries `timeout` and `url`.
- **`AbortError`** — the request was cancelled via an `AbortSignal`; carries `url`.
- **`NetworkError`** — the transport failed (DNS, connection reset, etc.); carries `url` and a `cause`.
- **`ParseError`** — the response claimed to be JSON but could not be parsed; carries `url` and the `raw` text.

The Epic client adds **`EpicApiError`** and its status-specific subclasses **`EpicAuthError`** (OAuth failures), **`EpicPermissionError`** (403 / missing-permission), **`EpicNotFoundError`** (404), and **`EpicRateLimitError`** (429), covered in **Epic Authentication**. All of them extend `FortniteApiError`.

## How retries, timeouts, and abort interact

- **Retries.** Failed requests are retried per the client `retry` policy. HTTP errors are retried only when their status is in the retry `statusCodes` set; transport errors are retried with exponential backoff between `minDelay` and `maxDelay`. On a `429` (or any error carrying a `Retry-After` header), the client waits the server-advertised delay, capped at `maxDelay`.
- **Timeouts.** Each attempt is bounded by `timeout`. When it elapses the attempt is aborted and surfaced as a `TimeoutError`.
- **Abort.** Passing your own `signal` lets you cancel in flight. A user-initiated abort throws `AbortError` immediately and is **not** retried. Your signal is linked with the internal timeout signal, so whichever fires first wins.

```ts
const controller = new AbortController();
setTimeout(() => controller.abort(), 10_000);

const shop = await client.shop.get({ signal: controller.signal });
```

## Catching by type

```ts
import { NotFoundError, RateLimitError, ValidationError } from 'fnapi-js';

try {
  const stats = await client.stats.byName('SomePlayer');
  console.log(stats.account.name);
} catch (error) {
  if (error instanceof NotFoundError) {
    console.error('No such player:', error.message);
  } else if (error instanceof RateLimitError) {
    console.error(`Rate limited, retry after ${error.retryAfter}ms`);
  } else if (error instanceof ValidationError) {
    console.error(`Invalid "${error.parameter}": ${error.message}`);
  } else {
    throw error;
  }
}
```

## `find*` and `*ById` helpers return `null`

When a missing resource is an expected outcome rather than an error, prefer the helper methods that resolve to `null` on a 404 instead of throwing `NotFoundError`. For example `cosmetics.search(...)` throws when nothing matches, while `cosmetics.find(...)` returns `null`:

```ts
const outfit = await client.cosmetics.find({
  name: 'Ghoul Trooper',
  matchMethod: MatchMethod.Full,
});

if (outfit) {
  console.log(`${outfit.name} last appeared ${outfit.shopHistory?.at(-1) ?? 'never'}`);
}
```

The same pattern appears across endpoints as `find*` / `*ById` variants — reach for them to keep 404s out of your `try`/`catch`.

---

# Epic Authentication

`EpicGamesClient` wraps the Epic Games account service: OAuth grants, token verification, exchange codes, the device-code login flow, and reusable device auths. Every successful login resolves to an **`EpicAuthSession`** that manages the token and exposes account-service calls.

```ts
import { EpicGamesClient } from 'fnapi-js';

const epic = new EpicGamesClient();
```

## Auth clients

Epic OAuth requires a *client* — a `clientId` / `clientSecret` pair identifying the app requesting the token. fnapi-js ships a registry of well-known clients on the exported **`AuthClients`** object (e.g. `fortnitePC`, `fortniteIOS`, `fortniteAndroid`, `fortniteSwitch`, `fortniteNewSwitch`, `launcherApp`, and more).

Anywhere a client is expected you may pass an `AuthClientInput`:

- a registry **key** — `'fortnitePC'`
- a client **name or id** string — resolved against the built-in index
- the client **object** — `AuthClients.fortniteAndroid`
- a fully **custom** client — `{ name: 'my-app', clientId: '...', clientSecret: '...' }`

```ts
await epic.loginClientCredentials({
  client: { name: 'my-app', clientId: 'your-client-id', clientSecret: 'your-secret' },
});
```

An unknown string or a custom client missing a `clientId` throws a `ValidationError`. The default client (when you pass none) is `fortnitePC`.

## Grant types

Each grant has a `loginWith*` convenience method that returns a session:

- **`loginClientCredentials(...)`** — app-only token, not bound to an account.
- **`loginWithDeviceCode(...)`** — interactive browser confirmation (below).
- **`loginWithDeviceAuth(credentials, ...)`** — silent login with saved device-auth credentials.
- **`loginWithExchangeCode(code, ...)`** / **`loginWithAuthorizationCode(code, ...)`** — code-based grants.
- **`loginWithRefreshToken(refreshToken, ...)`** — resume from a refresh token.

For full control, `epic.login((auth, client) => ...)` runs a custom grant callback and wraps the resulting token in a session.

## The device-code login flow

Device code is the recommended way to sign in as a real user without handling their password. `loginWithDeviceCode` starts the flow, hands you a prompt to show the user, and polls until they confirm in the browser.

```ts
const login = await epic.loginWithDeviceCode({
  onPrompt(flow) {
    console.log('To sign in, open this link and confirm the code:');
    console.log(`  ${flow.verificationUriComplete}`);
    console.log(`  code: ${flow.userCode} (expires in ${Math.round(flow.expiresInMs / 1000)}s)`);
  },
  onPending(info) {
    process.stdout.write(`\rwaiting for authorization (poll #${info.attempt})...`);
  },
});

console.log(`logged in as ${login.displayName} (${login.accountId}) via ${login.client.name}`);
```

- **`onPrompt(flow)`** receives a `DeviceCodeFlow` with `userCode`, `verificationUri`, `verificationUriComplete`, `intervalSeconds`, `expiresAt`, and `expiresInMs`. Show `verificationUriComplete` (or the URI + `userCode`) to the user.
- **`onPending(info)`** fires on each poll with `attempt`, `intervalMs`, and `expiresInMs`.

If you need the two steps separately, call `epic.startDeviceCode()` to get the `DeviceCodeFlow`, then `flow.poll()` (session) or `flow.pollForToken()` (raw token). Polling honours the server interval and stops at `expiresAt` or `maxAttempts`.

## The client-switch requirement for device auths

The device-code flow signs in through a *switch* client (`fortniteNewSwitch`) that **cannot create device auths**. To mint reusable credentials you must first move the session to a client that can — typically `fortniteAndroid` — using an exchange code, then call `createDeviceAuth()`.

From a session, **`switchClient(toClient)`** does the exchange-and-relogin for you and returns a new session on the target client:

```ts
const android = await login.switchClient('fortniteAndroid');
console.log(`switched to ${android.client.name} for device-auth permissions`);

const deviceAuth = await android.createDeviceAuth();
console.log('reusable device auth created — save this for silent logins:');
console.log(JSON.stringify(
  { accountId: deviceAuth.accountId, deviceId: deviceAuth.deviceId, secret: deviceAuth.secret },
  null,
  2,
));

await android.logout();
await login.logout();
```

Equivalently, `epic.changeClient(accessToken, toClient)` performs the same exchange starting from a raw access token. Persist the `{ accountId, deviceId, secret }` triple somewhere safe (this project's `config.json` convention fits well) — it is the reusable credential.

## Logging back in later

With saved device-auth credentials you can log in silently on any capable client, with no browser step:

```ts
import { AuthClients, EpicGamesClient } from 'fnapi-js';

const epic = new EpicGamesClient();

const session = await epic.loginWithDeviceAuth(
  {
    accountId: config.epic.accountId,
    deviceId: config.epic.deviceId,
    secret: config.epic.secret,
  },
  { client: AuthClients.fortnitePC },
);

const me = await session.me();
console.log(`logged in as ${me.displayName} (${me.id})`);

await session.ensureValid();
await session.logout();
```

The returned `EpicAuthSession` refreshes itself: `ensureValid()` renews the token when it is close to expiry, and getters like `isExpired`, `expiresAt`, and `canRefresh` let you inspect it. Account-scoped calls (`me`, `createDeviceAuth`, `listDeviceAuths`, `killOtherSessions`) require an account-bound session and throw `ValidationError` on a client-credentials token.

## Reading Epic errors

Account-service failures throw **`EpicApiError`** (or **`EpicAuthError`** for OAuth endpoints). Beyond `status` / `url` / `body`, Epic errors expose `errorCode`, `numericErrorCode`, `messageVars`, and a human-readable **`description`** looked up from the documented Epic error code — handy for surfacing a clear reason to users.

```ts
import { EpicAuthError } from 'fnapi-js';

try {
  await epic.loginWithDeviceAuth(credentials);
} catch (error) {
  if (error instanceof EpicAuthError) {
    console.error(error.errorCode, '-', error.description ?? error.message);
  } else {
    throw error;
  }
}
```

## Custom clients & operations

The bundled auth clients (`AuthClients`, and the wider `ALL_AUTH_CLIENTS`) cover the known Fortnite/Epic game clients. You can still use your **own** `{ clientId, clientSecret }`, and call MCP operations Epic added after this release — but both are gated behind a flag so you never send unexpected credentials or command names by accident. Without the flag, the library throws a `ConfigurationError`.

```ts
import { EpicGamesClient } from 'fnapi-js';

const epic = new EpicGamesClient({
  allowCustomClients: true,        // permit custom { clientId, clientSecret }
  allowCustomMcpOperations: true,  // permit MCP operation names not in MCP_OPERATIONS
});

// now these work:
const session = await epic.loginClientCredentials({
  client: { name: 'my-app', clientId: 'your-id', clientSecret: 'your-secret' },
});
await session.mcpOperation('SomeNewOperationEpicAdded');
```

`allowCustomClients` also governs `session.switchClient(...)` and `client.changeClient(...)`. Built-in clients (by name, by id, or the registry objects) are never gated — only genuinely unknown client objects. Likewise, every operation in [`MCP_OPERATIONS`](/reference/mcp-operations) always works; only unknown operation names need `allowCustomMcpOperations`.

---


# ═══════════════  Fortnite API  ═══════════════

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

---

# AesEndpoint

`client.aes` — AES encryption keys for the current build, including the main key and per-pak dynamic keys. Accessed via `client.aes`.

## AesEndpoint
<Badge type="tip" text="class" />

```ts
class AesEndpoint extends BaseEndpoint
```

Fetches the game's AES keys. Provides the full `Aes` payload plus convenience accessors for the main key and a single dynamic pak key.

```ts
const aes = await client.aes.get({ keyFormat: 'base64' });
console.log(aes.build, aes.dynamicKeys.length);
```

::: tip Note
All methods accept an optional `AesOptions` whose `keyFormat` selects `hex` or `base64` key encoding.
:::

## get
<Badge type="info" text="method" />

```ts
get(options?: AesOptions): Promise<Aes>
```

Fetches the full AES payload: build string, main key, and the list of dynamic pak keys.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `AesOptions` | Optional; `keyFormat` (`'hex'` | `'base64'`) plus base request options (`signal`, `timeout`, `cache`, `headers`). |

**Returns:** `Promise<Aes> — the build, mainKey, and dynamicKeys`

```ts
const aes = await client.aes.get();
console.log(`Build ${aes.build} main key ${aes.mainKey}`);
```

## mainKey
<Badge type="info" text="method" />

```ts
mainKey(options?: AesOptions): Promise<string | null>
```

Convenience accessor returning just the current main AES key, or `null` if unavailable.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `AesOptions` | Optional; forwards `keyFormat` and base request options to `get`. |

**Returns:** `Promise<string | null> — the main key, or null`

```ts
const key = await client.aes.mainKey();
if (key) console.log(key);
```

## dynamicKey
<Badge type="info" text="method" />

```ts
dynamicKey(pakGuid: string, options?: AesOptions): Promise<string | null>
```

Returns the dynamic key for a specific pak GUID (case-insensitive match), or `null` if no matching pak exists.

| Parameter | Type | Description |
| --- | --- | --- |
| `pakGuid` | `string` | The pak GUID to look up. Required non-empty string. |
| `options` | `AesOptions` | Optional; forwards `keyFormat` and base request options. |

**Returns:** `Promise<string | null> — the matching dynamic key, or null`

```ts
const key = await client.aes.dynamicKey('4BA6DF23433D91F0E42832BB9A2E75CB');
console.log(key);
```

---

# BannersEndpoint

`client.banners` — profile banners and banner colors, with client-side helpers to look one up by id. Accessed via `client.banners`.

## BannersEndpoint
<Badge type="tip" text="class" />

```ts
class BannersEndpoint extends BaseEndpoint
```

Lists banners and banner colors. The `byId`/`colorById` helpers fetch the full list and filter locally.

```ts
const banners = await client.banners.all();
const colors = await client.banners.colors();
```

::: tip Note
`all` and `byId` accept `LanguageOptions` (localizable); `colors` and `colorById` accept plain `BaseOptions`.
:::

## all
<Badge type="info" text="method" />

```ts
all(options?: LanguageOptions): Promise<Banner[]>
```

Fetches every profile banner.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `LanguageOptions` | Optional; `language` plus base request options. |

**Returns:** `Promise<Banner[]> — all banners`

```ts
const banners = await client.banners.all();
console.log(`${banners.length} banners`);
```

## colors
<Badge type="info" text="method" />

```ts
colors(options?: BaseOptions): Promise<BannerColor[]>
```

Fetches every available banner color.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `BaseOptions` | Optional base request options (`signal`, `timeout`, `cache`, `headers`). |

**Returns:** `Promise<BannerColor[]> — all banner colors`

```ts
const colors = await client.banners.colors();
```

## byId
<Badge type="info" text="method" />

```ts
byId(bannerId: string, options?: LanguageOptions): Promise<Banner | null>
```

Fetches all banners and returns the one whose `id` matches, or `null` if none match.

| Parameter | Type | Description |
| --- | --- | --- |
| `bannerId` | `string` | The banner id to find. Required non-empty string. |
| `options` | `LanguageOptions` | Optional; `language` plus base request options. |

**Returns:** `Promise<Banner | null> — the matching banner, or null`

```ts
const banner = await client.banners.byId('standardbanner15');
if (banner) console.log(banner.category);
```

## colorById
<Badge type="info" text="method" />

```ts
colorById(colorId: string, options?: BaseOptions): Promise<BannerColor | null>
```

Fetches all banner colors and returns the one whose `id` matches, or `null` if none match.

| Parameter | Type | Description |
| --- | --- | --- |
| `colorId` | `string` | The banner color id to find. Required non-empty string. |
| `options` | `BaseOptions` | Optional base request options. |

**Returns:** `Promise<BannerColor | null> — the matching color, or null`

```ts
const color = await client.banners.colorById('defaultcolor1');
if (color) console.log(color.color);
```

---

# CosmeticsEndpoint

`client.cosmetics` — every cosmetic listing (BR, tracks, instruments, cars, LEGO, LEGO kits, beans) plus id lookups and full search. All methods accept `FlagOptions` (`language` + `responseFlags`); search accepts a `CosmeticSearchParams` object or a `CosmeticSearchBuilder`.

## CosmeticsEndpoint
<Badge type="tip" text="class" />

```ts
class CosmeticsEndpoint extends BaseEndpoint
```

The largest endpoint: bulk listings per cosmetic category, id-based lookups, and server-side search. Search input is a `CosmeticSearchInput` — either a plain `CosmeticSearchParams` object or a `CosmeticSearchBuilder`.

```ts
import { MatchMethod } from 'fnapi-js';

const all = await client.cosmetics.all();
const renegade = await client.cosmetics.search({
  name: 'Renegade Raider',
  matchMethod: MatchMethod.Full,
});
```

::: tip Note
`FlagOptions` extends `LanguageOptions` with `responseFlags` (bitmask, `number | string`) which controls extra response fields. `find`/`findById` swallow `NotFoundError` and return `null`; `search`/`byId` throw it.
:::

## all
<Badge type="info" text="method" />

```ts
all(options?: FlagOptions): Promise<AllCosmetics>
```

Fetches every cosmetic across all categories in one grouped payload.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `FlagOptions` | Optional; `language`, `responseFlags`, and base request options. |

**Returns:** `Promise<AllCosmetics> — cosmetics grouped by category`

```ts
const all = await client.cosmetics.all();
console.log(all.br.length);
```

## newCosmetics
<Badge type="info" text="method" />

```ts
newCosmetics(options?: FlagOptions): Promise<NewCosmetics>
```

Fetches cosmetics newly added in the latest build, grouped by category.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `FlagOptions` | Optional; `language`, `responseFlags`, and base request options. |

**Returns:** `Promise<NewCosmetics> — the newly added cosmetics`

```ts
const fresh = await client.cosmetics.newCosmetics();
console.log(fresh.build);
```

## br
<Badge type="info" text="method" />

```ts
br(options?: FlagOptions): Promise<BrCosmetic[]>
```

Fetches all Battle Royale cosmetics (outfits, back blings, pickaxes, emotes, etc.).

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `FlagOptions` | Optional; `language`, `responseFlags`, and base request options. |

**Returns:** `Promise<BrCosmetic[]> — all BR cosmetics`

```ts
const brItems = await client.cosmetics.br();
```

## tracks
<Badge type="info" text="method" />

```ts
tracks(options?: FlagOptions): Promise<TrackCosmetic[]>
```

Fetches all Festival jam tracks.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `FlagOptions` | Optional; `language`, `responseFlags`, and base request options. |

**Returns:** `Promise<TrackCosmetic[]> — all track cosmetics`

```ts
const tracks = await client.cosmetics.tracks();
```

## instruments
<Badge type="info" text="method" />

```ts
instruments(options?: FlagOptions): Promise<InstrumentCosmetic[]>
```

Fetches all Festival instruments.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `FlagOptions` | Optional; `language`, `responseFlags`, and base request options. |

**Returns:** `Promise<InstrumentCosmetic[]> — all instrument cosmetics`

```ts
const instruments = await client.cosmetics.instruments();
```

## cars
<Badge type="info" text="method" />

```ts
cars(options?: FlagOptions): Promise<CarCosmetic[]>
```

Fetches all Rocket Racing car cosmetics.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `FlagOptions` | Optional; `language`, `responseFlags`, and base request options. |

**Returns:** `Promise<CarCosmetic[]> — all car cosmetics`

```ts
const cars = await client.cosmetics.cars();
```

## lego
<Badge type="info" text="method" />

```ts
lego(options?: FlagOptions): Promise<LegoCosmetic[]>
```

Fetches all LEGO cosmetic variants.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `FlagOptions` | Optional; `language`, `responseFlags`, and base request options. |

**Returns:** `Promise<LegoCosmetic[]> — all LEGO cosmetics`

```ts
const lego = await client.cosmetics.lego();
```

## legoKits
<Badge type="info" text="method" />

```ts
legoKits(options?: FlagOptions): Promise<LegoKitCosmetic[]>
```

Fetches all LEGO build kits.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `FlagOptions` | Optional; `language`, `responseFlags`, and base request options. |

**Returns:** `Promise<LegoKitCosmetic[]> — all LEGO kit cosmetics`

```ts
const kits = await client.cosmetics.legoKits();
```

## beans
<Badge type="info" text="method" />

```ts
beans(options?: FlagOptions): Promise<BeanCosmetic[]>
```

Fetches all Fall Guys bean cosmetics.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `FlagOptions` | Optional; `language`, `responseFlags`, and base request options. |

**Returns:** `Promise<BeanCosmetic[]> — all bean cosmetics`

```ts
const beans = await client.cosmetics.beans();
```

## byId
<Badge type="info" text="method" />

```ts
byId(cosmeticId: string, options?: FlagOptions): Promise<BrCosmetic>
```

Fetches a single BR cosmetic by its id. Throws `NotFoundError` if it does not exist.

| Parameter | Type | Description |
| --- | --- | --- |
| `cosmeticId` | `string` | The cosmetic id. Required non-empty string. |
| `options` | `FlagOptions` | Optional; `language`, `responseFlags`, and base request options. |

**Returns:** `Promise<BrCosmetic> — the matching cosmetic`

```ts
const item = await client.cosmetics.byId('CID_028_Athena_Commando_F');
console.log(item.name);
```

## byIds
<Badge type="info" text="method" />

```ts
byIds(cosmeticIds: string[], options?: FlagOptions): Promise<BrCosmetic[]>
```

Fetches multiple BR cosmetics by id in one request. Throws `ValidationError` if the array is empty or contains a non-string id.

| Parameter | Type | Description |
| --- | --- | --- |
| `cosmeticIds` | `string[]` | Non-empty array of cosmetic ids, each a non-empty string. |
| `options` | `FlagOptions` | Optional; `language`, `responseFlags`, and base request options. |

**Returns:** `Promise<BrCosmetic[]> — the matching cosmetics`

```ts
const items = await client.cosmetics.byIds([
  'CID_028_Athena_Commando_F',
  'CID_029_Athena_Commando_F_Halloween',
]);
```

## search
<Badge type="info" text="method" />

```ts
search(input: CosmeticSearchInput, options?: CosmeticSearchOptions): Promise<BrCosmetic>
```

Server-side search returning the single best-matching BR cosmetic. Throws `NotFoundError` when nothing matches.

| Parameter | Type | Description |
| --- | --- | --- |
| `input` | `CosmeticSearchInput` | A `CosmeticSearchParams` object (e.g. `name`, `type`, `rarity`, `matchMethod`) or a `CosmeticSearchBuilder`. |
| `options` | `CosmeticSearchOptions` | Optional; alias of `FlagOptions` (`language`, `responseFlags`, base request options). |

**Returns:** `Promise<BrCosmetic> — the matched cosmetic`

```ts
import { MatchMethod } from 'fnapi-js';

const raider = await client.cosmetics.search({
  name: 'Renegade Raider',
  matchMethod: MatchMethod.Full,
});
console.log(raider.rarity.displayValue);
```

## searchAll
<Badge type="info" text="method" />

```ts
searchAll(input: CosmeticSearchInput, options?: CosmeticSearchOptions): Promise<BrCosmetic[]>
```

Server-side search returning every BR cosmetic matching the criteria.

| Parameter | Type | Description |
| --- | --- | --- |
| `input` | `CosmeticSearchInput` | A `CosmeticSearchParams` object or a `CosmeticSearchBuilder`. |
| `options` | `CosmeticSearchOptions` | Optional; alias of `FlagOptions`. |

**Returns:** `Promise<BrCosmetic[]> — all matching cosmetics`

```ts
import { CosmeticSearchBuilder } from 'fnapi-js';

const legendaries = await client.cosmetics.searchAll(
  CosmeticSearchBuilder.from({ rarity: 'legendary' }),
);
```

## find
<Badge type="info" text="method" />

```ts
find(input: CosmeticSearchInput, options?: CosmeticSearchOptions): Promise<BrCosmetic | null>
```

Like `search`, but returns `null` instead of throwing `NotFoundError` when nothing matches. Other errors still propagate.

| Parameter | Type | Description |
| --- | --- | --- |
| `input` | `CosmeticSearchInput` | A `CosmeticSearchParams` object or a `CosmeticSearchBuilder`. |
| `options` | `CosmeticSearchOptions` | Optional; alias of `FlagOptions`. |

**Returns:** `Promise<BrCosmetic | null> — the matched cosmetic, or null`

```ts
const skin = await client.cosmetics.find({ name: 'Not A Real Skin' });
console.log(skin === null ? 'not found' : skin.name);
```

## findById
<Badge type="info" text="method" />

```ts
findById(cosmeticId: string, options?: FlagOptions): Promise<BrCosmetic | null>
```

Like `byId`, but returns `null` instead of throwing `NotFoundError` when the id does not exist. Other errors still propagate.

| Parameter | Type | Description |
| --- | --- | --- |
| `cosmeticId` | `string` | The cosmetic id. Required non-empty string. |
| `options` | `FlagOptions` | Optional; `language`, `responseFlags`, and base request options. |

**Returns:** `Promise<BrCosmetic | null> — the matching cosmetic, or null`

```ts
const item = await client.cosmetics.findById('CID_028_Athena_Commando_F');
if (item) console.log(item.name);
```

---

# CreatorCodeEndpoint

`client.creatorCode` (alias `client.sac`) — Support-A-Creator code lookups and an existence check. Both accept `BaseOptions`.

## CreatorCodeEndpoint
<Badge type="tip" text="class" />

```ts
class CreatorCodeEndpoint extends BaseEndpoint
```

Resolves Support-A-Creator codes to their owning account and status. Exposed as both `client.creatorCode` and `client.sac`.

```ts
const creator = await client.creatorCode.get('ninja');
console.log(creator.account.name, creator.status);
```

::: tip Note
`get` throws `NotFoundError` for unknown codes; `exists` catches that and returns `false`.
:::

## get
<Badge type="info" text="method" />

```ts
get(code: string, options?: BaseOptions): Promise<CreatorCode>
```

Looks up a Support-A-Creator code and returns its details, including the owning account and status. Throws `NotFoundError` if the code does not exist.

| Parameter | Type | Description |
| --- | --- | --- |
| `code` | `string` | The creator code to resolve. Required non-empty string. |
| `options` | `BaseOptions` | Optional base request options (`signal`, `timeout`, `cache`, `headers`). |

**Returns:** `Promise<CreatorCode> — the resolved code details`

```ts
const creator = await client.creatorCode.get('ninja');
console.log(`${creator.code} -> ${creator.account.name} (${creator.status})`);
```

## exists
<Badge type="info" text="method" />

```ts
exists(code: string, options?: BaseOptions): Promise<boolean>
```

Returns `true` if the creator code resolves, `false` if it triggers a `NotFoundError`. Other errors still propagate.

| Parameter | Type | Description |
| --- | --- | --- |
| `code` | `string` | The creator code to check. Required non-empty string. |
| `options` | `BaseOptions` | Optional base request options. |

**Returns:** `Promise<boolean> — whether the code exists`

```ts
if (await client.sac.exists('ninja')) {
  console.log('code is active');
}
```

---

# MapEndpoint

Access to the current Battle Royale map, its POIs, and single-POI lookup. Reached via `client.map`. All methods accept optional `LanguageOptions` (`language`, `signal`, `timeout`, `cache`, `headers`).

## MapEndpoint
<Badge type="tip" text="class" />

```ts
class MapEndpoint extends BaseEndpoint
```

Endpoint wrapper for `/v1/map`. Exposes the map image URLs plus the list of named POIs, and helpers to slice that list without a second request.

```ts
import { FortniteAPI } from 'fnapi-js';

const client = new FortniteAPI();
const map = await client.map.get();
console.log(map.images.pois, map.pois.length);
```

## get
<Badge type="info" text="method" />

```ts
get(options?: LanguageOptions): Promise<GameMap>
```

Fetches the full map object, including `images` (blank and POI overlays) and the `pois` array.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `LanguageOptions` | Optional per-request `language` plus transport controls (`signal`, `timeout`, `cache`, `headers`). |

**Returns:** `Promise<GameMap> resolving to the map, its image URLs, and POIs`

```ts
const map = await client.map.get({ language: 'en' });
console.log(map.images.blank);
```

## pois
<Badge type="info" text="method" />

```ts
pois(options?: LanguageOptions): Promise<Poi[]>
```

Convenience accessor that calls `get()` and returns only the `pois` array.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `LanguageOptions` | Optional language and transport controls. |

**Returns:** `Promise<Poi[]> — the named locations on the map`

```ts
const pois = await client.map.pois();
for (const poi of pois) console.log(poi.id, poi.name);
```

## poiById
<Badge type="info" text="method" />

```ts
poiById(poiId: string, options?: LanguageOptions): Promise<Poi | null>
```

Fetches the POI list and returns the POI whose `id` matches, or `null` if none match. Throws `ValidationError` when `poiId` is empty.

| Parameter | Type | Description |
| --- | --- | --- |
| `poiId` | `string` | The POI id to look up (e.g. `"Athena.Location.POI..."`). |
| `options` | `LanguageOptions` | Optional language and transport controls. |

**Returns:** `Promise<Poi | null> — the matching POI, or null`

```ts
const poi = await client.map.poiById('Athena.Location.POI.Foo');
if (poi) console.log(poi.name, poi.location);
```

---

# NewsEndpoint

In-game news feeds. Reached via `client.news`. `all()` returns both game modes; `br()` and `stw()` return a single mode's `GameModeNews`. All accept optional `LanguageOptions`.

## NewsEndpoint
<Badge type="tip" text="class" />

```ts
class NewsEndpoint extends BaseEndpoint
```

Endpoint wrapper for the `/v2/news` routes covering Battle Royale and Save the World news feeds.

```ts
import { FortniteAPI } from 'fnapi-js';

const client = new FortniteAPI();
const news = await client.news.all();
console.log(news.br?.motds?.length);
```

## all
<Badge type="info" text="method" />

```ts
all(options?: LanguageOptions): Promise<News>
```

Fetches the combined news payload containing the optional `br` and `stw` feeds.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `LanguageOptions` | Optional language and transport controls. |

**Returns:** `Promise<News> — combined news with br and stw sub-feeds`

```ts
const news = await client.news.all({ language: 'de' });
console.log(news.stw?.messages);
```

## br
<Badge type="info" text="method" />

```ts
br(options?: LanguageOptions): Promise<GameModeNews>
```

Fetches only the Battle Royale news feed.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `LanguageOptions` | Optional language and transport controls. |

**Returns:** `Promise<GameModeNews> — the BR news feed (motds, messages)`

```ts
const br = await client.news.br();
for (const motd of br.motds ?? []) console.log(motd.title);
```

## stw
<Badge type="info" text="method" />

```ts
stw(options?: LanguageOptions): Promise<GameModeNews>
```

Fetches only the Save the World news feed.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `LanguageOptions` | Optional language and transport controls. |

**Returns:** `Promise<GameModeNews> — the STW news feed`

```ts
const stw = await client.news.stw();
console.log(stw.messages);
```

---

# PlaylistsEndpoint

Playlist metadata. Reached via `client.playlists`. `all()` lists every playlist; `byId()` fetches one directly from the API. Both accept optional `LanguageOptions`.

## PlaylistsEndpoint
<Badge type="tip" text="class" />

```ts
class PlaylistsEndpoint extends BaseEndpoint
```

Endpoint wrapper for the `/v1/playlists` routes.

```ts
import { FortniteAPI } from 'fnapi-js';

const client = new FortniteAPI();
const playlists = await client.playlists.all();
console.log(playlists.length);
```

## all
<Badge type="info" text="method" />

```ts
all(options?: LanguageOptions): Promise<Playlist[]>
```

Fetches the full list of available playlists.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `LanguageOptions` | Optional language and transport controls. |

**Returns:** `Promise<Playlist[]> — every known playlist`

```ts
const playlists = await client.playlists.all();
for (const p of playlists) console.log(p.id, p.name);
```

## byId
<Badge type="info" text="method" />

```ts
byId(playlistId: string, options?: LanguageOptions): Promise<Playlist>
```

Fetches a single playlist by id via a dedicated request. Throws `ValidationError` when `playlistId` is empty and `NotFoundError` when the playlist does not exist.

| Parameter | Type | Description |
| --- | --- | --- |
| `playlistId` | `string` | The playlist id (e.g. `"Playlist_DefaultSolo"`). |
| `options` | `LanguageOptions` | Optional language and transport controls. |

**Returns:** `Promise<Playlist> — the matching playlist`

```ts
const solo = await client.playlists.byId('Playlist_DefaultSolo');
console.log(solo.name);
```

---

# ShopEndpoint

The daily item shop. Reached via `client.shop`. `get()` returns the full shop; the other methods are client-side helpers over `shop.entries`. All accept optional `FlagOptions` (adds `responseFlags` on top of `LanguageOptions`).

## ShopEndpoint
<Badge type="tip" text="class" />

```ts
class ShopEndpoint extends BaseEndpoint
```

Endpoint wrapper for `/v2/shop`. Beyond `get()`, provides helpers to flatten entries, group them by section, and locate offers or cosmetics without extra requests.

```ts
import { FortniteAPI } from 'fnapi-js';

const client = new FortniteAPI();
const shop = await client.shop.get();
console.log(shop.entries.length);
```

## get
<Badge type="info" text="method" />

```ts
get(options?: FlagOptions): Promise<Shop>
```

Fetches the current item shop, including its `entries` and metadata.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `FlagOptions` | Optional `language`, `responseFlags`, and transport controls. |

**Returns:** `Promise<Shop> — the current shop`

```ts
const shop = await client.shop.get({ language: 'en' });
console.log(shop.date, shop.entries.length);
```

## entries
<Badge type="info" text="method" />

```ts
entries(options?: FlagOptions): Promise<ShopEntry[]>
```

Convenience accessor returning only `shop.entries`.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `FlagOptions` | Optional language, response flags, and transport controls. |

**Returns:** `Promise<ShopEntry[]> — the flat list of shop offers`

```ts
const entries = await client.shop.entries();
console.log(entries[0]?.offerId);
```

## sections
<Badge type="info" text="method" />

```ts
sections(options?: FlagOptions): Promise<Map<string, ShopEntry[]>>
```

Groups shop entries into a `Map` keyed by `layout.name`, falling back to `layoutId` then `"unknown"`.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `FlagOptions` | Optional language, response flags, and transport controls. |

**Returns:** `Promise<Map<string, ShopEntry[]>> — entries bucketed by section`

```ts
const sections = await client.shop.sections();
for (const [name, items] of sections) console.log(name, items.length);
```

## byOfferId
<Badge type="info" text="method" />

```ts
byOfferId(offerId: string, options?: FlagOptions): Promise<ShopEntry | null>
```

Finds the shop entry with a matching `offerId`, or `null`. Throws `ValidationError` when `offerId` is empty.

| Parameter | Type | Description |
| --- | --- | --- |
| `offerId` | `string` | The offer id to match against `entry.offerId`. |
| `options` | `FlagOptions` | Optional language, response flags, and transport controls. |

**Returns:** `Promise<ShopEntry | null> — the matching entry, or null`

```ts
const entry = await client.shop.byOfferId('v2:/abc123');
console.log(entry?.finalPrice);
```

## containing
<Badge type="info" text="method" />

```ts
containing(cosmeticId: string, options?: FlagOptions): Promise<ShopEntry[]>
```

Returns all entries that bundle the given cosmetic id, scanning `brItems`, `tracks`, `instruments`, `cars`, and `legoKits`. Throws `ValidationError` when `cosmeticId` is empty.

| Parameter | Type | Description |
| --- | --- | --- |
| `cosmeticId` | `string` | The cosmetic id to look for across each entry's item arrays. |
| `options` | `FlagOptions` | Optional language, response flags, and transport controls. |

**Returns:** `Promise<ShopEntry[]> — entries containing the cosmetic`

```ts
const entries = await client.shop.containing('CID_028_Athena_Commando_F');
console.log(entries.map((e) => e.offerId));
```

## isInShop
<Badge type="info" text="method" />

```ts
isInShop(cosmeticId: string, options?: FlagOptions): Promise<boolean>
```

Boolean convenience over `containing()` — `true` when the cosmetic appears in at least one current entry.

| Parameter | Type | Description |
| --- | --- | --- |
| `cosmeticId` | `string` | The cosmetic id to check for. |
| `options` | `FlagOptions` | Optional language, response flags, and transport controls. |

**Returns:** `Promise<boolean> — whether the cosmetic is in the shop right now`

```ts
if (await client.shop.isInShop('CID_028_Athena_Commando_F')) {
  console.log('Available today');
}
```

---

# StatsEndpoint

Battle Royale player stats. Reached via `client.stats`. Every method REQUIRES an API key — without one they throw `ValidationError` before making a request. Construct the client with `new FortniteAPI({ apiKey })`. Lookups support `accountType` (`'epic' | 'psn' | 'xbl'`, name lookup only), `timeWindow` (`'lifetime' | 'season'`), and `image` (`'all' | 'keyboardMouse' | 'gamepad' | 'touch' | 'none'`).

## StatsEndpoint
<Badge type="tip" text="class" />

```ts
class StatsEndpoint extends BaseEndpoint
```

Endpoint wrapper for `/v2/stats/br`. `byName`/`byId` throw on missing players; the `find*` variants swallow `NotFoundError` and return `null`. All four require the client to have been given an `apiKey`.

```ts
import { FortniteAPI } from 'fnapi-js';

const client = new FortniteAPI({ apiKey: process.env.FN_API_KEY });
const stats = await client.stats.byName('Ninja');
console.log(stats.stats.all.overall.wins);
```

::: tip Note
Requires an API key from fortnite-api.com. Missing key throws `ValidationError`; a private or nonexistent account throws `NotFoundError` from `byName`/`byId`.
:::

## byName
<Badge type="info" text="method" />

```ts
byName(name: string, options?: StatsLookupOptions): Promise<BrStats>
```

Looks up a player's BR stats by display name. Requires an API key (throws `ValidationError` otherwise) and a non-empty `name`.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | `string` | The player's Epic display name. |
| `options` | `StatsLookupOptions` | Optional `accountType` (`'epic'\|'psn'\|'xbl'`), `timeWindow` (`'lifetime'\|'season'`), and `image` (`StatsImage`) plus transport controls. |

**Returns:** `Promise<BrStats> — the player's account info and stat breakdown`

```ts
const stats = await client.stats.byName('Ninja', {
  accountType: 'epic',
  timeWindow: 'lifetime',
  image: 'all',
});
console.log(stats.account.id, stats.image);
```

## byId
<Badge type="info" text="method" />

```ts
byId(accountId: string, options?: StatsByIdOptions): Promise<BrStats>
```

Looks up a player's BR stats by Epic account id. Requires an API key and a non-empty `accountId`. Note `StatsByIdOptions` has no `accountType`.

| Parameter | Type | Description |
| --- | --- | --- |
| `accountId` | `string` | The player's Epic account id. |
| `options` | `StatsByIdOptions` | Optional `timeWindow` and `image` plus transport controls (no `accountType`). |

**Returns:** `Promise<BrStats> — the player's account info and stat breakdown`

```ts
const stats = await client.stats.byId('4735ce9132924caf8a5b17789b40f79c', {
  timeWindow: 'season',
});
console.log(stats.stats.all.overall.kills);
```

## findByName
<Badge type="info" text="method" />

```ts
findByName(name: string, options?: StatsLookupOptions): Promise<BrStats | null>
```

Same as `byName()` but returns `null` instead of throwing `NotFoundError` when the player is missing or private. Other errors (including the missing-API-key `ValidationError`) still propagate.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | `string` | The player's Epic display name. |
| `options` | `StatsLookupOptions` | Optional `accountType`, `timeWindow`, `image`, and transport controls. |

**Returns:** `Promise<BrStats | null> — the stats, or null if not found`

```ts
const stats = await client.stats.findByName('SomeMaybeMissingPlayer');
if (!stats) console.log('No public stats');
```

## findById
<Badge type="info" text="method" />

```ts
findById(accountId: string, options?: StatsByIdOptions): Promise<BrStats | null>
```

Same as `byId()` but returns `null` instead of throwing `NotFoundError`. Other errors still propagate.

| Parameter | Type | Description |
| --- | --- | --- |
| `accountId` | `string` | The player's Epic account id. |
| `options` | `StatsByIdOptions` | Optional `timeWindow`, `image`, and transport controls. |

**Returns:** `Promise<BrStats | null> — the stats, or null if not found`

```ts
const stats = await client.stats.findById('4735ce9132924caf8a5b17789b40f79c');
console.log(stats?.stats.all.overall.matches ?? 0);
```

---

# CosmeticSearchBuilder

A fluent, chainable builder for the cosmetics search query. Each setter mutates the builder and returns `this`. Terminal methods produce plain objects: `toParams()` gives back the raw `CosmeticSearchParams`, `build()` normalizes them into API `QueryParams` (date fields are converted to unix seconds). Pass a builder (or params) straight to `client.cosmetics.searchAll(...)`.

## CosmeticSearchBuilder
<Badge type="tip" text="class" />

```ts
class CosmeticSearchBuilder
```

Fluent builder over `CosmeticSearchParams`. Chain setters like `name`, `type`, `rarity`, `matchMethod`, `backendSeries`, `hasVariants`, `added`/`addedSince`, then hand the builder to `client.cosmetics.searchAll()`. Setters accept the typed enums or an arbitrary string where the API allows it.

```ts
import { CosmeticSearchBuilder } from 'fnapi-js';

const builder = new CosmeticSearchBuilder()
  .name('Renegade')
  .matchMethod('contains')
  .type('outfit')
  .rarity('legendary')
  .hasVariants();

const query = builder.build();
```

::: tip Note
Date-valued setters (`added`, `addedSince`, `lastAppearance`) accept `number | string | Date` and are converted to unix seconds by `build()`. `matchMethod` controls how string fields match: `'full' | 'contains' | 'starts' | 'ends'`.
:::

## from
<Badge type="info" text="getter" />

```ts
static from(params: CosmeticSearchParams): CosmeticSearchBuilder
```

Static factory that creates a new builder pre-seeded with the given params (via `merge`).

| Parameter | Type | Description |
| --- | --- | --- |
| `params` | `CosmeticSearchParams` | Initial search params to seed the builder with. |

**Returns:** `new CosmeticSearchBuilder containing params`

```ts
const builder = CosmeticSearchBuilder.from({ type: 'outfit', rarity: 'rare' });
```

## name
<Badge type="info" text="method" />

```ts
name(name: string): this
```

Sets the cosmetic display name to match (subject to `matchMethod`).

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | `string` | Name to search for. |

**Returns:** `this for chaining`

```ts
new CosmeticSearchBuilder().name('Renegade Raider');
```

## type
<Badge type="info" text="method" />

```ts
type(type: CosmeticType | (string & {})): this
```

Sets the cosmetic type (e.g. `'outfit'`, `'backpack'`, `'pickaxe'`). Accepts the `CosmeticType` enum or any string.

| Parameter | Type | Description |
| --- | --- | --- |
| `type` | `CosmeticType \| string` | Cosmetic type to filter by. |

**Returns:** `this for chaining`

```ts
new CosmeticSearchBuilder().type('outfit');
```

## rarity
<Badge type="info" text="method" />

```ts
rarity(rarity: Rarity | (string & {})): this
```

Sets the display rarity to filter by (e.g. `'legendary'`, `'epic'`). Accepts the `Rarity` enum or any string.

| Parameter | Type | Description |
| --- | --- | --- |
| `rarity` | `Rarity \| string` | Rarity value to filter by. |

**Returns:** `this for chaining`

```ts
new CosmeticSearchBuilder().rarity('legendary');
```

## matchMethod
<Badge type="info" text="method" />

```ts
matchMethod(method: MatchMethod): this
```

Sets how string fields are matched: `'full'`, `'contains'`, `'starts'`, or `'ends'`.

| Parameter | Type | Description |
| --- | --- | --- |
| `method` | `MatchMethod` | Matching strategy for text fields. |

**Returns:** `this for chaining`

```ts
new CosmeticSearchBuilder().name('raider').matchMethod('contains');
```

## backendSeries
<Badge type="info" text="method" />

```ts
backendSeries(backendSeries: CosmeticSeries | (string & {})): this
```

Filters by the backend series value (e.g. the Marvel or Icon series). Accepts the `CosmeticSeries` enum or any string.

| Parameter | Type | Description |
| --- | --- | --- |
| `backendSeries` | `CosmeticSeries \| string` | Backend series identifier. |

**Returns:** `this for chaining`

```ts
new CosmeticSearchBuilder().backendSeries('MarvelSeries');
```

## hasVariants
<Badge type="info" text="method" />

```ts
hasVariants(hasVariants?: boolean): this
```

Restricts results to cosmetics that have (or, when passed `false`, lack) selectable variants. Defaults to `true`.

| Parameter | Type | Description |
| --- | --- | --- |
| `hasVariants` | `boolean` | Whether to require variants. Defaults to `true`. |

**Returns:** `this for chaining`

```ts
new CosmeticSearchBuilder().hasVariants();
```

## added
<Badge type="info" text="method" />

```ts
added(value: number | string | Date): this
```

Filters to cosmetics added on the exact given date. The value is converted to unix seconds by `build()`.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `number \| string \| Date` | Date the cosmetic was added (Date, ISO string, or unix ms/seconds). |

**Returns:** `this for chaining`

```ts
new CosmeticSearchBuilder().added(new Date('2023-01-01'));
```

## addedSince
<Badge type="info" text="method" />

```ts
addedSince(value: number | string | Date): this
```

Filters to cosmetics added on or after the given date. Converted to unix seconds by `build()`.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `number \| string \| Date` | Lower-bound date for when the cosmetic was added. |

**Returns:** `this for chaining`

```ts
new CosmeticSearchBuilder().addedSince('2024-01-01');
```

## merge
<Badge type="info" text="method" />

```ts
merge(params: CosmeticSearchParams): this
```

Bulk-assigns the given params onto the builder via `Object.assign`, overwriting overlapping keys.

| Parameter | Type | Description |
| --- | --- | --- |
| `params` | `CosmeticSearchParams` | Params object to merge into the builder's current state. |

**Returns:** `this for chaining`

```ts
const b = new CosmeticSearchBuilder().name('Peely').merge({ rarity: 'icon', hasSeries: true });
```

## toParams
<Badge type="info" text="method" />

```ts
toParams(): CosmeticSearchParams
```

Returns a shallow copy of the accumulated `CosmeticSearchParams` (un-normalized, dates left as-is).

**Returns:** `CosmeticSearchParams — a copy of the current params`

```ts
const params = new CosmeticSearchBuilder().name('Peely').type('outfit').toParams();
```

## build
<Badge type="info" text="method" />

```ts
build(): QueryParams
```

Normalizes the params into API `QueryParams`: drops `undefined`/`null`, and converts the date keys (`added`, `addedSince`, `lastAppearance`) to unix seconds.

**Returns:** `QueryParams — the ready-to-send query object`

```ts
const query = new CosmeticSearchBuilder().addedSince('2024-01-01').build();
```

## searchAll
<Badge type="info" text="method" />

```ts
client.cosmetics.searchAll(input: CosmeticSearchInput, options?: CosmeticSearchOptions): Promise<BrCosmetic[]>
```

Runs a bulk cosmetic search on the API. `input` is a `CosmeticSearchBuilder` or a raw `CosmeticSearchParams` object; `options` is `FlagOptions`. This is the primary consumer of the builder.

| Parameter | Type | Description |
| --- | --- | --- |
| `input` | `CosmeticSearchInput` | A `CosmeticSearchBuilder` or `CosmeticSearchParams`. |
| `options` | `CosmeticSearchOptions` | Optional `FlagOptions` (`language`, `responseFlags`, transport controls). |

**Returns:** `Promise<BrCosmetic[]> — every cosmetic matching the query`

```ts
import { FortniteAPI, CosmeticSearchBuilder } from 'fnapi-js';

const client = new FortniteAPI();

const builder = new CosmeticSearchBuilder()
  .name('Raider')
  .matchMethod('contains')
  .type('outfit')
  .rarity('legendary')
  .backendSeries('CreatorCollabSeries')
  .hasVariants()
  .addedSince('2023-01-01');

const results = await client.cosmetics.searchAll(builder, { language: 'en' });
console.log(results.length, results[0]?.name);
```

---


# ═══════════════  Epic Auth  ═══════════════

# EpicGamesClient

The high-level Epic Games account-service auth client. Wires together a `RestClient`, `AuthManager`, `DeviceAuthManager`, and `AccountManager`, then exposes one-call login helpers that each return a ready-to-use `EpicAuthSession`. Public fields `rest`, `auth`, `deviceAuths`, and `accounts` are available for lower-level access.

## EpicGamesClient
<Badge type="tip" text="class" />

```ts
class EpicGamesClient { constructor(options?: EpicClientOptions) }
```

Constructs the client. `EpicClientOptions` extends `EpicRestOptions` — pass `defaultClient` to set the auth client used when a method omits one (defaults to `AuthClients.fortniteAndroid`), plus transport options `baseUrl`, `timeout`, `retry`, `userAgent`, `fetch`, and `headers`.

| Parameter | Type | Description |
| --- | --- | --- |
| `options.defaultClient` | `AuthClientInput` | Default auth client for calls that don't specify one. Accepts an `AuthClient`, a registry name like `'fortnitePC'`, or a raw client id string. Defaults to `AuthClients.fortniteAndroid`. |
| `options.timeout` | `number` | Per-request timeout in milliseconds. |
| `options.retry` | `number` | Total attempts per request (default `3`). GET / PUT / DELETE retry on 429 and 5xx and on network errors; POST / PATCH retry only on 429 so a gift or purchase is never sent twice. `Retry-After` is honoured up to 30s. Token grants for `device_auth` / `client_credentials` and the read-only MCP `QueryProfile` / `QueryPublicProfile` are treated as replayable. |
| `options.cache` (per request) | `boolean \| { ttl }` | Not a constructor option: GET-backed methods across the package accept `cache: true` (60s) or `cache: { ttl }` to keep that response in memory. Identical GETs that are in flight at the same time always share one request, keyed per token. `session.matchmakingNetCL({ cache: { ttl } })` caches the netCL lookup the same way. |
| `options.connectWebSocket` | `ConnectWebSocketFactory` | Header-capable WebSocket factory used by every session's connect stream. Optional on Node — the `ws` package is loaded automatically. |
| `options.baseUrl` | `string` | Override the Epic account-service base URL. |
| `options.fetch` | `FetchLike` | Custom fetch implementation. |
| `options.headers` | `Record<string, string>` | Extra default headers sent on every request. |

```ts
import { EpicGamesClient, AuthClients } from 'fnapi-js';

const epic = new EpicGamesClient({
  defaultClient: AuthClients.fortnitePC,
  timeout: 15_000,
  retry: 2,
});
```

## client
<Badge type="info" text="method" />

```ts
client(input?: AuthClientInput): AuthClient
```

Resolves an `AuthClientInput` to a concrete `AuthClient`. With no argument returns the configured `defaultClient`; otherwise resolves a registry name, raw client id, or passes through an `AuthClient`.

**Returns:** `resolved AuthClient`

```ts
const pc = epic.client();
const android = epic.client('fortniteAndroid');
```

## session
<Badge type="info" text="method" />

```ts
session(token: OAuthToken, client?: AuthClientInput): EpicAuthSession
```

Wraps an existing `OAuthToken` in an `EpicAuthSession` without performing a network request. Useful for rehydrating a session from a persisted token.

| Parameter | Type | Description |
| --- | --- | --- |
| `token` | `OAuthToken` | A previously obtained OAuth token. |
| `client` | `AuthClientInput` | Auth client the token belongs to. Defaults to the client's `defaultClient`. |

**Returns:** `EpicAuthSession bound to the token and client`

```ts
const session = epic.session(savedToken, 'fortnitePC');
const access = await session.ensureValid();
```

## login
<Badge type="info" text="method" />

```ts
login(grant: (auth: AuthManager, client: AuthClient) => Promise<OAuthToken>, client?: AuthClientInput): Promise<EpicAuthSession>
```

The generic login primitive that all `loginWith*` helpers build on. Resolves the target client, runs your `grant` callback against the `AuthManager` to obtain a token, then wraps it in a session.

| Parameter | Type | Description |
| --- | --- | --- |
| `grant` | `(auth, client) => Promise<OAuthToken>` | Callback that performs the actual grant against the resolved `AuthManager` and `AuthClient`. |
| `client` | `AuthClientInput` | Auth client to grant against. Defaults to `defaultClient`. |

**Returns:** `Promise<EpicAuthSession>`

```ts
const session = await epic.login(
  (auth, client) => auth.clientCredentials(client),
  'fortnitePC',
);
```

## loginClientCredentials
<Badge type="info" text="method" />

```ts
loginClientCredentials(options?: { client?: AuthClientInput } & TokenRequestOptions): Promise<EpicAuthSession>
```

Logs in with the `client_credentials` grant, producing an app-scoped session with no bound account. Note that account-scoped session methods like `me()` will throw on such a session.

**Returns:** `Promise<EpicAuthSession> (not bound to an account)`

```ts
const app = await epic.loginClientCredentials();
console.log(app.accountId); // null
```

## loginWithDeviceAuth
<Badge type="info" text="method" />

```ts
loginWithDeviceAuth(credentials: DeviceAuthCredentials, options?: { client?: AuthClientInput } & TokenRequestOptions): Promise<EpicAuthSession>
```

Logs in with a stored device auth (`device_auth` grant) for silent, reusable authentication. `credentials` requires `accountId`, `deviceId`, and `secret`.

| Parameter | Type | Description |
| --- | --- | --- |
| `credentials` | `DeviceAuthCredentials` | `{ accountId, deviceId, secret }` from a previously created device auth. |
| `options.client` | `AuthClientInput` | Auth client to authenticate against. |

**Returns:** `Promise<EpicAuthSession> bound to the account`

```ts
const session = await epic.loginWithDeviceAuth({
  accountId: 'abc123',
  deviceId: 'def456',
  secret: 'topsecret',
}, { client: 'fortnitePC' });
```

## loginWithExchangeCode
<Badge type="info" text="method" />

```ts
loginWithExchangeCode(code: string, options?: { client?: AuthClientInput; codeVerifier?: string } & TokenRequestOptions): Promise<EpicAuthSession>
```

Logs in with an Epic exchange code (`exchange_code` grant). Optionally pass a PKCE `codeVerifier`.

| Parameter | Type | Description |
| --- | --- | --- |
| `code` | `string` | The exchange code to redeem. |
| `options.codeVerifier` | `string` | PKCE code verifier, if the code was issued with a challenge. |

**Returns:** `Promise<EpicAuthSession>`

```ts
const session = await epic.loginWithExchangeCode('EXCHANGE_CODE_HERE');
```

## loginWithAuthorizationCode
<Badge type="info" text="method" />

```ts
loginWithAuthorizationCode(code: string, options?: { client?: AuthClientInput; codeVerifier?: string } & TokenRequestOptions): Promise<EpicAuthSession>
```

Logs in with an OAuth authorization code (`authorization_code` grant), the code returned from Epic's redirect flow. Optionally pass a PKCE `codeVerifier`.

**Returns:** `Promise<EpicAuthSession>`

```ts
const session = await epic.loginWithAuthorizationCode('AUTH_CODE', {
  codeVerifier: pkceVerifier,
});
```

## loginWithRefreshToken
<Badge type="info" text="method" />

```ts
loginWithRefreshToken(refreshToken: string, options?: { client?: AuthClientInput } & TokenRequestOptions): Promise<EpicAuthSession>
```

Exchanges a stored refresh token for a fresh session (`refresh_token` grant).

**Returns:** `Promise<EpicAuthSession>`

```ts
const session = await epic.loginWithRefreshToken(savedRefreshToken);
```

## startDeviceCode
<Badge type="info" text="method" />

```ts
startDeviceCode(options?: { client?: AuthClientInput }): Promise<DeviceCodeFlow>
```

Begins the device-code flow: obtains an app token via `client_credentials`, creates a device authorization, and returns a `DeviceCodeFlow` carrying the user code and verification URIs. Defaults to the `fortniteNewSwitch` client. Call `flow.poll()` after the user authorizes.

**Returns:** `Promise<DeviceCodeFlow>`

```ts
const flow = await epic.startDeviceCode();
console.log('Open', flow.verificationUriComplete, 'code', flow.userCode);
const session = await flow.poll();
```

::: tip Note
Use this when you want to show the prompt yourself and control polling. For a single call that does both, use `loginWithDeviceCode`.
:::

## loginWithDeviceCode
<Badge type="info" text="method" />

```ts
loginWithDeviceCode(options?: { client?: AuthClientInput; onPrompt?: (flow: DeviceCodeFlow) => void | Promise<void> } & DeviceCodePollOptions): Promise<EpicAuthSession>
```

One-call device-code login: starts the flow, invokes `onPrompt` so you can display the code, then polls until the user authorizes. Accepts all `DeviceCodePollOptions` (`onPending`, `intervalMs`, `maxAttempts`, `expiresAt`, `signal`).

| Parameter | Type | Description |
| --- | --- | --- |
| `options.onPrompt` | `(flow: DeviceCodeFlow) => void \| Promise<void>` | Called once with the flow so you can show the verification URI and user code. |
| `options.onPending` | `(info: DeviceCodePendingInfo) => void` | Called on each poll while authorization is still pending. |

**Returns:** `Promise<EpicAuthSession> once the user authorizes`

```ts
const session = await epic.loginWithDeviceCode({
  onPrompt(flow) {
    console.log('Open', flow.verificationUriComplete);
    console.log('Code', flow.userCode);
  },
  onPending(info) {
    process.stdout.write(`\rwaiting (poll #${info.attempt})...`);
  },
});
console.log('logged in as', session.displayName);
```

## changeClient
<Badge type="info" text="method" />

```ts
changeClient(accessToken: string, toClient: AuthClientInput, options?: TokenRequestOptions & { codeChallenge?: string; codeChallengeMethod?: 'S256' | 'plain' }): Promise<EpicAuthSession>
```

Migrates an existing access token to a different auth client via the exchange-code dance: it calls `auth.createExchangeCode` scoped to the target client's `clientId`, then redeems that code against the target client with `auth.exchangeCode`, returning a new session on `toClient`. Supports optional PKCE (`codeChallenge`, `codeChallengeMethod`).

| Parameter | Type | Description |
| --- | --- | --- |
| `accessToken` | `string` | A valid access token from the source client. |
| `toClient` | `AuthClientInput` | The client to migrate the session to. |

**Returns:** `Promise<EpicAuthSession> on the target client`

```ts
const android = await epic.changeClient(pcSession.accessToken, 'fortniteAndroid');
const deviceAuth = await android.createDeviceAuth();
```

::: tip Note
`EpicAuthSession.switchClient` does the same dance from an existing session instance.
:::

---

# AuthManager

The low-level OAuth grant layer, reachable as `epic.auth`. Every method maps directly to an Epic account-service `oauth` endpoint and returns raw transport types (`OAuthToken`, `VerifyResponse`, `ExchangeCode`, `DeviceCode`). Each grant takes a resolved `AuthClient` as its first argument. String parameters are validated and throw `ValidationError` when empty.

## token
<Badge type="info" text="method" />

```ts
token(client: AuthClient, grantType: GrantType, fields: Record<string, string | undefined>, options?: TokenRequestOptions): Promise<OAuthToken>
```

The generic token request that every grant helper delegates to. Builds the OAuth form (`grant_type` plus `fields`), applies `TokenRequestOptions` (`tokenType`, `includePerms`, `deploymentId`, `deviceId`, `scope`), and POSTs to `/account/api/oauth/token` with the client's basic auth.

**Returns:** `Promise<OAuthToken>`

```ts
const token = await epic.auth.token(epic.client(), 'client_credentials', {});
```

## clientCredentials
<Badge type="info" text="method" />

```ts
clientCredentials(client: AuthClient, options?: TokenRequestOptions): Promise<OAuthToken>
```

Requests an app-scoped token with the `client_credentials` grant. No account is bound.

**Returns:** `Promise<OAuthToken>`

```ts
const appToken = await epic.auth.clientCredentials(epic.client());
```

## authorizationCode
<Badge type="info" text="method" />

```ts
authorizationCode(client: AuthClient, code: string, options?: TokenRequestOptions & { codeVerifier?: string }): Promise<OAuthToken>
```

Redeems an OAuth authorization code (`authorization_code` grant). Optional PKCE `codeVerifier` is sent as `code_verifier`.

**Returns:** `Promise<OAuthToken>`

```ts
const token = await epic.auth.authorizationCode(epic.client(), 'AUTH_CODE');
```

## exchangeCode
<Badge type="info" text="method" />

```ts
exchangeCode(client: AuthClient, code: string, options?: TokenRequestOptions & { codeVerifier?: string }): Promise<OAuthToken>
```

Redeems an exchange code (`exchange_code` grant), sent as `exchange_code`. Optional PKCE `codeVerifier`.

**Returns:** `Promise<OAuthToken>`

```ts
const token = await epic.auth.exchangeCode(epic.client(), exchange.code);
```

## deviceAuth
<Badge type="info" text="method" />

```ts
deviceAuth(client: AuthClient, credentials: DeviceAuthCredentials, options?: TokenRequestOptions): Promise<OAuthToken>
```

Authenticates with a stored device auth (`device_auth` grant). Validates and sends `account_id`, `device_id`, and `secret`.

**Returns:** `Promise<OAuthToken>`

```ts
const token = await epic.auth.deviceAuth(epic.client(), {
  accountId, deviceId, secret,
});
```

## deviceCode
<Badge type="info" text="method" />

```ts
deviceCode(client: AuthClient, deviceCode: string, options?: TokenRequestOptions): Promise<OAuthToken>
```

Attempts a single `device_code` grant exchange for the given device code. Throws while the user has not yet authorized — use `pollDeviceCode` to retry.

**Returns:** `Promise<OAuthToken>`

```ts
const token = await epic.auth.deviceCode(epic.client(), flow.deviceCode);
```

## pollDeviceCode
<Badge type="info" text="method" />

```ts
pollDeviceCode(client: AuthClient, deviceCode: string, options?: DeviceCodePollOptions): Promise<OAuthToken>
```

Repeatedly calls `deviceCode` until the user authorizes, honoring `authorization_pending`/`slow_down` (adds 5s on slow-down). Respects `intervalMs`, `maxAttempts`, `expiresAt`, `signal`, and fires `onPending` between attempts. Throws `AbortError` on abort and an expiry `EpicAuthError` past `expiresAt`.

**Returns:** `Promise<OAuthToken> once authorized`

```ts
const token = await epic.auth.pollDeviceCode(epic.client(), flow.deviceCode, {
  expiresAt: flow.expiresAt,
  onPending: (info) => console.log('poll', info.attempt),
});
```

## refreshToken
<Badge type="info" text="method" />

```ts
refreshToken(client: AuthClient, refreshToken: string, options?: TokenRequestOptions): Promise<OAuthToken>
```

Exchanges a refresh token for a new token (`refresh_token` grant).

**Returns:** `Promise<OAuthToken>`

```ts
const token = await epic.auth.refreshToken(epic.client(), savedRefresh);
```

## continuationToken
<Badge type="info" text="method" />

```ts
continuationToken(client: AuthClient, continuationToken: string, options?: TokenRequestOptions): Promise<OAuthToken>
```

Completes a multi-step login with the `continuation_token` grant (e.g. after an MFA challenge).

**Returns:** `Promise<OAuthToken>`

```ts
const token = await epic.auth.continuationToken(epic.client(), continuation);
```

## password
<Badge type="info" text="method" />

```ts
password(client: AuthClient, username: string, passwordValue: string, options?: TokenRequestOptions): Promise<OAuthToken>
```

Direct `password` grant with username and password. Rarely permitted by Epic clients; both fields are validated as non-empty.

**Returns:** `Promise<OAuthToken>`

```ts
const token = await epic.auth.password(epic.client(), 'user@example.com', 'pw');
```

## otp
<Badge type="info" text="method" />

```ts
otp(client: AuthClient, otp: string, challenge: string, options?: TokenRequestOptions): Promise<OAuthToken>
```

Completes an MFA/OTP step with the `otp` grant, sending the one-time code and its `challenge`.

**Returns:** `Promise<OAuthToken>`

```ts
const token = await epic.auth.otp(epic.client(), '123456', challengeId);
```

## verify
<Badge type="info" text="method" />

```ts
verify(accessToken: string, options?: { includePerms?: boolean; signal?: AbortSignal }): Promise<VerifyResponse>
```

GETs `/account/api/oauth/verify` to validate an access token and inspect its metadata (account, client, expiry, and optionally `perms`).

**Returns:** `Promise<VerifyResponse>`

```ts
const info = await epic.auth.verify(session.accessToken, { includePerms: true });
```

## createExchangeCode
<Badge type="info" text="method" />

```ts
createExchangeCode(accessToken: string, options?: ExchangeCodeOptions): Promise<ExchangeCode>
```

GETs `/account/api/oauth/exchange` to mint an exchange code from an existing access token. `ExchangeCodeOptions` supports `consumingClientId`, `codeChallenge`, and `codeChallengeMethod` — the basis of client-switching.

**Returns:** `Promise<ExchangeCode>`

```ts
const exchange = await epic.auth.createExchangeCode(session.accessToken, {
  consumingClientId: epic.client('fortniteAndroid').clientId,
});
```

## createDeviceCode
<Badge type="info" text="method" />

```ts
createDeviceCode(clientAccessToken: string, options?: { signal?: AbortSignal }): Promise<DeviceCode>
```

POSTs `/account/api/oauth/deviceAuthorization` (with `prompt=login`) using an app token to begin a device-code flow, returning the user code and verification URIs.

**Returns:** `Promise<DeviceCode>`

```ts
const app = await epic.auth.clientCredentials(epic.client());
const device = await epic.auth.createDeviceCode(app.access_token);
```

## deleteDeviceCode
<Badge type="info" text="method" />

```ts
deleteDeviceCode(clientAccessToken: string, userCode: string, options?: { signal?: AbortSignal }): Promise<void>
```

DELETEs a pending device authorization by its user code, cancelling an in-progress device-code flow.

**Returns:** `Promise<void>`

```ts
await epic.auth.deleteDeviceCode(app.access_token, flow.userCode);
```

## killSession
<Badge type="info" text="method" />

```ts
killSession(accessToken: string, options?: { killAllWithSameSource?: boolean; signal?: AbortSignal }): Promise<void>
```

DELETEs the session identified by the access token (logout). Set `killAllWithSameSource` to also revoke sessions sharing the same source.

**Returns:** `Promise<void>`

```ts
await epic.auth.killSession(session.accessToken);
```

## killSessions
<Badge type="info" text="method" />

```ts
killSessions(accessToken: string, killType: KillType, options?: { signal?: AbortSignal }): Promise<void>
```

Bulk-revokes sessions by `KillType` (e.g. `'OTHERS_ACCOUNT_CLIENT_SERVICE'`, `'OTHERS'`, `'ALL'`).

**Returns:** `Promise<void>`

```ts
await epic.auth.killSessions(session.accessToken, 'OTHERS');
```

---

# EpicAuthSession

An authenticated session wrapping an `OAuthToken` and its `AuthClient`. Returned by every `EpicGamesClient.loginWith*` helper. Exposes token metadata as getters, self-refresh logic, and account/device-auth operations that automatically apply the session's access token. Account-scoped methods throw `ValidationError` when the session has no bound account (e.g. a `client_credentials` session).

## accessToken
<Badge type="info" text="getter" />

```ts
get accessToken(): string
```

The current access token string.

**Returns:** `string`

## accountId
<Badge type="info" text="getter" />

```ts
get accountId(): string | null
```

The bound account id, or `null` for app-scoped (`client_credentials`) sessions.

**Returns:** `string | null`

## displayName
<Badge type="info" text="getter" />

```ts
get displayName(): string | null
```

The account display name from the token, or `null` if absent.

**Returns:** `string | null`

## expiresAt
<Badge type="info" text="getter" />

```ts
get expiresAt(): Date
```

Absolute expiry of the access token as a `Date`.

**Returns:** `Date`

## expiresInMs
<Badge type="info" text="getter" />

```ts
get expiresInMs(): number
```

Milliseconds until the access token expires (negative once expired).

**Returns:** `number`

## isExpired
<Badge type="info" text="getter" />

```ts
get isExpired(): boolean
```

`true` once the access token has expired.

**Returns:** `boolean`

## canRefresh
<Badge type="info" text="getter" />

```ts
get canRefresh(): boolean
```

`true` when the token carries a refresh token, i.e. `refresh()`/`ensureValid()` can renew it.

**Returns:** `boolean`

## token
<Badge type="info" text="getter" />

```ts
get token(): OAuthToken
```

The raw underlying `OAuthToken` (useful for persistence). Also note the sibling getter `refreshTokenValue: string | null`.

**Returns:** `OAuthToken`

## client
<Badge type="info" text="getter" />

```ts
readonly client: AuthClient
```

The `AuthClient` this session is bound to. Read-only property (not a getter).

**Returns:** `AuthClient`

## refresh
<Badge type="info" text="method" />

```ts
refresh(options?: TokenRequestOptions): Promise<OAuthToken>
```

Renews the token using its refresh token and stores the result on the session. Throws `ValidationError` if the session has no refresh token.

**Returns:** `Promise<OAuthToken> (the new token)`

```ts
if (session.canRefresh) await session.refresh();
```

## ensureValid
<Badge type="info" text="method" />

```ts
ensureValid(options?: TokenRequestOptions): Promise<string>
```

Returns a valid access token, transparently refreshing first when it is within ~15s of expiry and a refresh token is available. The preferred way to obtain a token before a call.

**Returns:** `Promise<string> access token`

```ts
const token = await session.ensureValid();
```

## verify
<Badge type="info" text="method" />

```ts
verify(options?: { includePerms?: boolean; signal?: AbortSignal }): Promise<VerifyResponse>
```

Verifies the session's current access token via the account service.

**Returns:** `Promise<VerifyResponse>`

```ts
const info = await session.verify({ includePerms: true });
```

## createExchangeCode
<Badge type="info" text="method" />

```ts
createExchangeCode(options?: ExchangeCodeOptions): Promise<ExchangeCode>
```

Mints an exchange code from this session's access token.

**Returns:** `Promise<ExchangeCode>`

```ts
const exchange = await session.createExchangeCode();
```

## switchClient
<Badge type="info" text="method" />

```ts
switchClient(toClient: AuthClientInput, options?: TokenRequestOptions & { codeChallenge?: string; codeChallengeMethod?: 'S256' | 'plain' }): Promise<EpicAuthSession>
```

Returns a new session on `toClient` by performing the exchange-code dance: creates an exchange code scoped to the target client, then redeems it against that client. Supports optional PKCE.

**Returns:** `Promise<EpicAuthSession> on the target client`

```ts
const android = await session.switchClient('fortniteAndroid');
const deviceAuth = await android.createDeviceAuth();
```

## me
<Badge type="info" text="method" />

```ts
me(options?: { signal?: AbortSignal }): Promise<EpicAccount>
```

Fetches the account bound to this session. Throws `ValidationError` if the session is not account-bound.

**Returns:** `Promise<EpicAccount>`

```ts
const account = await session.me();
```

## account
<Badge type="info" text="method" />

```ts
account(accountId: string, options?: { signal?: AbortSignal }): Promise<EpicAccount>
```

Fetches any account by id using this session's token.

**Returns:** `Promise<EpicAccount>`

```ts
const other = await session.account('0123456789abcdef');
```

## accountsByIds
<Badge type="info" text="method" />

```ts
accountsByIds(accountIds: string[], options?: { signal?: AbortSignal }): Promise<EpicAccount[]>
```

Batch-fetches multiple accounts by id.

**Returns:** `Promise<EpicAccount[]>`

```ts
const accounts = await session.accountsByIds([id1, id2, id3]);
```

## accountByDisplayName
<Badge type="info" text="method" />

```ts
accountByDisplayName(displayName: string, options?: { signal?: AbortSignal }): Promise<EpicAccount>
```

Looks up an account by its display name.

**Returns:** `Promise<EpicAccount>`

```ts
const account = await session.accountByDisplayName('Ninja');
```

## resolveAccounts / resolveAccountNames
<Badge type="info" text="method" />

```ts
resolveAccounts(accountIds: string[], options?: { signal?: AbortSignal }): Promise<Map<string, EpicAccount>>
resolveAccountNames(accountIds: string[], options?: { signal?: AbortSignal }): Promise<Map<string, string>>
```

Resolve any number of account ids into a `Map` keyed by id — full [`EpicAccount`](/epic/account-manager) objects, or just display names. Ids are deduped and chunked by 100 automatically. See [`AccountManager.resolveAccounts`](/epic/account-manager#accounts-resolveaccounts).

```ts
const names = await session.resolveAccountNames(friendIds);
console.log(names.get(friendIds[0]));
```

## eosAccounts / eosProductUsers
<Badge type="info" text="method" />

```ts
eosAccounts(accountIds: string[], options?: { deploymentId?: string; signal?: AbortSignal }): Promise<EosIdAccount[]>
eosProductUsers(productUserIds: string[], options?: { deploymentId?: string; signal?: AbortSignal }): Promise<EosProductUserMapping[]>
```

Resolve identities against the **EOS** id service (`api.epicgames.dev`). `eosAccounts` maps Epic account ids → `{ accountId, displayName, linkedAccounts }`; `eosProductUsers` maps EOS product user ids (PUIDs) → their linked account. Each takes 1-100 ids.

The two calls use **different tokens**, minted for you automatically: `eosAccounts` hits the Epic Account Services (EAS) id endpoint and needs an EAS token from `POST /epic/oauth/v2/token` (`grant_type=client_credentials`), which the session mints and caches via [`easToken`](#eastoken). `eosProductUsers` uses the EOS Connect token from [`eosToken`](#eostoken) and additionally requires the client policy `eosconnect:queryProductUsersForAnyUser` — the stock Fortnite clients do not grant it, so it throws `EpicPermissionError` unless your client is provisioned for it.

```ts
const [{ displayName }] = await session.eosAccounts([accountId]);
console.log(displayName);
```

## listDeviceAuths
<Badge type="info" text="method" />

```ts
listDeviceAuths(options?: { signal?: AbortSignal }): Promise<DeviceAuth[]>
```

Lists device auths registered on the bound account. Account-bound sessions only.

**Returns:** `Promise<DeviceAuth[]>`

```ts
const auths = await session.listDeviceAuths();
```

## createDeviceAuth
<Badge type="info" text="method" />

```ts
createDeviceAuth(options?: { signal?: AbortSignal }): Promise<DeviceAuth>
```

Creates a new reusable device auth on the bound account. The returned `secret` is only available now — persist it for silent logins via `loginWithDeviceAuth`.

**Returns:** `Promise<DeviceAuth>`

```ts
const android = await session.switchClient('fortniteAndroid');
const deviceAuth = await android.createDeviceAuth();
save({ accountId: deviceAuth.accountId, deviceId: deviceAuth.deviceId, secret: deviceAuth.secret });
```

::: tip Note
Device-auth creation typically requires a mobile client; combine with `switchClient('fortniteAndroid')`.
:::

## getDeviceAuth
<Badge type="info" text="method" />

```ts
getDeviceAuth(deviceId: string, options?: { signal?: AbortSignal }): Promise<DeviceAuth>
```

Fetches a single device auth by its device id (secret not returned).

**Returns:** `Promise<DeviceAuth>`

```ts
const auth = await session.getDeviceAuth(deviceId);
```

## deleteDeviceAuth
<Badge type="info" text="method" />

```ts
deleteDeviceAuth(deviceId: string, options?: { signal?: AbortSignal }): Promise<void>
```

Revokes a device auth by device id.

**Returns:** `Promise<void>`

```ts
await session.deleteDeviceAuth(deviceId);
```

## killOtherSessions
<Badge type="info" text="method" />

```ts
killOtherSessions(options?: { signal?: AbortSignal }): Promise<void>
```

Revokes every other session for the account except the current one (kill type `OTHERS_ACCOUNT_CLIENT_SERVICE`).

**Returns:** `Promise<void>`

```ts
await session.killOtherSessions();
```

## killSessions
<Badge type="info" text="method" />

```ts
killSessions(killType: KillType, options?: { signal?: AbortSignal }): Promise<void>
```

Bulk-revokes sessions by an explicit `KillType`.

**Returns:** `Promise<void>`

```ts
await session.killSessions('ALL');
```

## logout
<Badge type="info" text="method" />

```ts
logout(options?: { signal?: AbortSignal }): Promise<void>
```

Revokes just this session's access token (single-session logout).

**Returns:** `Promise<void>`

```ts
await session.logout();
```

## eosToken
<Badge type="info" text="method" />

```ts
eosToken(options?: { deploymentId?: string; signal?: AbortSignal }): Promise<EosToken>
```

Exchanges this session's Epic access token for an **EOS Connect** token (via `external_auth` on `api.epicgames.dev`), scoped to the Fortnite live deployment. The result is cached on the session until it nears expiry. EOS tokens unlock the EOS services (Locker, Inventories, Stats, …). Requires an account-bound session.

**Returns:** `Promise<EosToken>`

```ts
const eos = await session.eosToken();
console.log(eos.features); // ['LockerService', 'Inventories', ...]
```

## easToken
<Badge type="info" text="method" />

```ts
easToken(options?: { signal?: AbortSignal }): Promise<EasToken>
```

Mints an **Epic Account Services (EAS)** token via `POST /epic/oauth/v2/token` (`grant_type=client_credentials`) using this session's auth client. Distinct from [`eosToken`](#eostoken) — this app-level token is what the EAS id endpoint behind [`eosAccounts`](#eosaccounts-eosproductusers) requires, and it is minted and cached automatically when you call `eosAccounts`, so you rarely need it directly. The result is cached on the session until it nears expiry.

**Returns:** `Promise<EasToken>`

## lockerItems
<Badge type="info" text="method" />

```ts
lockerItems(options?: { deploymentId?: string; signal?: AbortSignal }): Promise<LockerItemsResponse>
```

Reads the raw **EOS Locker Service** `locker/v4` items — the `activeLoadoutGroup` (equipped character, emotes, vehicle, jam, …), saved `loadoutGroupPresets` and per-section `loadoutPresets`. [`Locker`](/epic/locker) is built on this and the other locker calls (`lockerCosmetics`, `setActiveLoadoutGroup`, the preset calls, `setCompanionName`, `lockInImmutableItem`); call them directly if you want the raw data.

**Returns:** `Promise<LockerItemsResponse>`

```ts
const { activeLoadoutGroup } = await session.lockerItems();
```

## Identity & connections
<Badge type="info" text="method" />

```ts
searchUsers(prefix: string, options?): Promise<UserSearchResult[]>
searchUsersResolved(prefix: string, options?): Promise<ResolvedUserSearchResult[]>
externalAuths(accountId?: string, options?): Promise<ExternalAuth[]>
externalAuth(externalAuthType: string, accountId?: string, options?): Promise<ExternalAuth>
accountByExternalDisplayName(externalAuthType: string, displayName: string, options?): Promise<ExternalAuthAccountMatch[]>
accountsByExternalDisplayNames(authType: string, displayNames: string[], options?): Promise<ExternalDisplayNameLookup>
accountsByExternalIds(authType: string, ids: string[], options?): Promise<ExternalIdLookup>
accountMetadata(accountId?: string, options?): Promise<AccountMetadata>
```

Search usernames the way the in-game **Add Friends** box does — matches across Epic, PlayStation, Xbox, Steam and Switch, with a settable `platform` — then resolve the console/social connections linked to an account and look Epic accounts up by their platform identities. `accountId` defaults to the signed-in account. See [`UserSearchManager`](/epic/user-search) and [`AccountManager`](/epic/account-manager#accounts-externalauths).

```ts
for (const hit of await session.searchUsersResolved('Ninja'))
  console.log(hit.displayName ?? hit.accountId, hit.matches.map((m) => `${m.platform}:${m.value}`).join(', '));

for (const conn of await session.externalAuths())
  console.log(conn.type, conn.externalDisplayName ?? conn.externalAuthId);

const [match] = await session.accountByExternalDisplayName('xbl', 'Some Gamertag', { caseInsensitive: true });
```

## Status & presence
<Badge type="info" text="method" />

```ts
lastOnline(accountId?: string, options?): Promise<LastOnlineResponse>
lastOnlineFor(accountId?: string, options?): Promise<LastOnlineEntry | null>
serviceStatus(serviceId?: string, options?): Promise<LightswitchStatus>
serviceStatusBulk(serviceIds: string[], options?): Promise<LightswitchStatus[]>
```

Read last-online presence and Lightswitch service status. See [`PresenceManager`](/epic/presence) and [`LightswitchManager`](/epic/lightswitch).

```ts
const entry = await session.lastOnlineFor();
const status = await session.serviceStatus();
console.log(status.status, entry?.last_online);
```

## In-game custom status
<Badge type="info" text="method" />

```ts
setCustomStatus(status: string, options?: { onlineType?: string; signal?: AbortSignal }): Promise<EosOwnPresence | null>
clearCustomStatus(options?: { signal?: AbortSignal }): Promise<EosOwnPresence | null>
```

Publish the friend-facing status that modern Fortnite renders **in-game** (the line that otherwise reads *"In the launcher"*). This runs over **EOS presence**, not XMPP — the text is sent as `activity.value` on a presence `PATCH` bound to your live connect session, so it opens (or reuses) `connectEvents` for you and holds only while that session stays open. No WebSocket setup is needed on Node — the `ws` package is picked up automatically. Both calls resolve to the presence Epic stored. The status is re-applied on every reconnect and recovered when Epic reports the connection gone; `clearCustomStatus`, `disconnectEvents`, or `logout` removes it. See [live events & presence](/epic/chat#in-game-custom-status).

```ts
await session.setCustomStatus('Playing with fnapi-js 🚀');
await session.clearCustomStatus();
```

## Realtime XMPP & presence
<Badge type="info" text="method" />

```ts
connectXmpp(options?): Promise<XmppClient>
disconnectXmpp(): Promise<void>
friendPresences(): Promise<FriendPresence[]>
get xmpp(): XmppClient | null
```

Open Epic's realtime **XMPP-over-WebSocket** stream to receive live friend presence and chat. `connectXmpp` builds an [`XmppClient`](/epic/xmpp) bound to this session — token refresh is wired in automatically — and reuses it on later calls; `friendPresences` returns the cached presence snapshot; `logout` disconnects the stream for you. Publishing your own status is done over EOS via [`setCustomStatus`](#in-game-custom-status) — Fortnite no longer reads XMPP presence for the in-game line, so the low-level XMPP setters live on the [`XmppClient`](/epic/xmpp) itself for XMPP-only tooling. See [`XmppClient`](/epic/xmpp) for the full event/method surface.

```ts
const xmpp = await session.connectXmpp();
xmpp.on('presence', (p) => console.log(p.accountId, p.available, p.status?.Status));
xmpp.on('message', (m) => console.log(`${m.accountId}: ${m.body}`));

console.log(await session.friendPresences());
```

## Economy & progress
<Badge type="info" text="method" />

```ts
vbucks(options?): Promise<number>
vbucksBalance(options?): Promise<VbucksBalance>
mtxPlatform(options?): Promise<string>
setMtxPlatform(platform: MtxPlatform | (string & {}), options?): Promise<CommonCoreProfile | null>
commonCore(options?): Promise<CommonCoreProfile>
brInventory(accountId?: string, options?): Promise<BrInventory>
receipts(accountId?: string, options?): Promise<Receipt[]>
userStats(accountId?: string, options?): Promise<UserStats | null>
userStatsBulk(accountIds: string[], options?): Promise<UserStats[]>
leaderboard(leaderboardName: string, options?): Promise<Leaderboard>
timeline(options?): Promise<Timeline>
```

Read the V-Bucks balance with its multi-platform breakdown, get and set the current purchase platform, and read inventory, purchase receipts, StatsV2 data, and the calendar timeline. The V-Bucks and platform methods query `common_core`, which is **self-only** — they always target the signed-in account and take no `accountId`. See [`FortniteGameManager`](/epic/game) and [`StatsProxyManager`](/epic/stats).

```ts
const balance = await session.vbucksBalance();
console.log('v-bucks:', balance.total, 'on', balance.platform);

await session.setMtxPlatform('PSN');
const stats = await session.userStats();
```

## Account actions
<Badge type="info" text="method" />

```ts
supportACreator(): Promise<{ code: string; setAt: string | null; affiliateId: string | null } | null>
setSupportACreator(code: string): Promise<MCPResponse>
claimMfaReward(options?: { stw?: boolean }): Promise<MCPResponse>
markBansViewed(): Promise<MCPResponse>
skipTutorial(): Promise<MCPResponse>
giftEligibility(recipientId: string, offerId: string): Promise<GiftEligibilityResponse>
```

| Method | Description |
| --- | --- |
| `supportACreator` / `setSupportACreator` | Read or set the Support-a-Creator code (`SetAffiliateName`). An unknown code throws a `ShopError` with reason `invalid-creator`. |
| `claimMfaReward` | Claim the two-factor reward (`ClaimMfaEnabled`); pass `stw: true` for the Save the World version. |
| `markBansViewed` | Acknowledge matchmaking ban notices (`SetMatchmakingBansViewed`). |
| `skipTutorial` | Skip the Save the World tutorial (`SkipTutorial` on `campaign`). |
| `giftEligibility` | The raw gift check behind `checkGift`. |

Purchases, refunds and purchase history are covered in [Shop & Gifting](/epic/shop#purchases-refunds).

## Tournaments, islands, quests & locker

These session methods have their own pages:

- [Tournaments](/epic/tournaments): `tournaments`, `tournamentLeaderboard`, `tournamentScores`, `tournamentHistory`, `tournamentPlayer`, `tournamentTokens`, `tournamentData`
- [Islands & Links](/epic/links): `island`, `islands`, `islandRelated`, `islandVersions`, `creatorIslands`, `myIslands`
- [Quests](/epic/quests): `questProgress`, `questLogin`, `claimQuestReward`, `rerollDailyQuest`, `trackQuests`, `pinStwQuests`
- [Locker](/epic/locker#raw-session-calls): `lockerCosmetics`, `setActiveLoadoutGroup`, the preset calls, `setCompanionName`, `lockInImmutableItem`

## Cloud storage
<Badge type="info" text="method" />

```ts
cloudStorageFiles(options?: CloudStorageOptions): Promise<CloudStorageFile[]>
readCloudStorage(filename: string, options?: CloudStorageOptions): Promise<Uint8Array>
readCloudStorageText(filename: string, options?: CloudStorageOptions): Promise<string>
writeCloudStorage(filename: string, data: string | Uint8Array, options?: CloudStorageWriteOptions): Promise<void>
deleteCloudStorage(filename: string, options?: CloudStorageOptions): Promise<void>
systemCloudStorageFiles(options?: CloudStorageOptions): Promise<CloudStorageFile[]>
readSystemCloudStorage(filename: string, options?: CloudStorageOptions): Promise<Uint8Array>
readSystemCloudStorageText(filename: string, options?: CloudStorageOptions): Promise<string>
```

Read and write the account's **cloud storage** — the `user/*` files where Fortnite keeps client settings (`ClientSettings.Sav`), plus the read-only `system/*` config files (e.g. `DefaultGame.ini`). User methods are account-scoped and refer to a file by its `uniqueFilename`; `writeCloudStorage`/`deleteCloudStorage` mutate the real account. System files are global and read-only. Both the raw bytes and a decoded-text convenience are provided.

```ts
for (const file of await session.cloudStorageFiles())
  console.log(file.filename, file.length, file.uniqueFilename);

const settings = await session.readCloudStorageText('ClientSettings.Sav');
await session.writeCloudStorage('ClientSettings.Sav', settings);
```

## Playtime
<Badge type="info" text="method" />

```ts
playtime(artifactId?: string, options?: PlaytimeOptions): Promise<PlaytimeInfo>
playtimeAll(options?: PlaytimeOptions): Promise<PlaytimeInfo[]>
addPlaytime(segment: PlaytimeSegment, options?: PlaytimeOptions): Promise<void>
addPlaytimeSeconds(seconds: number, options?: PlaytimeAddSecondsOptions): Promise<void>
```

Read and append to the account's tracked **playtime** artifacts. `playtimeAll` returns every artifact record; `playtime` reads one (defaulting to the main Fortnite artifact); the `add*` methods append a played segment. These run against the launcher service, so the session mints a launcher token for you automatically. Account-bound sessions only.

```ts
for (const record of await session.playtimeAll())
  console.log(record.artifactId, record.totalTime);
```

## Library
<Badge type="info" text="method" />

```ts
library(options?: LibraryItemsOptions): Promise<LibraryItemsResponse>
libraryAll(options?: LibraryAllItemsOptions): Promise<LibraryRecord[]>
libraryStateTokenStatus(stateToken: string, options?: LibraryRequestOptions): Promise<boolean>
libraryCollections(options?: LibraryRequestOptions): Promise<LibraryCollection[]>
libraryCollectionItems(collectionId: string, options?: LibraryRequestOptions): Promise<LibraryCollectionItem[]>
createLibraryCollection(name: string, options?: LibraryRequestOptions): Promise<LibraryCollection>
updateLibraryCollection(collectionId: string, name: string, options?: LibraryRequestOptions): Promise<LibraryCollection>
deleteLibraryCollection(collectionId: string, options?: LibraryRequestOptions): Promise<void>
addLibraryCollectionItem(collectionId: string, item: LibraryCollectionItem, options?: LibraryRequestOptions): Promise<LibraryCollection>
removeLibraryCollectionItem(collectionId: string, item: LibraryCollectionItem, options?: LibraryRequestOptions): Promise<LibraryCollection>
launcherLibrary(options?: LauncherLibraryItemsOptions): Promise<LauncherLibraryResponse>
```

Read the account's **Epic Games Library** — every game and subscription the user owns, plus the collections that group them. `library` reads one page; `libraryAll` auto-paginates the whole library; the `*Collection*` methods read and manage user collections. Like playtime, the library service needs a **launcherApp** token, which the session mints and caches for you automatically. Account-bound sessions only. See [`LibraryManager`](/epic/library) for the full surface. `launcherLibrary` is the deprecated launcher-service proxy, kept for parity.

```ts
for (const record of await session.libraryAll())
  console.log(record.sandboxName ?? record.namespace, record.recordType);
```

## Avatars
<Badge type="info" text="method" />

```ts
avatars(accountIds: readonly string[], options?: AvatarOptions): Promise<AvatarEntry[]>
avatar(accountId?: string, options?: AvatarOptions): Promise<AvatarEntry | null>
resolveAvatars(accountIds: readonly string[], options?: AvatarResolveOptions): Promise<ResolvedAvatar[]>
resolveAvatar(accountId?: string, options?: AvatarResolveOptions): Promise<ResolvedAvatar | null>
```

Read the KWS/Epic **avatar** (the account's chosen Fortnite icon) for one or many accounts. `avatar`/`avatars` return the raw `namespace:id` reference; the `resolve*` variants additionally resolve the id into its `characterId` and a rendered `iconUrl`. `avatar`/`resolveAvatar` default to the signed-in account and return `null` when none is set.

Two sources are supported: `fncc` (**fn-api.cc**, the default) and `fortnite-api` (**fortnite-api.com**). Pick one per call with `options.source`; the resolved value also carries every source's URL in `iconUrls` so you can fall back client-side. `options.size` is `smallicon` (default), `icon`, or `featured` — `fncc` serves the character icon only, never a full render.

When you construct the SDK through the umbrella `Fortnite` client, the default `fncc` source reads the cosmetic's real `images` object from fn-api.cc, so the resolved `iconUrl` is the exact CDN link the API reports and degrades to `smallicon` when a skin has no `icon`. Used standalone (a bare `EpicGamesClient`, or `fortnite-api` as the source), the icon URL is built directly from the skin id against the CDN with no extra request. Pass your own `avatarImageResolver` to `EpicGamesClient` to override the lookup.

```ts
const me = await session.resolveAvatar();
console.log(me?.avatarId, me?.characterId, me?.source, me?.iconUrl);
console.log(me?.iconUrls['fncc'], me?.iconUrls['fortnite-api']);

const large = await session.resolveAvatar(undefined, {
  size: AvatarIconSize.Featured,
  source: AvatarImageSource.FortniteApi,
});
```

## Matchmaking
<Badge type="info" text="method" />

```ts
sessionInfo(options?: MatchmakingOptions): Promise<MatchmakingSession[]>
matchmakingNetCL(options?: MatchmakingOptions): Promise<string>
matchmakingBan(options?: MatchmakingTicketOptions): Promise<MatchmakingBanResult>
socialBan(accountId?: string, options?: SocialBanOptions): Promise<SocialBanStatus>
checkBan(options?: MatchmakingTicketOptions): Promise<BanCheckResult>
```

Inspect **matchmaking** state. `sessionInfo` returns the live server sessions the signed-in account is currently in — Epic's `findPlayer` route only reports your own account. `matchmakingNetCL` fetches the live `buildUniqueId` (netCL) for the current build. `matchmakingBan` reads the raw matchmaking ticket ban; `socialBan` reads the dedicated social-ban service; `checkBan` combines three signals to report whether the account is banned:

- **`permanent`** — Lightswitch reports the account `banned` (parsed to a boolean; the raw Lightswitch payload is not returned).
- **`temporary`** — the matchmaking ticket is rejected with `player_banned_from_sub_game`, exposing `banDaysRemaining`.
- **`social`** — the social-ban service (`social-ban-public-service-prod`) returns a non-empty `bans` array, surfaced as `socialBan` with its `bans` and `warnings`. See [`SocialBanManager`](/epic/social-ban).

`banned` is `true` when any of the three is set.

The ticket the ban check submits needs a valid `bucketId` **and** a valid `User-Agent`, and both hinge on the current netCL — a stale or placeholder `bucketId` is rejected with `Failed to parse bucketId`, and a `User-Agent` without a `-CL-<number>` segment is rejected against Epic's regex. Both `matchmakingBan` and `checkBan` fetch the live netCL once and build the `{netCL}:{hotfixVersion}:{region}:{playlist}` bucketId **and** the `Fortnite/++Fortnite+Release-Live-CL-{netCL} Windows/…` user-agent from it automatically, so no configuration is needed. Override any bucket segment (`netCL`, `hotfixVersion`, `region`, `playlist`) or pass a fully-formed `bucketId` / `userAgent` through `MatchmakingTicketOptions` to skip the lookup.

```ts
const ban = await session.checkBan();
console.log(ban.banned, ban.permanent, ban.temporary, ban.social, ban.banDaysRemaining);
if (ban.social) console.log(ban.socialBan.bans, ban.socialBan.warnings);

const netCL = await session.matchmakingNetCL();
const euBan = await session.checkBan({ region: 'EU' });
```

## Status page
<Badge type="info" text="method" />

```ts
statusSummary(options?: StatusOptions): Promise<StatusSummary>
statusComponents(options?: StatusOptions): Promise<StatusComponent[]>
statusIncidents(options?: StatusOptions): Promise<StatusIncident[]>
statusMaintenances(options?: StatusOptions): Promise<StatusMaintenance[]>
```

Read Epic's public **status site** (`status.epicgames.com`, a Statuspage.io instance) — the overall summary, per-component status, unresolved incidents, and active/scheduled maintenances. These hit the public status host and take **no auth**, so they work on any session (or none). Distinct from [`serviceStatus`](#status-presence), which reads the internal Lightswitch service state.

```ts
const summary = await session.statusSummary();
console.log(summary.status.description);
for (const incident of await session.statusIncidents()) console.log(incident.name);
```

## Content, build & islands
<Badge type="info" text="method" />

```ts
motds(options?: MotdOptions): Promise<MotdItem[]>
fortniteVersion(options?): Promise<FortniteVersion>
fortniteBuild(options?: LauncherBuildOptions): Promise<FortniteBuild>
launcherBuild(options?: LauncherBuildOptions): Promise<LauncherBuild>
launcherAssets(options?): Promise<LauncherAsset[]>
islandPackage(linkCode: string, options?): Promise<CookedContentPackage>
islandKeys(linkCode: string, options?): Promise<IslandKey[]>
launchIsland(linkCode: string, options?): Promise<IslandLaunchResult>
```

The personalised lobby MOTDs, the server and client Fortnite builds, launcher assets, and UEFN island packages, AES keys and launches. The launcherApp and Valkyrie (UEFN) tokens these need are minted from the session and cached automatically. See [Content Pages & MOTDs](/epic/content), [Launcher & Build Info](/epic/launcher) and [Islands](/epic/content-service).

---

# DeviceCodeFlow

Represents an in-progress device-code authorization, returned by `EpicGamesClient.startDeviceCode()`. Carries the user-facing code and verification URIs for display, plus polling helpers that resolve once the user authorizes in a browser. All descriptive fields are read-only.

## userCode
<Badge type="info" text="getter" />

```ts
readonly userCode: string
```

The short code the user enters at the verification page.

**Returns:** `string`

## deviceCode
<Badge type="info" text="getter" />

```ts
readonly deviceCode: string
```

The opaque device code used internally when polling for the token.

**Returns:** `string`

## verificationUri
<Badge type="info" text="getter" />

```ts
readonly verificationUri: string
```

The base URL where the user enters the code.

**Returns:** `string`

## verificationUriComplete
<Badge type="info" text="getter" />

```ts
readonly verificationUriComplete: string
```

The verification URL with the code pre-filled — the friendliest link to show the user.

**Returns:** `string`

## intervalSeconds
<Badge type="info" text="getter" />

```ts
readonly intervalSeconds: number
```

Epic's recommended polling interval in seconds; used as the default `intervalMs` when polling.

**Returns:** `number`

## expiresAt
<Badge type="info" text="getter" />

```ts
readonly expiresAt: Date
```

When the device code expires (computed from `expires_in` at creation).

**Returns:** `Date`

## expiresInMs
<Badge type="info" text="getter" />

```ts
get expiresInMs(): number
```

Milliseconds until the device code expires.

**Returns:** `number`

## isExpired
<Badge type="info" text="getter" />

```ts
get isExpired(): boolean
```

`true` once the device code has expired.

**Returns:** `boolean`

## client
<Badge type="info" text="getter" />

```ts
readonly client: AuthClient
```

The `AuthClient` the resulting session will be bound to.

**Returns:** `AuthClient`

## pollForToken
<Badge type="info" text="method" />

```ts
pollForToken(options?: DeviceCodePollOptions): Promise<OAuthToken>
```

Polls until authorization completes and resolves with the raw `OAuthToken`. Defaults `intervalMs` from `intervalSeconds` and `expiresAt` from the flow; any option you pass overrides those.

**Returns:** `Promise<OAuthToken>`

```ts
const token = await flow.pollForToken({ onPending: (i) => console.log(i.attempt) });
```

## poll
<Badge type="info" text="method" />

```ts
poll(options?: DeviceCodePollOptions): Promise<EpicAuthSession>
```

Polls to completion like `pollForToken`, then wraps the token in an `EpicAuthSession` bound to `client`. The usual way to finish a device-code flow.

**Returns:** `Promise<EpicAuthSession>`

```ts
import { EpicGamesClient } from 'fnapi-js';

const epic = new EpicGamesClient();

const flow = await epic.startDeviceCode();
console.log('To sign in, open this link and confirm the code:');
console.log(`  ${flow.verificationUriComplete}`);
console.log(`  code: ${flow.userCode} (expires in ${Math.round(flow.expiresInMs / 1000)}s)`);

const session = await flow.poll({
  onPending(info) {
    process.stdout.write(`\rwaiting for authorization (poll #${info.attempt})...`);
  },
});

console.log(`\nlogged in as ${session.displayName} (${session.accountId})`);
```

## Polling & callbacks

`poll()` (and `loginWithDeviceCode`) accept `DeviceCodePollOptions` — the same options drive both:

| Option | Type | Description |
| --- | --- | --- |
| `onPrompt` | `(flow) => void` | *(loginWithDeviceCode only)* Called once with the flow so you can show the verification link and code. |
| `onPending` | `(info) => void` | Called on every poll while waiting; `info` has `attempt`, `intervalMs`, `expiresInMs`. |
| `onCanceled` | `(error) => void` | Called when the flow ends **without** authorization — the user declined, or the code expired or gave up — right before the promise rejects with the `EpicAuthError`. |
| `intervalMs` | `number` | Override the poll interval. Defaults to the server's recommended `interval`. |
| `maxAttempts` | `number` | Stop after this many polls. |
| `signal` | `AbortSignal` | Cancel polling; rejects with `AbortError`. |

```ts
const session = await epic.loginWithDeviceCode({
  onPrompt: (flow) => console.log('Open', flow.verificationUriComplete),
  onPending: (info) => process.stdout.write(`\rwaiting (#${info.attempt})`),
  onCanceled: (error) => console.error('login canceled:', error.description ?? error.message),
});
```

### How fast does it poll?

As fast as Epic allows. The device-authorization response includes an `interval` (currently **10 seconds**) and the flow polls at exactly that cadence — the first poll fires immediately, then one per interval. Polling faster than the server interval makes Epic return `slow_down`, which the flow honors by **increasing** the interval by 5 s each time, so going faster actually ends up slower. In short: the default already polls at the maximum safe rate without hitting rate limits. You can still set `intervalMs` to experiment, but values below the server interval risk `slow_down`.

---

# Auth Clients

The bundled registry of Epic Games OAuth clients. Every grant, token, and Basic-auth request is authenticated as one of these clients. Only clients that carry a `clientSecret` are bundled here, since the secret is required to build the `basic` Authorization header. Pass a client by named key, by client id/name string, or as a fully custom `{ clientId, clientSecret }` object.

## AuthClient
<Badge type="tip" text="interface" />

```ts
interface AuthClient { name: string; clientId: string; clientSecret?: string }
```

Shape of a single OAuth client. `clientSecret` is optional on the type but present on every bundled client because Basic auth (`clientId:clientSecret`) needs it.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | `string` | Epic's human-readable client name, e.g. `fortnitePCGameClient`. |
| `clientId` | `string` | 32-char client id used as the Basic-auth username. |
| `clientSecret` | `string \| undefined` | Client secret used as the Basic-auth password. Present on all bundled clients. |

## AuthClients
<Badge type="warning" text="constant" />

```ts
const AuthClients: Record<AuthClientName, AuthClient>
```

Map of friendly keys to named clients. Keys include `fortnitePC`, `fortniteIOS`, `fortniteIOSEUAppstore`, `fortniteAndroid`, `fortniteSwitch`, `fortniteNewSwitch`, `fortniteXbox`, `fortniteXSX`, `fortniteValkyrie`, `fortniteCN`, `fortnitePS4EU`, `fortnitePS4US`, `kairosPC`, `kairosAndroid`, `kairosIOS`, `launcherApp`, `androidPortal`, `ut`, `utDedicatedServer`.

```ts
import { EpicGamesClient, AuthClients } from 'fnapi-js';

const epic = new EpicGamesClient({ defaultClient: 'fortnitePC' });

const pc = AuthClients.fortnitePC;
console.log(pc.name, pc.clientId);
```

::: tip Note
`fortniteNewSwitch` is required for the device-code flow, and `fortniteAndroid` is required for creating device auths. Use the friendly key directly anywhere an `AuthClientInput` is accepted.
:::

## AuthClientName
<Badge type="info" text="type" />

```ts
type AuthClientName = keyof typeof AuthClients
```

Union of the friendly registry keys (`'fortnitePC' | 'fortniteAndroid' | ...`). Accepted anywhere an `AuthClientInput` is expected.

## ALL_AUTH_CLIENTS
<Badge type="warning" text="constant" />

```ts
const ALL_AUTH_CLIENTS: readonly AuthClient[]
```

Flat array of all 26 secret-bearing clients, including several not in `AuthClients` (e.g. `wexPCGameClient`, `wexAndroidGameClient`, `wexIOSGameClient`, `Among Us`, `Fall Guys`, `Fortnite`, `Diesel - Monomi Park - Slime Rancher`). Backs the lookup index used by `findAuthClient`.

::: tip Note
Only clients with a known secret are listed here, since a secret is mandatory for Basic auth.
:::

## AuthClientInput
<Badge type="info" text="type" />

```ts
type AuthClientInput = AuthClient | AuthClientName | (string & {})
```

Union accepted by every client-taking API: a friendly key, a raw client id or Epic name string, or a full custom `AuthClient` object.

## findAuthClient
<Badge type="tip" text="function" />

```ts
findAuthClient(idOrName: string): AuthClient | null
```

Case-insensitive, trimmed lookup against `ALL_AUTH_CLIENTS` by either `clientId` or `name`. Returns `null` when nothing matches.

| Parameter | Type | Description |
| --- | --- | --- |
| `idOrName` | `string` | A client id or Epic client `name`; whitespace-trimmed and matched case-insensitively. |

**Returns:** `matching AuthClient, or null`

```ts
import { findAuthClient } from 'fnapi-js';

const byId = findAuthClient('ec684b8c687f479fadea3cb2ad83f5c6');
const byName = findAuthClient('fortniteNewSwitchGameClient');
```

## resolveAuthClient
<Badge type="tip" text="function" />

```ts
resolveAuthClient(input: AuthClientInput): AuthClient
```

Normalizes any `AuthClientInput` into a concrete `AuthClient`. Objects are validated (non-empty `clientId` required) and returned as-is; strings are resolved first against `AuthClients` keys, then via `findAuthClient`.

| Parameter | Type | Description |
| --- | --- | --- |
| `input` | `AuthClientInput` | Friendly key, id/name string, or custom `{ clientId, clientSecret }`. |

**Returns:** `resolved AuthClient`

```ts
import { resolveAuthClient } from 'fnapi-js';

const custom = resolveAuthClient({
  name: 'myCustomClient',
  clientId: 'abc123',
  clientSecret: 'shhh',
});

const known = resolveAuthClient('fortniteAndroid');
```

::: tip Note
Throws `ValidationError` when a custom object lacks a `clientId`, when a string matches no known client, or when input is missing.
:::

---

# DeviceAuthManager

Manages persistent device auths on Epic's account service, exposed as `client.deviceAuths` on `EpicGamesClient` (and on a live `EpicAuthSession`). Every method takes an account-bound access token that carries the `deviceAuths` permission plus the target `accountId`. Device auths are the long-lived credential you later feed to the `deviceAuth` grant to log back in without a password.

## deviceAuths.create
<Badge type="info" text="method" />

```ts
create(accessToken: string, accountId: string, options?: { signal?: AbortSignal }): Promise<DeviceAuth>
```

Creates a new device auth for the account. The returned `DeviceAuth` includes a one-time `secret` (only present on creation) alongside `deviceId` and `accountId` — store all three to reuse later.

| Parameter | Type | Description |
| --- | --- | --- |
| `accessToken` | `string` | Account-bound bearer token with `deviceAuths` permission. |
| `accountId` | `string` | The account the device auth is created for. |
| `options` | `{ signal?: AbortSignal }` | Optional abort signal. |

**Returns:** `Promise<DeviceAuth> with deviceId, accountId, and one-time secret`

```ts
import { EpicGamesClient } from 'fnapi-js';

const epic = new EpicGamesClient({ defaultClient: 'fortniteAndroid' });

const created = await epic.deviceAuths.create(accessToken, accountId);
console.log(created.deviceId, created.accountId, created.secret);
```

::: tip Note
Requires a token minted from `fortniteAndroid` to create device auths. The `secret` is never returned again by `list`/`get`.
:::

## deviceAuths.list
<Badge type="info" text="method" />

```ts
list(accessToken: string, accountId: string, options?: { signal?: AbortSignal }): Promise<DeviceAuth[]>
```

Lists all device auths registered for the account. Returned entries omit `secret`.

| Parameter | Type | Description |
| --- | --- | --- |
| `accessToken` | `string` | Account-bound bearer token with `deviceAuths` **READ** permission. |
| `accountId` | `string` | The account to list device auths for. |
| `options` | `{ signal?: AbortSignal }` | Optional abort signal. |

**Returns:** `Promise<DeviceAuth[]>`

```ts
const auths = await epic.deviceAuths.list(accessToken, accountId);
for (const a of auths) console.log(a.deviceId, a.lastAccess?.dateTime);
```

::: tip READ permission is handled for you
`list` and `get` require the `account:public:account:deviceAuths` **READ** action. A token minted from the **deviceAuth grant** (the one you log in with via `loginWithDeviceAuth`) carries `CREATE`+`DELETE` but not `READ`. When you call these through a session, it detects the `EpicPermissionError` and transparently mints a READ-capable token (exchange-code → `fortnitePC`) for the retry, so this just works:

```ts
const session = await epic.loginWithDeviceAuth(creds);
const auths = await session.listDeviceAuths();
```

Calling `DeviceAuthManager.list` / `.get` directly with a raw token still needs one that holds `READ` — switch clients yourself (`session.switchClient('fortnitePC')`) if you go around the session.
:::

## deviceAuths.get
<Badge type="info" text="method" />

```ts
get(accessToken: string, accountId: string, deviceId: string, options?: { signal?: AbortSignal }): Promise<DeviceAuth>
```

Fetches a single device auth by its `deviceId`. Includes `created`/`lastAccess` metadata but not the `secret`.

| Parameter | Type | Description |
| --- | --- | --- |
| `accessToken` | `string` | Account-bound bearer token with `deviceAuths` permission. |
| `accountId` | `string` | Owning account id. |
| `deviceId` | `string` | The device auth to fetch. |
| `options` | `{ signal?: AbortSignal }` | Optional abort signal. |

**Returns:** `Promise<DeviceAuth>`

```ts
const one = await epic.deviceAuths.get(accessToken, accountId, deviceId);
console.log(one.userAgent, one.created.dateTime);
```

## deviceAuths.delete
<Badge type="info" text="method" />

```ts
delete(accessToken: string, accountId: string, deviceId: string, options?: { signal?: AbortSignal }): Promise<void>
```

Revokes a device auth by `deviceId`. Resolves with no value on success.

| Parameter | Type | Description |
| --- | --- | --- |
| `accessToken` | `string` | Account-bound bearer token with `deviceAuths` permission. |
| `accountId` | `string` | Owning account id. |
| `deviceId` | `string` | The device auth to revoke. |
| `options` | `{ signal?: AbortSignal }` | Optional abort signal. |

**Returns:** `Promise<void>`

```ts
await epic.deviceAuths.delete(accessToken, accountId, deviceId);
```

## DeviceAuth
<Badge type="tip" text="interface" />

```ts
interface DeviceAuth { deviceId: string; accountId: string; secret?: string; userAgent?: string; created: DeviceAuthAccess; lastAccess?: DeviceAuthAccess }
```

A stored device auth. `secret` is only populated on `create`. `created`/`lastAccess` are `DeviceAuthAccess` records (`{ location?, ipAddress?, dateTime }`). Pair `accountId`+`deviceId`+`secret` as `DeviceAuthCredentials` for the `deviceAuth` grant.

---

# AccountManager

Reads Epic account records from the account service, exposed as `client.accounts` on `EpicGamesClient` (and on a live `EpicAuthSession`). Every method requires a valid bearer token. Results are `EpicAccount` objects — most fields beyond `id` and `displayName` only appear when the token has permission to see them (e.g. querying your own account).

## accounts.byId
<Badge type="info" text="method" />

```ts
byId(accessToken: string, accountId: string, options?: { signal?: AbortSignal }): Promise<EpicAccount>
```

Fetches a single account by its account id.

| Parameter | Type | Description |
| --- | --- | --- |
| `accessToken` | `string` | Bearer token. |
| `accountId` | `string` | The account id to look up. |
| `options` | `{ signal?: AbortSignal }` | Optional abort signal. |

**Returns:** `Promise<EpicAccount>`

```ts
import { EpicGamesClient } from 'fnapi-js';

const epic = new EpicGamesClient();
const account = await epic.accounts.byId(accessToken, accountId);
console.log(account.displayName, account.country);
```

## accounts.byIds
<Badge type="info" text="method" />

```ts
byIds(accessToken: string, accountIds: string[], options?: { signal?: AbortSignal }): Promise<EpicAccount[]>
```

Bulk-fetches accounts by id in a single request. The array must be non-empty and hold at most 100 ids.

| Parameter | Type | Description |
| --- | --- | --- |
| `accessToken` | `string` | Bearer token. |
| `accountIds` | `string[]` | 1-100 account ids. |
| `options` | `{ signal?: AbortSignal }` | Optional abort signal. |

**Returns:** `Promise<EpicAccount[]>`

```ts
const accounts = await epic.accounts.byIds(accessToken, [id1, id2, id3]);
console.log(accounts.map((a) => a.displayName));
```

::: tip Note
Throws `ValidationError` when the array is empty or exceeds 100 ids.
:::

## accounts.resolveAccounts
<Badge type="info" text="method" />

```ts
resolveAccounts(accessToken: string, accountIds: string[], options?: { signal?: AbortSignal }): Promise<Map<string, EpicAccount>>
```

Resolves any number of account ids into a `Map` keyed by account id. Blank ids are dropped and duplicates deduped, then the remaining ids are chunked into requests of 100 automatically, so unlike `byIds` there is no length limit and no throw on an empty list (it simply makes no request). Ids Epic does not return are absent from the map.

| Parameter | Type | Description |
| --- | --- | --- |
| `accessToken` | `string` | Bearer token. |
| `accountIds` | `string[]` | Any number of account ids. |
| `options` | `{ signal?: AbortSignal }` | Optional abort signal. |

**Returns:** `Promise<Map<string, EpicAccount>>`

```ts
const accounts = await epic.accounts.resolveAccounts(accessToken, friendIds);
console.log(accounts.get(friendIds[0])?.displayName);
```

## accounts.resolveNames
<Badge type="info" text="method" />

```ts
resolveNames(accessToken: string, accountIds: string[], options?: { signal?: AbortSignal }): Promise<Map<string, string>>
```

Convenience wrapper over `resolveAccounts` that returns a `Map` of account id → display name — the common case when turning a list of ids into readable names.

```ts
const names = await epic.accounts.resolveNames(accessToken, friendIds);
for (const [id, name] of names) console.log(id, '→', name);
```

**Session:** `session.resolveAccountNames(accountIds)` (and `session.resolveAccounts(accountIds)`).

## accounts.byDisplayName
<Badge type="info" text="method" />

```ts
byDisplayName(accessToken: string, displayName: string, options?: { signal?: AbortSignal }): Promise<EpicAccount>
```

Resolves an account by its exact (Epic) display name.

| Parameter | Type | Description |
| --- | --- | --- |
| `accessToken` | `string` | Bearer token. |
| `displayName` | `string` | Exact Epic display name. |
| `options` | `{ signal?: AbortSignal }` | Optional abort signal. |

**Returns:** `Promise<EpicAccount>`

```ts
const account = await epic.accounts.byDisplayName(accessToken, 'Ninja');
console.log(account.id);
```

## accounts.byEmail
<Badge type="info" text="method" />

```ts
byEmail(accessToken: string, email: string, options?: { signal?: AbortSignal }): Promise<EpicAccount>
```

Resolves an account by email address. Requires an elevated token — most tokens cannot query by email.

| Parameter | Type | Description |
| --- | --- | --- |
| `accessToken` | `string` | Bearer token with email-lookup permission. |
| `email` | `string` | Account email address. |
| `options` | `{ signal?: AbortSignal }` | Optional abort signal. |

**Returns:** `Promise<EpicAccount>`

```ts
const account = await epic.accounts.byEmail(accessToken, 'user@example.com');
```

## accounts.externalAuths
<Badge type="info" text="method" />

```ts
externalAuths(accessToken: string, accountId: string, options?: { signal?: AbortSignal }): Promise<ExternalAuth[]>
```

Lists every external connection (console, social, etc.) linked to an account — Xbox, PlayStation, Nintendo, Steam, and the rest.

**Returns:** `Promise<ExternalAuth[]>` · **Session:** `session.externalAuths(accountId?)` — `accountId` defaults to the signed-in account.

## accounts.externalAuth
<Badge type="info" text="method" />

```ts
externalAuth(accessToken: string, accountId: string, externalAuthType: string, options?: { signal?: AbortSignal }): Promise<ExternalAuth>
```

Fetches a single linked connection by its type (`xbl`, `psn`, `nintendo`, …).

**Session:** `session.externalAuth(externalAuthType, accountId?)`

## accounts.byExternalDisplayName
<Badge type="info" text="method" />

```ts
byExternalDisplayName(accessToken: string, externalAuthType: string, displayName: string, options?: { caseInsensitive?: boolean; signal?: AbortSignal }): Promise<ExternalAuthAccountMatch[]>
```

Finds Epic accounts by their display name **on an external platform** — e.g. an Xbox gamertag or PSN online id. Set `caseInsensitive` to relax the match.

| Parameter | Type | Description |
| --- | --- | --- |
| `externalAuthType` | `string` | Platform, e.g. `xbl` / `psn` / `nintendo`. |
| `displayName` | `string` | The platform display name to resolve. |
| `options.caseInsensitive` | `boolean` | Match without case sensitivity. |

**Returns:** `Promise<ExternalAuthAccountMatch[]>` · **Session:** `session.accountByExternalDisplayName(externalAuthType, displayName, options?)`

## accounts.byExternalDisplayNames
<Badge type="info" text="method" />

```ts
byExternalDisplayNames(accessToken: string, authType: string, displayNames: string[], options?: { signal?: AbortSignal }): Promise<ExternalDisplayNameLookup>
```

Bulk variant of `byExternalDisplayName` — resolves 1–100 platform display names in one POST. Returns a lookup keyed by the queried name.

**Session:** `session.accountsByExternalDisplayNames(authType, displayNames)`

::: tip Note
Throws `ValidationError` when the array is empty or exceeds 100 names.
:::

## accounts.byExternalIds
<Badge type="info" text="method" />

```ts
byExternalIds(accessToken: string, authType: string, ids: string[], options?: { signal?: AbortSignal }): Promise<ExternalIdLookup>
```

Resolves 1–100 external platform account ids (e.g. raw XUIDs / PSN account ids) into their Epic links in one POST. Returns a lookup keyed by the external id.

**Session:** `session.accountsByExternalIds(authType, ids)`

## accounts.metadata
<Badge type="info" text="method" />

```ts
metadata(accessToken: string, accountId: string, options?: { signal?: AbortSignal }): Promise<AccountMetadata>
```

Reads the account's metadata bag — a flat `Record<string, string>` of onboarding and feature flags Epic keeps on the account. Uses the `/account/api/accounts/:id/metadata` route.

**Session:** `session.accountMetadata(accountId?)`

## EpicAccount
<Badge type="tip" text="interface" />

```ts
interface EpicAccount { id: string; displayName: string; name?: string; email?: string; country?: string; externalAuths?: Record<string, ExternalAuth>; /* ...plus many optional profile fields */ }
```

An Epic account record. `id` and `displayName` are always present; the rest (`email`, `country`, `tfaEnabled`, `emailVerified`, `ageGroup`, `externalAuths`, etc.) are optional and only returned when the token is authorized to see them.

---

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

---

# MCP Client

MCP (profile) operations are the Fortnite game-service commands that read and mutate a player's profiles — cosmetics, purchases, quests, Save the World data and more. Every operation shares one request shape, so the wrapper exposes a **single generic caller** plus typed helpers for the two query operations, rather than 148 near-identical methods.

Everything runs against `https://fngw-mcp-gc-livefn.ol.epicgames.com` with a bearer token from an **account-bound** session (a client-credentials session has no account and will throw). The full list of operations, profiles and routes is in the [MCP Operations Catalog](/reference/mcp-operations).

```ts
import { EpicGamesClient, MCPProfile } from 'fnapi-js';

const epic = new EpicGamesClient();
const session = await epic.loginWithDeviceAuth(creds);

// query a profile
const athena = await session.queryProfile(MCPProfile.athena);
console.log(athena.profileRevision, athena.profileChanges.length);

// call any operation by name
await session.mcpOperation('MarkItemSeen', {
  profileId: MCPProfile.athena,
  payload: { itemIds: ['AthenaCharacter:CID_028_Athena_Commando_F'] },
});
```

## session.queryProfile
<Badge type="info" text="method" />

```ts
queryProfile<T>(profileId?: MCPProfileId, options?): Promise<MCPResponse<T>>
```

Runs `QueryProfile` for the session's account on the given profile (default `common_core`). Refreshes the token first if it is close to expiring.

| Parameter | Type | Description |
| --- | --- | --- |
| `profileId` | `MCPProfileId` | Which profile to read — e.g. `MCPProfile.athena`, `MCPProfile.commonCore`, `MCPProfile.campaign`. |
| `options` | `MCPOperationOptions` | Optional `rvn`, `route`, `payload`, `signal`, `timeout`. |

**Returns:** `Promise<MCPResponse<T>>`

```ts
const core = await session.queryProfile(MCPProfile.commonCore);
```

## session.queryPublicProfile
<Badge type="info" text="method" />

```ts
queryPublicProfile<T>(accountId: string, profileId?: MCPProfileId, options?): Promise<MCPResponse<T>>
```

Runs `QueryPublicProfile` (the `public` route) for **another** account's public profile data.

**Returns:** `Promise<MCPResponse<T>>`

```ts
const publicData = await session.queryPublicProfile('4735ce9132924caf8a5b17789b40f79c');
```

## session.mcpOperation
<Badge type="info" text="method" />

```ts
mcpOperation<T>(operation: MCPOperation, options?: MCPOperationOptions): Promise<MCPResponse<T>>
```

Calls **any** MCP operation by name against the session's account, injecting the (auto-refreshed) token. Accepts any string, so operations not yet in the typed list still work.

| Parameter | Type | Description |
| --- | --- | --- |
| `operation` | `MCPOperation` | The operation name, e.g. `'SetItemFavoriteStatusBatch'`. Any of the [148 operations](/reference/mcp-operations). |
| `options` | `MCPOperationOptions` | `profileId` (default `common_core`), `route` (default `client`), `rvn` (default `-1`), `payload` (default `{}`), `signal`, `timeout`. |

**Returns:** `Promise<MCPResponse<T>>`

```ts
await session.mcpOperation('SetItemFavoriteStatusBatch', {
  profileId: MCPProfile.athena,
  payload: { itemIds: ['ABC'], itemFavStatus: [true] },
});
```

::: tip Custom operations
Any operation name in [`MCP_OPERATIONS`](/reference/mcp-operations) always works. To call an operation **not** in that list (e.g. one Epic added after this release), construct the client with `allowCustomMcpOperations: true` — otherwise the call throws a `ConfigurationError`.
:::

## client.mcp
<Badge type="tip" text="class" />

```ts
class MCPClient
```

The low-level client on `EpicGamesClient.mcp`. Same methods as the session helpers, but you pass the access token and account id explicitly — useful when you hold a raw token rather than a session.

```ts
const epic = new EpicGamesClient();
const res = await epic.mcp.operation(accessToken, accountId, 'QueryProfile', {
  profileId: MCPProfile.athena,
});
```

## client.mcp.operation
<Badge type="info" text="method" />

```ts
operation<T>(accessToken: string, accountId: string, operation: MCPOperation, options?): Promise<MCPResponse<T>>
```

The generic caller. Blank `accessToken`, `accountId` or `operation` throw a `ValidationError` before any request.

**Returns:** `Promise<MCPResponse<T>>`

## client.mcp.queryProfile / queryPublicProfile
<Badge type="info" text="method" />

```ts
queryProfile<T>(accessToken, accountId, profileId?, options?): Promise<MCPResponse<T>>
queryPublicProfile<T>(accessToken, accountId, profileId?, options?): Promise<MCPResponse<T>>
```

Explicit-token equivalents of the session helpers.

## MCPProfile
<Badge type="warning" text="constant" />

```ts
const MCPProfile: { athena, creative, campaign, commonPublic, collections, commonCore, metadata, ... }
```

Named profile ids. `MCPProfile.athena` is `'athena'`, `MCPProfile.commonCore` is `'common_core'`, and so on. See the [catalog](/reference/mcp-operations) for what each profile stores.

## MCPRoute
<Badge type="warning" text="constant" />

```ts
const MCPRoute: { client: 'client', public: 'public', dedicatedServer: 'dedicated_server' }
```

Request routes. `client` is the default; `public` is used by `queryPublicProfile`; `dedicated_server` requires a role you cannot hold.

## MCP_OPERATIONS
<Badge type="warning" text="constant" />

```ts
const MCP_OPERATIONS: readonly MCPOperation[]
```

The full list of 148 operation names at runtime. Pair with `isMCPOperation(name)` to validate user input before calling.

```ts
import { MCP_OPERATIONS, isMCPOperation } from 'fnapi-js';

console.log(MCP_OPERATIONS.length); // 148
isMCPOperation('QueryProfile');     // true
isMCPOperation('Nope');             // false
```

## MCP_BASE_URL
<Badge type="warning" text="constant" />

```ts
const MCP_BASE_URL: 'https://fngw-mcp-gc-livefn.ol.epicgames.com'
```

The game-service base URL all MCP operations hit. `client.mcpRest` is the `EpicRestClient` pointed at it.

---

# Locker

The `Locker` drives a signed-in player's locker through Epic's **EOS Locker Service** (`locker/v4`), which is the same system the game uses. It reads every owned cosmetic and the equipped loadout across every section: character, emotes, wraps, banner and lobby, Festival instruments and jam tracks, cars, companions and moments. It equips items with styles and colours, and manages saved presets.

On its own it returns the ids Epic stores. Pass it the [`FortniteAPI`](/fortnite/fortnite-api) cosmetics source and set `enrich` to resolve each item to full cosmetic data **and its image link**.

```ts
import { EpicGamesClient, FortniteAPI, Locker } from 'fnapi-js';

const epic = new EpicGamesClient();
const fortnite = new FortniteAPI({ cache: { enabled: true } });

const session = await epic.loginWithDeviceAuth(creds);
const locker = new Locker(session, fortnite.cosmetics);

const snapshot = await locker.fetch({ enrich: true });
console.log(`${snapshot.items.length} cosmetics owned`);
console.log('equipped skin:', snapshot.loadout.character?.name);
console.log('image:', snapshot.loadout.character?.imageUrl);

await locker.equipEmote('EID_Floss', 0);
await locker.equipWrap('Wrap_121_JupiterZero');
```

::: info Session requirements
Every call authenticates with EOS Connect under the hood, through `session.eosToken()`, which caches the token. That requires an account-bound session such as device auth or device code, not `client_credentials`.
:::

::: tip Enrichment is opt-in
Without a cosmetics source, or with `enrich` left off, items come back with `name`, `cosmetic` and `imageUrl` set to `null`. Requesting `enrich: true` **without** a source throws a `ValidationError`. The source is fetched once and cached on the locker.
:::

## new Locker
<Badge type="tip" text="class" />

```ts
new Locker(session: EpicAuthSession, cosmetics?: LockerCosmeticSource)
```

| Parameter | Type | Description |
| --- | --- | --- |
| `session` | `EpicAuthSession` | An account-bound session. |
| `cosmetics` | `LockerCosmeticSource` | Anything with an `all()` that returns every cosmetic. Pass `client.cosmetics`. Only needed for enrichment. |

## fetch
<Badge type="info" text="method" />

```ts
fetch(options?: { enrich?: boolean; items?: boolean; signal?: AbortSignal }): Promise<LockerSnapshot>
```

Reads the locker and returns `{ accountId, items, loadout, presets, schemaPresets }`:

- `items` holds every owned cosmetic. It is paged out of `cosmetic-data`, which takes about 3 requests for a large locker.
- `loadout` is the active loadout group.
- `presets` holds the saved full-locker presets.
- `schemaPresets` holds the older per-section presets, sorted by index.

Pass `items: false` to skip the cosmetic list when you only need the loadout.

```ts
const { items, loadout, presets } = await locker.fetch({ enrich: true });
```

## items / loadout / presets
<Badge type="info" text="method" />

```ts
items(options?: { enrich?: boolean; signal?: AbortSignal }): Promise<LockerItem[]>
loadout(options?: { enrich?: boolean; signal?: AbortSignal }): Promise<LockerLoadout>
presets(signal?: AbortSignal): Promise<LockerPreset[]>
```

These are shortcuts that make only the requests they need.

## resolveImage
<Badge type="info" text="method" />

```ts
resolveImage(cosmeticId: string): Promise<string | null>
```

Looks a cosmetic id up in the cosmetics source and returns its image link. Accepts a bare id or `Type:id`.

## Equipping

Every edit reads the current active loadout group, changes only the targeted slots, and `PUT`s the whole group back. Other sections are never touched. Edits made through one `Locker` run one after another, so concurrent calls cannot overwrite each other. Each edit resolves to the updated `LockerLoadout`.

Item ids may be bare (`'CID_028_Athena_Commando_F'`) or full template ids (`'AthenaCharacter:cid_028_athena_commando_f'`). Bare ids get the slot's item type, and ids are lowercased the way the service stores them.

### equip / equipMany
<Badge type="info" text="method" />

```ts
equip(slot: LockerSlotName, item: string | null, options?: { variants?: LockerVariantSelection[]; signal?: AbortSignal }): Promise<LockerLoadout>
equipMany(changes: LockerChanges, signal?: AbortSignal): Promise<LockerLoadout>
```

The generic form behind every helper. `null` empties the slot. When the same item is re-equipped without `variants`, its current styles are kept. A new item starts with no styles unless you pass some.

```ts
await locker.equipMany({
  character: { item: 'CID_028_Athena_Commando_F', variants: [{ channel: 'Material', variant: 'Mat2' }] },
  pickaxe: 'DefaultPickaxe',
  emote0: 'EID_Floss',
  carBody: 'VehicleCosmetics_Body:carbody_alokin',
});
```

### Helpers
<Badge type="info" text="method" />

| Method | Slot |
| --- | --- |
| `equipOutfit(id, options?)` | `character` |
| `equipBackpack(id, options?)` | `backpack` |
| `equipPickaxe(id, options?)` | `pickaxe` |
| `equipGlider(id, options?)` | `glider` |
| `equipContrail(id, options?)` | `contrail` |
| `equipShoes(id, options?)` | `shoes` |
| `equipAura(id, options?)` | `aura` |
| `equipEmote(id, index = 0, options?)` | `emote0`–`emote7` |
| `equipWrap(id, index?, options?)` | `wrap0`–`wrap6`; no index wraps every slot |
| `equipJamTrack(id, index = 0, options?)` | `jamTrack0`–`jamTrack7` |
| `equipInstrument(kind, id, options?)` | `bass`, `guitar`, `drums`, `keyboard`, `microphone` |
| `equipLoadingScreen(id, options?)` | `loadingScreen` |
| `equipLobbyMusic(id, options?)` | `lobbyMusic` (`sid_…` ids become `SparksSong`, others `AthenaMusicPack`) |
| `equipCompanion(id, options?)` | `companion` |
| `setBanner(icon, color, signal?)` | `bannerIcon` + `bannerColor` |
| `clear(slot, signal?)` | empties any slot |

Car and SUV parts (`carBody`, `carSkin`, `carWheels`, `carDriftTrail`, `carBooster`, and the same with `suv…`) go through `equip`. The `carMacaron`, `carZest`, `suvMacaron` and `suvZest` slots need a full template id.

### setVariants
<Badge type="info" text="method" />

```ts
setVariants(slot: LockerSlotName, variants: LockerVariantSelection[], signal?: AbortSignal): Promise<LockerLoadout>
```

Changes styles on the equipped item and keeps it in place. Each `channel` replaces that channel and the other channels are kept.

```ts
await locker.setVariants('character', [{ channel: 'Progressive', variant: 'Stage3' }]);
```

### setColor
<Badge type="info" text="method" />

```ts
setColor(slot: LockerSlotName, color: string | RichColor, signal?: AbortSignal): Promise<LockerLoadout>
```

Recolours every RichColor channel on the equipped item, such as a custom umbrella or a car body paint. `color` can be any of these:

- `#RGB`, `#RRGGBB` or `#RRGGBBAA`
- `{ r, g, b, a }` with values from 0 to 1
- a raw 32-digit RichColor value

It throws a `ValidationError` when the equipped item has no colour channel.

::: warning Palettes
Some items only accept certain colours, and the service snaps any other value to its nearest allowed swatch. Read the returned loadout to see what was actually stored.
:::

`encodeRichColor(color)` and `decodeRichColor(additionalData)` are exported for working with these values directly. RichColor data is four big-endian float32 values (RGBA).

### restore
<Badge type="info" text="method" />

```ts
restore(loadout: LockerLoadout | { loadouts: Record<string, LockerSchemaLoadout> }, signal?: AbortSignal): Promise<LockerLoadout>
```

Puts a previously read loadout back exactly as it was. This is handy for "try it on" features:

```ts
const before = await locker.loadout();
await locker.equipOutfit('CID_028_Athena_Commando_F');
await locker.restore(before);
```

## Presets

These are the full-locker presets shown in the game's preset menu (`loadout-group-preset`).

```ts
savePreset(name: string, options?: { loadouts?: Record<string, LockerSchemaLoadout>; signal?: AbortSignal }): Promise<LockerPreset>
updatePreset(presetId: string, update: { name?: string; loadouts?: Record<string, LockerSchemaLoadout> | 'current' }, signal?: AbortSignal): Promise<LockerPreset>
renamePreset(presetId: string, name: string, signal?: AbortSignal): Promise<LockerPreset>
applyPreset(presetId: string, signal?: AbortSignal): Promise<LockerLoadout>
deletePreset(presetId: string, signal?: AbortSignal): Promise<void>
```

- `savePreset` saves the current loadout, or the `loadouts` you pass, as a new preset.
- `updatePreset` changes a preset's name or contents. Pass `loadouts: 'current'` to overwrite it with what is equipped now.
- `applyPreset` equips the preset and marks it as the active one.
- `updatePreset`, `renamePreset` and `applyPreset` accept a preset id or its exact name.

```ts
const preset = await locker.savePreset('Tryhard');
await locker.renamePreset(preset.id, 'Sweaty');
await locker.applyPreset('Sweaty');
await locker.deletePreset(preset.id);
```

## Item actions

### setCompanionName
<Badge type="info" text="method" />

```ts
setCompanionName(item: LockerItem | string, name: string, signal?: AbortSignal): Promise<void>
```

Renames an owned companion. `item` is a `LockerItem`, a cosmetic id, a template id or the item guid.

### lockInItem
<Badge type="info" text="method" />

```ts
lockInItem(item: LockerItem | string, variants: Record<string, { variantTag: string; additionalData?: string }>, signal?: AbortSignal): Promise<void>
```

Permanently locks the styles in on an immutable item, such as a companion's colours. This cannot be undone.

### setFavorite / markSeen
<Badge type="info" text="method" />

```ts
setFavorite(itemIds: string[], favorite?: boolean, signal?: AbortSignal): Promise<MCPResponse>
markSeen(itemIds: string[], signal?: AbortSignal): Promise<MCPResponse>
```

These take item guids (`LockerItem.id`). The locker service has no endpoint for them, so they still go through the `athena` MCP profile.

## Types

### LockerItem

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Item guid. |
| `templateId` | `string` | e.g. `AthenaCharacter:cid_028_athena_commando_f`. |
| `type` / `cosmeticId` | `string` | The two halves of `templateId`. |
| `favorite` / `seen` | `boolean` | Favourited, and whether the item has been seen. |
| `lockedIn` | `boolean \| null` | Lock-in state for immutable items. |
| `variants` | `LockerVariant[]` | `{ channel, active, activeData, owned }` per style channel. |
| `createdAt` / `updatedAt` | `string \| null` | ISO timestamps. |
| `name` / `cosmetic` / `imageUrl` | | Filled in by enrichment. |

### LockerLoadout

These named sections hold a `LockerEquippedItem` or `null`:

- `character`, `backpack`, `pickaxe`, `glider`, `contrail`, `shoes`, `aura`
- `emotes` (8 entries), `wraps` (7) and `jamTracks` (8)
- `banner.icon`, `banner.color`, `lobbyMusic`, `loadingScreen`
- `instruments.{bass,guitar,drums,keyboard,microphone}`
- `car` and `suv`, each with `{ body, skin, wheels, driftTrail, booster, macaron, zest }`
- `companion`, `moments.bus`, `moments.victory`

It also has these fields:

| Field | Description |
| --- | --- |
| `slots` | Every equipped item keyed by `LockerSlotName`. |
| `other` | Items in slots this version does not know yet, so new sections still show up. |
| `shuffle` | Shuffle mode per schema. |
| `presetId` | The active preset id, if one is equipped. |
| `group` | The raw active loadout group. |

`LockerEquippedItem` is `{ slot, schema, slotTemplate, templateId, type, cosmeticId, resolvedTemplateId, variants, name, cosmetic, imageUrl }`. `resolvedTemplateId` is the item the game picked for a "random" slot.

### LockerSchema / LOCKER_SLOTS

`LockerSchema` names the ten loadout schemas, such as `LockerSchema.character` (`CosmeticLoadout:LoadoutSchema_Character`). `LOCKER_SLOTS` maps every `LockerSlotName` to its `{ schema, slotTemplate, itemType }`.

## Raw session calls

The locker is built on these `EpicAuthSession` methods, which you can also call directly:

- `lockerItems()`
- `lockerCosmeticPage({ limit, nextToken })`
- `lockerCosmetics()`
- `setActiveLoadoutGroup(group)`
- `putLoadoutGroupPreset(id, preset)`
- `updateLoadoutGroupPreset(id, preset)`
- `deleteLoadoutGroupPreset(id)`
- `setCompanionName(cosmeticItemId, name)`
- `lockInImmutableItem(itemIdentifier, variants)`

---

# Party

Read and drive a signed-in account's **current Fortnite party** over the party service — no XMPP connection required. The library finds the party you're already in, exposes its members and meta, and lets you patch your own member meta: fake cosmetics, a fake emote, and your ready state.

You must be **in a party in-game** (even a party of one). `session.getParty()` throws a `ValidationError` if you aren't.

```ts
import { EpicGamesClient } from 'fnapi-js';

const epic = new EpicGamesClient();
const session = await epic.loginWithDeviceAuth(creds);

const party = await session.getParty();
console.log(`${party.members.length} members, leader ${party.leader?.accountId}`);

await party.me?.fakeApplyCosmetics({
  outfit: 'CID_028_Athena_Commando_F',
  backpack: 'BID_004_BlackKnight',
});
await party.me?.fakeEmote('EID_Floss');
await party.me?.fakeReady(true);
```

::: tip Modern loadout format
Cosmetics are written to the current party-meta loadout key `Default:MpLoadout1_j` (the compact `{ ac, ab, ap, at, as, ag, … }` slot format the game uses today), plus the separate `Default:FrontendEmote_j` and `Default:FrontendSparksSongPart_j` (jam) keys. You must already be in a party so the game has populated a real loadout to merge over.
:::

::: warning Fake cosmetics are visual-only, for others
`fakeApplyCosmetics` / `fakeEmote` change your **party-meta representation** — the outfit/emote *other members of your party* see in the lobby. They do **not** change your real account, your locker, or what you wear in a match, and only people in your party see them. That's why every method is prefixed `fake`.
:::

## session.getParty
<Badge type="info" text="method" />

```ts
getParty(): Promise<Party>
```

Fetches your current party and returns a `Party`. Throws `ValidationError` if you are not in a party or the session has no account.

## Party
<Badge type="tip" text="class" />

A snapshot of the party with helpers to read members and patch party-level meta.

| Member | Type | Description |
| --- | --- | --- |
| `id` | `string` | Party id. |
| `revision` | `number` | Party meta revision (auto-managed on patch). |
| `members` | `PartyMember[]` | All members. |
| `me` | `PartyMember \| null` | Your own member. |
| `leader` | `PartyMember \| null` | The party captain. |
| `member(accountId)` | `PartyMember \| null` | Look up a member. |
| `refresh()` | `Promise<this>` | Re-fetch the party. |
| `patchMeta(update, delete?)` | `Promise<void>` | Patch **party** meta, handling the revision (and one retry on a stale revision). |

## PartyMember
<Badge type="tip" text="class" />

One member. The `fake*` and meta-write methods only work on **your own** member (`party.me`) — editing another member throws `ValidationError`.

### Reading meta

```ts
member.getMeta();                                  // Record<string, string>
member.getMetaKey('Default:AthenaCosmeticLoadout_j');
member.getProp('Default:AthenaCosmeticLoadout_j'); // JSON-parsed
```

### Read-only getters

Typed accessors that parse the raw meta for you. They work on **any** member, not just `party.me`, and never throw — missing keys resolve to `undefined`, `false`, `0`, or `null` as appropriate.

```ts
member.outfit;      // string | undefined  — bare id from the ac slot
member.backpack;    // ab slot
member.pickaxe;     // ap slot
member.contrail;    // at slot
member.shoes;       // as slot
member.glider;      // ag slot
member.sidekick;    // mm slot
member.instruments; // FakeInstruments — { bass, guitar, drums, keytar, microphone }
member.banner;      // PartyMemberBanner | undefined — { bannerIconId?, bannerColorId? }

member.emote;       // string | undefined — current emote id (undefined when not emoting)
member.isEmoting;   // boolean
member.jamTrack;    // string | undefined — current jam-track id (SparksSongPart)
member.isJamming;   // boolean

member.readyState;  // 'Ready' | 'NotReady' | 'SittingOut'
member.isReady;     // boolean
member.isSittingOut;// boolean
member.inMatch;     // boolean — PackedState location === 'InGame'
member.matchInfo;   // PartyMemberMatchInfo — { inMatch, playerCount, startedAt: Date | null }

member.battlePass;  // PartyMemberBattlePass | undefined — { purchased, level }
member.level;       // number — battle-pass level (0 when unknown)
member.platform;    // string | undefined — e.g. 'WIN', 'PSN'
member.inputMethod; // string | undefined — e.g. 'MouseAndKeyboard'
member.crowns;      // number — TotalVictoryCrowns loadout stat
member.hasCrown;    // boolean
```

### Writing meta

```ts
member.patchMeta({ 'Default:Key_s': 'value' }, ['Default:Remove_s']);
member.updateMetaKey('Default:Key_s', 'value');    // one key
member.setProp('Default:Key_j', { any: 'object' }); // stringifies + patches
```

### fakeApplyCosmetics
<Badge type="info" text="method" />

```ts
fakeApplyCosmetics(loadout: FakeCosmeticLoadout): Promise<void>
```

Merges the given cosmetics into your `MpLoadout1` party meta. Every field is optional and merged over your current loadout — untouched slots are left as-is. Ids are stored bare (a `Prefix:`, `/path/` or `.suffix` is stripped down to the id), so `CID_028_Athena_Commando_F`, `AthenaCharacter:CID_028_Athena_Commando_F` and a full def path all resolve to the same slot value.

| Field | Slot | Description |
| --- | --- | --- |
| `outfit` | `ac` | Outfit id. |
| `backpack` | `ab` | Back bling id. Pass `'None'`/`''` to clear. |
| `pickaxe` | `ap` | Pickaxe id. |
| `contrail` | `at` | Contrail id. Pass `'None'`/`''` to clear. |
| `shoes` | `as` | Kicks id. Pass `'None'`/`''` to clear. |
| `glider` | `ag` | Glider id. |
| `sidekick` | `mm` | Companion (sidekick) id. Also writes the `CosmeticCompanion:` def into `AthenaCosmeticLoadout`. Pass `'None'`/`''` to clear. |
| `bannerIcon` / `bannerColor` | `li` / `lc` | Banner icon + colour ids. |
| `instruments` | `sb` `sg` `sd` `sk` `sm` | `{ bass, guitar, drums, keytar, microphone }` festival instrument ids. |
| `crowns` | — | Victory-crown count. Writes `TotalVictoryCrowns` / `TotalRoyalRoyales` / `HasCrown` into `LoadoutMeta`. |
| `variants` | — | Per-slot variants, keyed by slot code, e.g. `{ ac: [{ c: 'Material', v: 'Mat2' }] }`. |
| `emote` / `emoji` / `jam` | — | Plays a fake emote / emoji / jam track (see below). Only one is applied per call. |

```ts
await party.me.fakeApplyCosmetics({
  outfit: 'CID_028_Athena_Commando_F',
  backpack: 'BID_004_BlackKnight',
  pickaxe: 'Pickaxe_Lockjaw',
  sidekick: 'PetCarrier_Doggo',
  instruments: { guitar: 'Sparks_Guitar_Cool' },
});
```

### fakeEquip* helpers
<Badge type="info" text="method" />

```ts
fakeEquipOutfit(id) · fakeEquipBackpack(id) · fakeEquipPickaxe(id)
fakeEquipContrail(id) · fakeEquipShoes(id) · fakeEquipGlider(id)
fakeEquipSidekick(id)
fakeInstruments({ bass?, guitar?, drums?, keytar?, microphone? })
```

Single-slot shortcuts for `fakeApplyCosmetics`.

### fakeOutfit
<Badge type="info" text="method" />

```ts
fakeOutfit(id: string, style?: FakeOutfitStyle): Promise<void>
```

Equips an outfit with a full style — corruption/colour variants, a primary/secondary colour swatch, a sticker, and enlightenment (kill-count-driven styles). The colours and sticker are packed into the variant array at the game's fixed indices (`primary` → 3, `secondary` → 4, `sticker` → 13); an `Emoji_*` sticker is auto-prefixed with `AthenaEmoji:`. `enlightenment: [tier, value]` is written to `LoadoutMeta.scratch`, and each call rerolls the loadout salt so the game re-reads the style.

```ts
await party.me.fakeOutfit('CID_028_Athena_Commando_F', {
  colors: { primary: 5, secondary: 12 },
  sticker: 'Emoji_Wow',
  enlightenment: [2, 30],
});
```

### fakeSidekick / fakeSidekickAnim / fakeStopSidekickAnim
<Badge type="info" text="method" />

```ts
fakeSidekick(id: string | null): Promise<void>
fakeSidekickAnim(anim?: SidekickAnimValue | 'None'): Promise<void>
fakeStopSidekickAnim(): Promise<void>
```

Equips a Companion (sidekick) in the `mm` slot and writes the matching `CosmeticCompanion:` def into `AthenaCosmeticLoadout`; pass `null`/`'None'`/`''` to remove it. `fakeSidekickAnim` drives the sidekick's `FrontendMimosa` animation — `SidekickAnim.emote` (`'Emote'`, the default) or `SidekickAnim.interact` (`'Interact'`); `fakeStopSidekickAnim` clears it.

### fakeBanner
<Badge type="info" text="method" />

```ts
fakeBanner(icon: string, color?: string): Promise<void>
```

Sets your banner in all three places the game reads it: `AthenaBannerInfo`, `MpLoadout1` (`li`/`lc`) and `MpLoadout2` (`li`/`lc`). The colour id is normalised to PascalCase (`defaultcolor18` → `DefaultColor18`).

### fakeCrown / fakeLoadoutStats
<Badge type="info" text="method" />

```ts
fakeCrown(wins: number, playEmote?: boolean): Promise<void>
fakeLoadoutStats(values: Record<string, number>): Promise<void>
```

`fakeCrown` shows a crowned-victor crown over your lobby character by writing `TotalVictoryCrowns`, `TotalRoyalRoyales` and `HasCrown` into `LoadoutMeta.stats`. Pass `playEmote: true` to follow the crown patch — after a ~500 ms delay so the crown count applies first — with the **Crowning Achievement** emote (`EID_Coronet`), whose crown scales to the win count you just set. `fakeLoadoutStats` is the general form — merge any `"Key:Value"` stats into `LoadoutMeta` (existing keys are replaced, others left alone).

### fakeJamTrack
<Badge type="info" text="method" />

```ts
fakeJamTrack(trackKey: string, part?: JamPartValue): Promise<void>
```

Plays a Festival **jam track** by its placeholder key. Builds the `SparksSongPart_Placeholder_{key}_{part}` asset and writes it to both `Default:FrontendEmote_j` and `Default:FrontendSparksSongPart_j`. `trackKey` accepts the raw digits or the full `sid_placeholder_430` form (the prefix is stripped). `part` selects the stem — `JamPart.vocals` (`'Vox'`, default), `JamPart.lead`, `JamPart.bass` or `JamPart.drums`. Use `fakeJam` instead when you already have a full jam def path.

### fakeBattlePass / fakeLevel
<Badge type="info" text="method" />

```ts
fakeBattlePass(purchased: boolean, level: number): Promise<void>
fakeLevel(level: number): Promise<void>
```

Sets your `BattlePassInfo`. `fakeLevel` changes only the level, keeping your current purchased flag.

### fakePlatform
<Badge type="info" text="method" />

```ts
fakePlatform(platform: string): Promise<void>
```

Sets the platform icon shown next to you (`WIN`, `PSN`, `XBL`, `SWT`, `AND`, `IOS`, …). The platform type and crossplay pool are derived from the name.

### fakePlaying / fakeSittingOut
<Badge type="info" text="method" />

```ts
fakePlaying(playing?: boolean, playerCount?: number, startedAt?: Date): Promise<void>
fakeSittingOut(sittingOut?: boolean): Promise<void>
```

`fakePlaying` fakes being in a live match — flips `PackedState` to `InGame`/`InBattleRoyale`, sets the remaining-players count and match-start time. `fakeSittingOut` toggles the `SittingOut` matchmaking status.

### fakeEmote / fakeEmoji / fakeStopEmote
<Badge type="info" text="method" />

```ts
fakeEmote(id: string): Promise<void>
fakeEmoji(id: string): Promise<void>
fakeStopEmote(): Promise<void>
```

Play a fake emote or emoji by id (`EID_…` / `Emoji_…`) or a full def path, or clear it. Both write `Default:FrontendEmote_j`; `fakeEmoji` builds the `Dances/Emoji/…` path.

### fakeJam
<Badge type="info" text="method" />

```ts
fakeJam(id: string): Promise<void>
```

Plays a fake Festival jam track. Writes **both** `Default:FrontendEmote_j` and `Default:FrontendSparksSongPart_j`. Jam tracks don't map to a simple id, so pass the full def path (anything containing `/`); a bare id is treated as an emote path.

### fakeReady
<Badge type="info" text="method" />

```ts
fakeReady(ready?: boolean | ReadyStateValue): Promise<void>
```

Sets your `MatchmakingInfo.readyStatus`. Pass `true`/`false`, or a `ReadyState` value (`ReadyState.Ready` / `NotReady` / `SittingOut`).

## Lifecycle & privacy

Beyond reading and patching meta, a `Party` can be created, joined, left and re-configured. The stateful helpers on `Party` (below) handle the revision for you; creating and joining need a live XMPP connection, so those live on the [`LiveClient`](/epic/live#methods) (`bot.createParty()`, `bot.joinParty(id)`, `bot.joinFriend(id)`), which fills the connection id from your XMPP JID.

### leave / invite

```ts
leave(): Promise<void>
invite(accountId: string, sendPing?: boolean): Promise<void>
```

`leave` removes you from the party (leaving = kicking yourself). `invite` invites a friend by account id; `sendPing` (default `true`) also sends them a ping so the invite surfaces in-game.

### setPrivacy
<Badge type="info" text="method" />

```ts
setPrivacy(privacy: PartyPrivacyValue | PartyPrivacyPreset): Promise<void>
```

Sets who can see and join the party (leader only). Pass a preset **name** or a full `PartyPrivacyPreset` object. Under the hood it patches both the party config (`urn:epic:cfg:*-perm_s`) and the `Default:PrivacySettings_j` meta key, handling the revision and one stale-revision retry.

```ts
import { PartyPrivacy, PARTY_PRIVACY_LIST, isPartyPrivacy } from 'fnapi-js';

await party.setPrivacy('private');

const choice = 'friends';
if (isPartyPrivacy(choice)) await party.setPrivacy(choice);
```

`PartyPrivacy` presets (also listed in `PARTY_PRIVACY_LIST`):

| Preset | Party type | Who can join |
| --- | --- | --- |
| `public` | `Public` | Anyone, any member can invite. |
| `friendsOfFriends` | `FriendsOnly` | Friends of any member. |
| `friends` | `FriendsOnly` | The leader's friends only. |
| `privateOfFriends` | `Private` | Invite-only, any member can invite. |
| `private` | `Private` | Invite-only, leader invites only. |

### setConfig
<Badge type="info" text="method" />

```ts
setConfig(patch: Record<string, unknown>): Promise<void>
```

Patches raw party config keys (leader only) — the general form behind `setPrivacy`.

### Creating & joining (LiveClient)

```ts
const bot = await session.live();

const party = await bot.createParty({ maxSize: 16, joinConfirmation: true });
await party.setPrivacy('friends');

await bot.joinFriend('a1b2c3…');   // reads the friend's presence join_info
await bot.joinParty('party-id');   // join by id directly
await bot.leaveParty();
```

`PartyConfig` accepts `{ discoverability?, joinability?, joinConfirmation?, maxSize?, chatEnabled? }`. See [Live Bot](/epic/live) for the full join/accept surface and the party notification events.

## PartyClient
<Badge type="tip" text="class" />

The low-level endpoint client on `client.party` — for when you want the raw calls with explicit tokens/ids.

```ts
client.party.userParties(accessToken, accountId)
client.party.updateParty(accessToken, partyId, { revision, meta })
client.party.updateMemberMeta(accessToken, partyId, accountId, { revision, update, delete })
client.party.promote(accessToken, partyId, memberId)
client.party.kick(accessToken, partyId, accountId)     // leave = kick yourself
client.party.invite(accessToken, partyId, friendId, sendPing?)
client.party.requestToJoin(accessToken, friendId, accountId)
client.party.pings(accessToken, accountId, pingerId)

client.party.create(accessToken, identity, config?)          // identity: { accountId, connectionId, displayName, platform?, buildId? }
client.party.joinById(accessToken, partyId, identity)
client.party.confirmMember(accessToken, partyId, accountId)   // approve a join request
client.party.rejectMember(accessToken, partyId, accountId)    // reject a join request
client.party.declineInvite(accessToken, partyId, accountId)
client.party.sendIntention(accessToken, targetId, accountId)  // ask to join
client.party.leave(accessToken, partyId, accountId)
```

`PARTY_BUILD_ID` and `PARTY_DEFAULT_PLATFORM` are exported for the `identity` payload.

---

# FriendsManager

Manage an account's Epic **friends list**, incoming/outgoing requests, per-friend nicknames and notes, and the blocklist over the friends service. Exposed as `client.friends` on `EpicGamesClient`, and mirrored with account-scoped convenience methods on a live `EpicAuthSession`. Every method requires a bearer token and the account id whose friends list is being read or changed.

```ts
import { EpicGamesClient } from 'fnapi-js';

const epic = new EpicGamesClient();
const session = await epic.loginWithDeviceAuth(creds);

const summary = await session.friendsSummary();
console.log(`${summary.friends.length} friends, ${summary.incoming.length} incoming`);

const friends = await session.friendsListResolved();
for (const friend of friends) {
  console.log(`${friend.displayName ?? friend.accountId}${friend.nickname ? ` "${friend.nickname}"` : ''}`);
}

await session.addFriend(targetAccountId);
await session.setFriendNickname(targetAccountId, 'best pal');
```

::: tip Session convenience methods
On an `EpicAuthSession` the account id is filled in from the signed-in account, so you call `session.friendsList()` instead of `client.friends.list(accessToken, accountId)`. Both are listed below.
:::

::: info nickname vs the wire `alias`
Epic's friends service calls this field `alias` on the wire (endpoint `.../friends/:id/alias`). The SDK normalizes it to `nickname` on every entry it returns and accepts `nickname` on writes, so you only ever deal with `nickname`.
:::

## friends.summary
<Badge type="info" text="method" />

```ts
summary(accessToken: string, accountId: string, options?: { signal?: AbortSignal }): Promise<FriendsSummary>
```

Fetches the full friends snapshot in one request — friends, incoming, outgoing, suggested, blocklist, settings, and which limits have been reached.

| Parameter | Type | Description |
| --- | --- | --- |
| `accessToken` | `string` | Bearer token. |
| `accountId` | `string` | The account whose summary to read. |
| `options` | `{ signal?: AbortSignal }` | Optional abort signal. |

**Returns:** `Promise<FriendsSummary>` · **Session:** `session.friendsSummary()`

## friends.list
<Badge type="info" text="method" />

```ts
list(accessToken: string, accountId: string, options?: { signal?: AbortSignal }): Promise<FriendEntry[]>
```

Lists accepted friends. **Session:** `session.friendsList()`

## friends.listResolved / friends.resolveEntries
<Badge type="info" text="method" />

```ts
listResolved(accessToken: string, accountId: string, options?: { signal?: AbortSignal }): Promise<ResolvedFriendEntry[]>
resolveEntries(accessToken: string, entries: FriendEntry[], options?: { signal?: AbortSignal }): Promise<ResolvedFriendEntry[]>
```

Fetch (or take) friend entries and resolve every `accountId` to its Epic display name in one batched account lookup, returning `ResolvedFriendEntry[]` with `displayName` and the full `account` attached. `resolveEntries` reuses a list you already have; `listResolved` fetches the friends list first. Account ids are deduped and chunked by 100 automatically.

Both require the `FriendsManager` to be wired with an `AccountManager`. `client.friends` already is; a hand-built `new FriendsManager(rest)` without one throws `ConfigurationError`. **Session:** `session.friendsListResolved()`, `session.resolveFriends(entries)`.

## friends.incoming / friends.outgoing / friends.suggested
<Badge type="info" text="method" />

```ts
incoming(accessToken, accountId, options?): Promise<FriendEntry[]>
outgoing(accessToken, accountId, options?): Promise<FriendEntry[]>
suggested(accessToken, accountId, options?): Promise<FriendEntry[]>
```

Pending incoming requests, pending outgoing requests, and suggested friends. **Session:** `session.incomingFriendRequests()`, `session.outgoingFriendRequests()`, `session.suggestedFriends()`.

## friends.acceptBulk
<Badge type="info" text="method" />

```ts
acceptBulk(accessToken: string, accountId: string, targetIds: string[], options?: { signal?: AbortSignal }): Promise<string[]>
```

Accepts several incoming requests at once. The ids are sent as a single comma-joined `targetIds` query param; the returned array holds the ids that were accepted.

| Parameter | Type | Description |
| --- | --- | --- |
| `targetIds` | `string[]` | Account ids to accept. Must be non-empty. |

**Returns:** `Promise<string[]>` · **Session:** `session.acceptFriendRequests(targetIds)`

::: tip Note
Throws `ValidationError` when `targetIds` is empty.
:::

## friends.clearAll
<Badge type="info" text="method" />

```ts
clearAll(accessToken: string, accountId: string, options?: { signal?: AbortSignal }): Promise<void>
```

Removes **all** friends. **Session:** `session.clearFriends()`

## friends.get
<Badge type="info" text="method" />

```ts
get(accessToken: string, accountId: string, friendId: string, options?: { signal?: AbortSignal }): Promise<FriendEntry>
```

Fetches a single friendship, including its `nickname`, `note`, `mutual` count, and `created` timestamp. **Session:** `session.friend(friendId)`

## friends.add
<Badge type="info" text="method" />

```ts
add(accessToken: string, accountId: string, friendId: string, options?: FriendAddOptions): Promise<void>
```

Sends a friend request (or accepts a pending one from `friendId`). Pass `{ pin }` only when a parental-controls PIN is required — it is sent as a JSON body; without it the request has no body.

| Parameter | Type | Description |
| --- | --- | --- |
| `friendId` | `string` | The account to add. |
| `options.pin` | `string` | Optional parental-controls PIN. |

**Session:** `session.addFriend(friendId, { pin? })`

## friends.remove
<Badge type="info" text="method" />

```ts
remove(accessToken: string, accountId: string, friendId: string, options?: { signal?: AbortSignal }): Promise<void>
```

Removes a friend, or cancels/declines a pending request. **Session:** `session.removeFriend(friendId)`

## friends.mutual
<Badge type="info" text="method" />

```ts
mutual(accessToken: string, accountId: string, friendId: string, options?: { signal?: AbortSignal }): Promise<string[]>
```

Returns the account ids you and `friendId` have in common. **Session:** `session.mutualFriends(friendId)`

## friends.setNickname / friends.setNote
<Badge type="info" text="method" />

```ts
setNickname(accessToken, accountId, friendId, nickname: string, options?): Promise<void>
setNote(accessToken, accountId, friendId, note: string, options?): Promise<void>
```

Set a private per-friend nickname or note. Both send the value as a `text/plain` body. **Session:** `session.setFriendNickname(friendId, nickname)`, `session.setFriendNote(friendId, note)`.

::: warning text/plain body
Nickname and note are written with a raw `text/plain` request body — not JSON. A blank nickname/note throws `ValidationError`; use `removeNickname` / `removeNote` to clear one.
:::

## friends.removeNickname / friends.removeNote
<Badge type="info" text="method" />

```ts
removeNickname(accessToken, accountId, friendId, options?): Promise<void>
removeNote(accessToken, accountId, friendId, options?): Promise<void>
```

Clear the nickname or note. **Session:** `session.removeFriendNickname(friendId)`, `session.removeFriendNote(friendId)`.

## friends.blocklist
<Badge type="info" text="method" />

```ts
blocklist(accessToken: string, accountId: string, options?: { signal?: AbortSignal }): Promise<BlocklistEntry[]>
```

Lists blocked accounts. **Session:** `session.blocklist()`

## friends.block / friends.unblock
<Badge type="info" text="method" />

```ts
block(accessToken, accountId, userId: string, options?): Promise<void>
unblock(accessToken, accountId, userId: string, options?): Promise<void>
```

Block or unblock an account. **Session:** `session.blockAccount(userId)`, `session.unblockAccount(userId)`.

## FriendsSummary
<Badge type="tip" text="interface" />

```ts
interface FriendsSummary {
  friends: FriendEntry[];
  incoming: FriendEntry[];
  outgoing: FriendEntry[];
  suggested: FriendEntry[];
  blocklist: BlocklistEntry[];
  settings: FriendSettings;
  limitsReached: FriendsLimitsReached;
}
```

## FriendEntry
<Badge type="tip" text="interface" />

```ts
interface FriendEntry {
  accountId: string;
  groups?: string[];
  mutual?: number;
  nickname?: string;
  note?: string;
  favorite?: boolean;
  created?: string;
}
```

A single friendship. `nickname` and `note` are private to you; `mutual` is the shared-friend count; `created` is an ISO timestamp.

## ResolvedFriendEntry
<Badge type="tip" text="interface" />

```ts
interface ResolvedFriendEntry extends FriendEntry {
  displayName?: string;
  account?: EpicAccount;
}
```

A `FriendEntry` with the account's current `displayName` and full `account` attached, as returned by `listResolved` / `resolveEntries`. Both stay `undefined` when the account id could not be resolved.

## BlocklistEntry
<Badge type="tip" text="interface" />

```ts
interface BlocklistEntry { accountId: string; created: string; }
```

## FriendSettings / FriendsLimitsReached / FriendAddOptions
<Badge type="tip" text="interface" />

```ts
interface FriendSettings { acceptInvites?: string; mutualPrivacy?: string; }
interface FriendsLimitsReached { incoming: boolean; outgoing: boolean; accepted: boolean; }
interface FriendAddOptions { pin?: string; signal?: AbortSignal; }
```

---

# Habanero (Ranked)

Read Fortnite **ranked** (competitive) data from the FN-Habanero service — the ranked seasons ("tracks"), their divisions, and a player's progress within a track. Exposed as `client.habanero` on `EpicGamesClient`, and mirrored with `ranked*` convenience methods on a live `EpicAuthSession`. Every method requires a bearer token.

Ranked seasons are identified by a **track GUID**; each track has a `rankingType` (the mode it belongs to) and a `divisionCount`. Progress is expressed as the player's `currentDivision` / `highestDivision` and a `promotionProgress` fraction toward the next division.

```ts
import { EpicGamesClient, RankingType } from 'fnapi-js';

const epic = new EpicGamesClient();
const session = await epic.loginWithDeviceAuth(creds);

const tracks = await session.rankedTracks({ rankingType: RankingType.ZeroBuild });
const guid = tracks[0]?.trackguid;

const me = await session.rankedProgress(guid);
console.log(`Division ${me.currentDivision} (peak ${me.highestDivision})`);
```

::: tip Namespace
Every call defaults to the `fortnite` namespace. Override per-call with `options.namespace`, or construct `new HabaneroManager(rest, { namespace })` for a different default.
:::

## Named ranks & standings
<Badge type="info" text="method" />

The raw API only returns division numbers. The session turns them into what players see, using the ladder, mode names and colours from the game's own Habanero data:

```ts
const standings = await session.rankedStandings();
for (const s of standings) {
  const place = s.unrealRank !== null ? `#${s.unrealRank}` : `${Math.round(s.progress * 100)}%`;
  console.log(`${s.mode.name}: ${s.played ? s.current.name : 'Unranked'} ${place}`);
}
// Reload: Unreal #1007
// Battle Royale: Bronze II 48%
```

```ts
rankedCurrentTracks(options?): Promise<HabaneroTrack[]>
rankedStandings(accountId?: string, options?: { history?: boolean; playedOnly?: boolean; signal? }): Promise<RankedStanding[]>
rankedStanding(rankingType: string, accountId?: string, options?): Promise<RankedStanding | null>
rankedStandingsBulk(accountIds: string[], options?: { rankingTypes?: string[]; signal? }): Promise<Map<string, RankedStanding[]>>
```

`rankedCurrentTracks` returns only the tracks running right now (cached for five minutes). `rankedStandings` joins an account's progress with those tracks — played modes first, current modes before legacy ones, then by mode name; `history: true` covers every season the account ever had a track in, `playedOnly` drops tracks with no matches, and `includeLegacy: false` drops legacy modes. `rankedStanding` picks one mode. `rankedStandingsBulk` resolves any number of accounts across the current tracks, 25 per request.

```ts
interface RankedStanding {
  accountId: string;
  rankingType: string;
  mode: RankedModeInfo;          // { name: 'Reload', zeroBuild: null, combined: true, legacy, limited }
  trackguid: string;
  track: HabaneroTrack | null;
  active: boolean;               // the track is running now
  played: boolean;               // false when lastUpdated is the 1970 epoch
  current: RankInfo;
  highest: RankInfo;
  progress: number;              // 0..1 toward the next division, 1 at Unreal
  unrealRank: number | null;     // leaderboard placement once Unreal
  unrealLegend: boolean;         // top 500 Unreal in a mode that has Unreal Legend
  rating: number | null;
  highestRating: number | null;
  lastPlayed: string | null;
}

interface RankInfo {
  division: number;
  divisionCount: number;
  name: string;                  // 'Elite II', 'Unreal', 'Unreal Legend', 'Unranked'
  seasonalName: string | null;   // themed name shown that season, e.g. 'Emperor' in season 35
  tier: RankTier;                // 'bronze' … 'champion' | 'unreal' | 'unreal-legend' | 'unranked'
  subdivision: 1 | 2 | 3 | null;
  colors: { text; background; progressBar; progressBackground };
}
```

### Legacy modes

`mode.legacy` is `true` for ranked modes that are no longer part of the current lineup: the pre-combined Battle Royale / Zero Build and Reload build / zero-build tracks, Fortnite OG, The Getaway, Ballistic, Fall Guys and Rocket Racing. Legacy modes are never hidden by the package — if Epic still returns a track for them (Rocket Racing's runs until its end date) they appear in the standings, sorted after current modes. The current modes are Battle Royale, Reload and Arenas (all combined build / zero-build).

### Unreal Legend

Battle Royale and Reload (the combined tracks) show **Unreal Legend** instead of Unreal for the top of the Unreal leaderboard — the game flags these two modes with `TopTierTopLeaderboardPositions`, and `mode.unrealLegend` mirrors that. Epic does not ship the cut-off in the client, so the package uses the top **500** (`UNREAL_LEGEND_TOP_POSITIONS`); pass `unrealLegendTop` to `rankedStandings` / `rankedStandingsBulk` / `toRankedStanding` to change it. An Unreal Legend standing has `unrealLegend: true`, a `current` rank of tier `unreal-legend`, and keeps `unrealRank`. Peak (`highest`) stays Unreal, since the API does not record a peak placement.

### Seasonal rank names

Some seasons rename the top ranks — in season 35 Elite, Champion and Unreal were shown as Admiral, Grand Moff and Emperor `rankForTrack(division, track)` reads the season from the track's leaderboard id and fills `seasonalName`; `name` always stays the standard ladder name.

### Ladders

Current tracks have **22 divisions**: Bronze, Silver, Gold, Platinum, Diamond, Elite and Champion each with I–III, then Unreal. Older seasons (and Rocket Racing, Fall Guys, OG, The Getaway) use the **18-division** ladder where Elite, Champion and Unreal are single ranks. `rankForDivision(division, divisionCount)` does the mapping on its own; ladders it does not know (some event tracks have 101 divisions) come back as `Division N`.

### Helpers

`rankForDivision`, `unrankedRank`, `rankedMode(rankingType)`, `RANKED_MODES`, `RankTier`, `RANK_TIER_COLORS` and `toRankedStanding(progress, track)` are exported for raw progress you fetched yourself.

## RankingType
<Badge type="tip" text="enum" />

The known ranked modes. Values are the raw `rankingType` strings the service uses.

```ts
RankingType.BattleRoyaleBuild      // 'ranked-br'
RankingType.BattleRoyaleCombined   // 'ranked-br-combined'
RankingType.ZeroBuild              // 'ranked-zb'
RankingType.RocketRacing           // 'delmar-competitive'
RankingType.ReloadBuild            // 'ranked_blastberry_build'
RankingType.ReloadZeroBuild        // 'ranked_blastberry_nobuild'
RankingType.ReloadCombined         // 'ranked-blastberry-combined'
RankingType.Ballistic              // 'ranked-feral'
RankingType.OgBuild                // 'ranked-figment-build'
RankingType.OgZeroBuild            // 'ranked-figment-nobuild'
RankingType.Getaway                // 'ranked-bling'
RankingType.GetawayZeroBuild       // 'ranked-bling-nobuild'
RankingType.FallGuysCrownJam       // 'ranked-pimlico'
RankingType.Arenas                 // 'ranked-squareclub'
```

`RANKING_TYPES` is the list of all values; `isRankingType(value)` is a type guard. Methods that take a ranking type also accept any raw string, so newly-added modes work before the enum is updated.

## habanero.tracks
<Badge type="info" text="method" />

```ts
tracks(accessToken: string, options?: HabaneroTracksOptions): Promise<HabaneroTrack[]>
```

Lists ranked tracks. Filter with `endsAfter` (ISO date — only tracks ending after it) and `rankingType`.

| Parameter | Type | Description |
| --- | --- | --- |
| `options.endsAfter` | `string` | Only tracks ending after this ISO date. |
| `options.rankingType` | `RankingType \| string` | Filter to one mode. |
| `options.namespace` | `string` | Namespace override. |

**Returns:** `Promise<HabaneroTrack[]>` · **Session:** `session.rankedTracks(options?)`

## habanero.trackByGuid
<Badge type="info" text="method" />

```ts
trackByGuid(accessToken: string, trackguid: string, options?: HabaneroBaseOptions): Promise<HabaneroTrack>
```

Fetches a single track by its GUID. **Session:** `session.rankedTrack(trackguid)`

## habanero.activeTracks
<Badge type="info" text="method" />

```ts
activeTracks(accessToken: string, startDate: string, options?: HabaneroBaseOptions): Promise<HabaneroTrack[]>
```

Lists the tracks active as of `startDate` (ISO date). **Session:** `session.rankedActiveTracks(startDate)`

## habanero.progress
<Badge type="info" text="method" />

```ts
progress(accessToken: string, accountId: string, trackguid: string, options?: HabaneroBaseOptions): Promise<HabaneroProgress>
```

An account's progress within one track.

**Session:** `session.rankedProgress(trackguid, accountId?)` — `accountId` defaults to the signed-in account.

## habanero.allProgress
<Badge type="info" text="method" />

```ts
allProgress(accessToken: string, accountId: string, options?: HabaneroProgressOptions): Promise<HabaneroProgress[]>
```

Every track's progress for an account. `options.endsAfter` limits to tracks ending after the given ISO date.

**Session:** `session.rankedProgressAll(accountId?, options?)`

## habanero.bulkProgress
<Badge type="info" text="method" />

```ts
bulkProgress(accessToken: string, trackguid: string, accountIds: string[], options?: HabaneroBaseOptions): Promise<HabaneroProgress[]>
```

Progress in one track for up to **25** accounts in a single request. The ids are sent as a JSON `{ accountIds }` body.

| Parameter | Type | Description |
| --- | --- | --- |
| `trackguid` | `string` | The track to read. |
| `accountIds` | `string[]` | 1–25 account ids. |

**Returns:** `Promise<HabaneroProgress[]>` · **Session:** `session.rankedProgressBulk(trackguid, accountIds)`

::: tip Note
Throws `ValidationError` when `accountIds` is empty or exceeds 25 (`HABANERO_MAX_BULK_ACCOUNTS`).
:::

## habanero.bulkProgressByRankingType
<Badge type="info" text="method" />

```ts
bulkProgressByRankingType(accessToken: string, rankingType: RankingType | string, accountIds: string[], options?: HabaneroRankingTypeOptions): Promise<HabaneroProgress[]>
```

Like `bulkProgress`, but resolves the current track for a `rankingType` instead of a fixed GUID — the ranking type is a required query param, `accountIds` (max 25) is the JSON body, and `options.endsAfter` is optional.

**Session:** `session.rankedProgressBulkByType(rankingType, accountIds, options?)`

## HabaneroTrack
<Badge type="tip" text="interface" />

```ts
interface HabaneroTrack {
  gameId: string;
  trackguid: string;
  rankingType: string;
  beginTime: string;
  endTime: string;
  divisionCount: number;
  leaderboardTrackingEventId: string;
}
```

A ranked season. `divisionCount` is how many divisions the track has; `beginTime` / `endTime` are ISO timestamps.

## HabaneroProgress
<Badge type="tip" text="interface" />

```ts
interface HabaneroProgress {
  gameId: string;
  trackguid: string;
  accountId: string;
  rankingType: string;
  lastUpdated: string;
  currentDivision: number;
  highestDivision: number;
  promotionProgress: number;
  currentPlayerRanking?: number;
  rankingRating?: number;
  highestRating?: number;
  startDivision?: number;
}
```

An account's standing in a track. `promotionProgress` is a `0..1` fraction toward the next division. `currentPlayerRanking` is the Unreal leaderboard placement and is only present at Unreal; `rankingRating` / `highestRating` are the matchmaking rating (`-1` when the account never played). An account that never played the track has `lastUpdated: "1970-01-01T00:00:00Z"`.

## Options
<Badge type="tip" text="interface" />

```ts
interface HabaneroBaseOptions { namespace?: string; signal?: AbortSignal; }
interface HabaneroTracksOptions extends HabaneroBaseOptions { endsAfter?: string; rankingType?: RankingType | string; }
interface HabaneroProgressOptions extends HabaneroBaseOptions { endsAfter?: string; }
interface HabaneroRankingTypeOptions extends HabaneroBaseOptions { endsAfter?: string; }
```

---

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

---

# Quests

The `QuestBook` reads a player's quests and lays them out the way the game's quest page does. It covers two sources:

- **Battle Royale and every mode**: Reload, LEGO, Festival, Rocket Racing, OG, Fall Guys, Ballistic, Arenas, ranked and events. These come from Epic's EOS quest service (`quest/v3`).
- **Save the World**: these come from the `campaign` profile.

Progress comes from Epic. Quest names, objective text, targets, categories, headers and sort orders come from the game files, through a `QuestCatalog` backed by fn-api.cc's [`/v1/quests`](/fncc/fncc#quests) endpoint.

```ts
import { EpicGamesClient, FnccAPI, QuestBook, QuestCatalog } from 'fnapi-js';

const catalog = new QuestCatalog(new FnccAPI().quests);
const session = await new EpicGamesClient().loginWithDeviceAuth(creds);

const log = await new QuestBook(session, catalog).log({ mode: 'battle-royale' });
for (const category of log.categories) {
  console.log(category.name);
  for (const quest of category.quests) {
    console.log(' ', quest.name, quest.objectives.map((o) => `${o.progress}/${o.target}`).join(' '));
  }
}
```

::: tip One catalog for every account
Quest names and categories are the same for every player, so create **one** `QuestCatalog` and share it between `QuestBook`s.

The catalog loads the whole quest dataset in a single `/v1/quests` request, about half a second, and then answers from memory. When Fortnite updates, call `catalog.refresh()` to load the new build's data; `catalog.build` tells you which build is loaded.
:::

## QuestBook
<Badge type="tip" text="class" />

```ts
new QuestBook(session: EpicAuthSession, catalog?: QuestCatalog)
```

Without a catalog you still get every quest's progress, but `name`, objective text, targets and categories are empty. Passing `enrich: true` without a catalog throws a `ValidationError`.

### log
<Badge type="info" text="method" />

```ts
log(options?: { mode?: QuestMode | QuestMode[]; includeClaimed?: boolean; includeHidden?: boolean; enrich?: boolean; signal?: AbortSignal }): Promise<QuestLog>
```

Returns `{ categories, uncategorized, quests, bundles, schedules, tracked, xp, enriched }`, laid out like the game:

- `categories` are the game's quest categories (`QuestCategoryData`), ordered by their `SortOrder`.
- Each category splits its quests into `headers`, such as "Week 1" or "Daily Challenge Quests", ordered by header sort order.
- Quests inside a header are ordered with unfinished ones first, then by the game's `SortPriority`, then by name.

A quest can sit in more than one category; dailies, for example, also appear under universal dailies. Quests whose tags match no category are listed in `uncategorized`.

`mode` keeps only categories for those modes. Use `QuestMode` for the values: `battle-royale`, `reload`, `lego`, `festival`, `rocket-racing`, `og`, `fall-guys`, `ballistic`, `arenas`, `save-the-world`. Claimed quests and quests the game hides are left out unless you pass `includeClaimed` or `includeHidden`. Hidden quests are:

- granter quests
- tracker quests kept out of the quest page (`includedInCategories: false`)
- old quests still on the account that the current game no longer has any data for

`xp` holds the season number, level, season XP and rested XP from the quest service.

### stw
<Badge type="info" text="method" />

```ts
stw(options?: { includeClaimed?: boolean; enrich?: boolean; signal?: AbortSignal }): Promise<StwQuestLog>
```

Returns the Save the World quest log, grouped by the game's `QuestCategoryTable` (Main Quests, Daily Quests, Side Quests, events and so on) and ordered by category priority. Objective progress comes from the campaign profile's `completion_*` counters.

It returns `{ categories, uncategorized, quests, dailies, dailyRerolls, enriched }`:

- `dailies` are the active STW daily quests, the only ones `reroll` works on. Wargames and Dungeon "dailies" are event quests and can't be rerolled.
- `dailyRerolls` is how many rerolls are left today.

### claim / reroll / track
<Badge type="info" text="method" />

```ts
claim(quest: Quest | string, options?: { selectedRewardIndex?: number }): Promise<MCPResponse>
reroll(quest: Quest | string): Promise<MCPResponse>
track(quests: Array<Quest | string>): Promise<MCPResponse>
```

These use the quest's own profile, `athena` or `campaign`. `reroll` is for STW daily quests (check `stw().dailyRerolls` first; Epic rejects the call when none are left), `track` sets the tracked BR quests, and `claim` claims a finished quest's reward.

## Quest

| Field | Description |
| --- | --- |
| `id`, `templateId`, `profile` | Item guid, template id, and `'athena'` or `'campaign'`. |
| `name`, `description` | Display text from the game files. Story quests often have no name, so `name` falls back to the description (as the game does), then to the first objective's text. |
| `state`, `completed`, `claimed` | `state` is lower-cased (`active`, `claimed`). `completed` is also set when every objective has reached its target. |
| `progress` | 0–1 across all objectives, or `null` when targets are unknown. |
| `objectives` | `{ id, description, progress, target, completed, stage, stageCount }`. `stage`/`stageCount` is the game's "step 1 of 4" display for quest chains. |
| `completionText` | The line the game shows when the quest is done, e.g. "Agreed to help Bastian!". |
| `bundleTemplateId`, `scheduleTemplateId` | The challenge bundle and schedule the quest came from. |
| `expiresAt`, `tracked`, `visible` | Expiry, whether it is tracked, and whether the game shows it. |
| `sortPriority`, `type`, `subtype`, `tags` | Game ordering, quest type and subtype (e.g. `WeeklyChallenge`), and category tags. |

## QuestCatalog
<Badge type="tip" text="class" />

```ts
new QuestCatalog(source?: QuestDataSource | QuestAssetSource, options?: { lang?: string; concurrency?: number; maxRateLimitWaits?: number })
QuestCatalog.from(snapshot: QuestCatalogSnapshot, source?: QuestDataSource | QuestAssetSource): QuestCatalog
export(): Promise<QuestCatalogSnapshot>
refresh(): void
build: string | null
```

There are two kinds of source:

- **`new FnccAPI().quests`** (recommended): loads everything in one request. `lang` picks the text language.
- **`new FnccAPI().assets`**, or anything with `search` and `json`: reads each game file on its own. This needs about a thousand requests on a cold start and waits out rate limits as it goes. Use it only with a mirror that has no `/v1/quests`.

`export()` saves the catalog and `QuestCatalog.from(snapshot)` restores it. A snapshot taken from the quests endpoint is complete and needs no source at all, which is handy for running offline.

```ts
writeFileSync('quest-catalog.json', JSON.stringify(await catalog.export()));
const restored = QuestCatalog.from(JSON.parse(readFileSync('quest-catalog.json', 'utf8')));
```

## Raw session calls

These `EpicAuthSession` methods are available directly:

| Method | Description |
| --- | --- |
| `questProgress()` | The raw `quest/v3` progress. |
| `questLogin(profile?)` | Generates quests (`ClientQuestLogin`). |
| `claimQuestReward(questId, { profile, selectedRewardIndex })` | Claims a quest reward. |
| `rerollDailyQuest(questId, { profile })` | Rerolls a daily quest. The profile defaults to `campaign`. |
| `trackQuests(templateIds)` | Sets the tracked BR quests (`AthenaTrackQuests`). |
| `pinStwQuests(questIds)` | Pins STW quests (`SetPinnedQuests`). |

`epic.quests` (`QuestService`) exposes `progress(eosToken, accountId)`.

---

# PresenceManager

Reads **last-online** presence from Epic's presence service, exposed as `client.presence` on `EpicGamesClient` and mirrored with `lastOnline*` convenience methods on a live `EpicAuthSession`. Every method requires a bearer token.

```ts
import { EpicGamesClient } from 'fnapi-js';

const epic = new EpicGamesClient();
const session = await epic.loginWithDeviceAuth(creds);

const entry = await session.lastOnlineFor();
console.log(entry ? `last online ${entry.last_online}` : 'no record');
```

::: tip Namespace
Calls default to the `Fortnite` namespace. Override per-call with `options.namespace`, or construct `new PresenceManager(rest, { namespace })` for a different default.
:::

## presence.lastOnline
<Badge type="info" text="method" />

```ts
lastOnline(accessToken: string, accountId: string, options?: PresenceOptions): Promise<LastOnlineResponse>
```

Returns the raw last-online map for an account — keyed by account id, each value a list of per-namespace entries.

| Parameter | Type | Description |
| --- | --- | --- |
| `accessToken` | `string` | Bearer token. |
| `accountId` | `string` | Account to read. |
| `options.namespace` | `string` | Namespace override (defaults to `Fortnite`). |

**Returns:** `Promise<LastOnlineResponse>` · **Session:** `session.lastOnline(accountId?)` — `accountId` defaults to the signed-in account.

## presence.lastOnlineFor
<Badge type="info" text="method" />

```ts
lastOnlineFor(accessToken: string, accountId: string, options?: PresenceOptions): Promise<LastOnlineEntry | null>
```

Convenience wrapper that pulls the first entry for the requested account out of the map, or `null` when there is none.

**Session:** `session.lastOnlineFor(accountId?)`

## Types
<Badge type="tip" text="interface" />

```ts
interface LastOnlineEntry {
  namespace?: string;
  last_online: string;
}

type LastOnlineResponse = Record<string, LastOnlineEntry[]>;

interface PresenceOptions {
  namespace?: string;
  signal?: AbortSignal;
}
```

`last_online` is an ISO timestamp. `PRESENCE_BASE_URL` and `PRESENCE_NAMESPACE` are exported for advanced use.

---

# XmppClient (Real-time Presence & Chat)

Epic's social layer runs over **XMPP-on-WebSocket** (`wss://xmpp-service-prod.ol.epicgames.com`). `XmppClient` is a zero-dependency client for that stream: it performs the full SASL handshake, keeps the connection alive, and exposes a typed event emitter for friend **presence**, incoming **chat messages**, and your own XMPP **custom status**.

::: warning In-game status is EOS, not XMPP
Modern Fortnite no longer reads XMPP presence for the **in-game** status line — that comes from EOS presence. To set the status that renders in-game, use [`session.setCustomStatus`](/epic/chat#in-game-custom-status). The XMPP status methods below still publish over XMPP (useful for XMPP-only tooling and receiving friend presence), but do not change the in-game line.
:::

It is reached through a live [`EpicAuthSession`](/epic/session) — `session.connectXmpp()` builds and connects one lazily, wiring token refresh in automatically — or constructed directly with an `accountId` and a `getAccessToken` function. The class is fully standalone and takes an injectable WebSocket factory, so it runs anywhere a `WebSocket` global exists (Node 18+, browsers) or wherever you pass a `ws`-backed factory.

```ts
import { EpicGamesClient } from 'fnapi-js';

const epic = new EpicGamesClient();
const session = await epic.loginWithDeviceAuth(creds);

const xmpp = await session.connectXmpp();
console.log('online as', xmpp.jid);

xmpp.on('presence', (presence) => {
  console.log(presence.accountId, presence.available ? 'online' : 'offline', presence.status?.Status ?? '');
});

xmpp.on('message', (message) => {
  console.log(`${message.accountId}: ${message.body}`);
});

xmpp.setCustomStatus('Playing with fnapi-js');
```

## Session helpers

A few XMPP operations are surfaced directly on `EpicAuthSession` so you rarely touch the client by hand. Each one connects on demand.

| Method | Description |
| --- | --- |
| `session.connectXmpp(options?)` | Connect (or reuse) the XMPP client and return it. |
| `session.disconnectXmpp()` | Close the stream and drop the client. |
| `session.friendPresences()` | Connect if needed and return the cached `FriendPresence[]`. |
| `session.xmpp` | The current `XmppClient` or `null` (no connect). |

`session.logout()` disconnects the XMPP stream before killing the token.

::: tip Setting status
The session no longer wraps the XMPP status setters. To change the **in-game** status line, use [`session.setCustomStatus`](/epic/chat#in-game-custom-status) (EOS presence). To publish an XMPP-only status, connect with `session.connectXmpp()` and call the client methods below (`setCustomStatus`, `setStatus`, `showStatusWhenOffline`, `setAway`, `clearStatus`) directly on the returned `XmppClient`.
:::

## connect
<Badge type="info" text="method" />

```ts
connect(): Promise<void>
```

Opens the WebSocket and drives the RFC 7395 framing handshake: `<open/>` → SASL `PLAIN` auth → stream restart → resource bind → optional session → initial presence. Resolves once the session is bound and the first presence has been sent; rejects (with a `ConfigurationError`) on auth failure, timeout, or an early close. Calling it while already connected is a no-op; concurrent calls share one promise.

## disconnect
<Badge type="info" text="method" />

```ts
disconnect(): Promise<void>
```

Sends an `unavailable` presence and a `<close/>`, then closes the socket. Emits `disconnected`. A `disconnect()` you call yourself is treated as intentional — it never triggers an auto-reconnect.

## Auto-reconnect

Once the session has connected at least once, an **unexpected** stream drop (Epic idle timeout, network blip, token expiry) is recovered automatically: the client waits, reconnects, refreshes the access token via `getAccessToken`, replays the last status you set (including the `away`/`show` indicator and, if you opted in, the persist `<delay>`), and resumes keepalive. It emits a `reconnecting` event before each attempt and a fresh `connected` event once the session is rebound.

| Option | Default | Description |
| --- | --- | --- |
| `autoReconnect` | `true` | Reconnect after an unexpected drop. Set `false` to disable. |
| `reconnectInitialDelayMs` | `1000` | Delay before the first retry; doubles each attempt (exponential backoff). |
| `reconnectMaxDelayMs` | `30000` | Upper bound on the backoff delay. |
| `maxReconnectAttempts` | `0` | Cap on consecutive attempts (`0` = unlimited). Emits `error` when exhausted. |

A keepalive watchdog also catches half-open connections (laptop sleep, Wi-Fi switch, NAT timeout) that never fire a `close` event: if nothing — not even a ping reply — arrives for two `pingIntervalMs` windows, the socket is dropped with code `4000` and the normal reconnect runs. Call `reconnect()` to force a fresh session yourself.

Only unexpected drops reconnect — a `disconnect()` you call yourself does not, and the very first `connect()` still rejects on failure so you can handle initial errors directly. Backoff resets to zero on every successful reconnect. There is **no** periodic re-broadcast: the status is only ever (re)sent on connect, so it is refreshed on every reconnect.

```ts
const xmpp = await session.connectXmpp({ reconnectMaxDelayMs: 10_000 });
xmpp.on('reconnecting', ({ attempt, delay }) => {
  console.log(`reconnect #${attempt} in ${delay}ms`);
});
```

## setStatus
<Badge type="info" text="method" />

```ts
setStatus(input?: SetStatusInput): void
```

Publishes a presence stanza. Fields are merged over the last sent status, so `setStatus({ joinable: true })` keeps your existing status text and playing flag. Pass `online: false` to broadcast `unavailable`, or `raw` to send a fully-formed `FortniteStatus` verbatim.

| Field | Type | Description |
| --- | --- | --- |
| `status` | `string` | Visible status line. |
| `online` | `boolean` | `false` sends `unavailable` (truly offline, no status shown). |
| `away` | `AwayStatus` | Online indicator: `online` (no `<show>`), `away`, or `extended` (`xa`). |
| `show` | `PresenceShow` | Raw `<show>` value (`chat` / `away` / `xa` / `dnd`); overrides `away` if both are set. |
| `playing` | `boolean` | Sets `bIsPlaying` (only added to the payload when you pass it). |
| `joinable` | `boolean` | Sets `bIsJoinable` (only added when you pass it). |
| `voice` | `boolean` | Sets `bHasVoiceSupport` (only added when you pass it). |
| `sessionId` | `string` | Game session id for joins. |
| `productName` | `string` | Advertised product (only added when you pass it). |
| `properties` | `Record<string, unknown>` | Extra presence properties. |
| `raw` | `FortniteStatus` | Send this status object verbatim. |
| `to` | `string` | Direct the presence to a single account id / JID instead of broadcasting. |
| `persistWhileOffline` | `boolean` | Attach a far-future `<delay>` (**off by default**) to keep the status showing after you disconnect. Leave it off for a normal live status. |
| `delayStamp` | `string` | Override the persist timestamp (defaults to `PRESENCE_OFFLINE_PERSIST_STAMP`). |

### Online, away, and offline

Epic's XMPP presence has two independent knobs:

- **The online indicator** — the `<show>` element. `away: 'online'` sends no `<show>` (the green "online" dot), `away: 'away'` sends `<show>away</show>` (idle), `away: 'extended'` sends `<show>xa</show>`. `online: false` is different: it sends `unavailable`, which takes you **truly offline** and shows no status at all.
- **Persistence** — whether the status survives a disconnect (see below).

### The status payload

A plain custom status serializes to the **minimal** `{"Status": "your text"}` — nothing else is injected. This matters: adding `bIsPlaying` / `ProductName` without the full Fortnite `Properties` block makes the payload look like a rich Fortnite presence that fails to parse, which drops you to **offline** in-game. The extra fields (`playing`, `joinable`, `voice`, `sessionId`, `productName`, `properties`) are only serialized when you explicitly pass them, so opt in only if you are building a complete rich presence.

### Directed presence

Set `to` to send the update to one friend only — useful for revealing a status to a specific account without broadcasting it to your whole friends list.

### The `<delay>` element (off by default)

A normal presence — just `<status>` (plus an optional `<show>`) with **no** `<delay>` — is what Epic renders as your live status line while you are connected. This matches how the working reference clients (e.g. rebootpy) send presence, and is the default here.

An [XEP-0203](https://xmpp.org/extensions/xep-0203.html) `<delay>` element marks a presence as *delayed / last-known* delivery. Stamping it in the far future (`9999-12-31T23:59:59.999Z`) is a trick to keep the status pinned to friends after you disconnect. It is **opt-in** because a delayed presence is easily treated as a stale echo and dropped — attaching it by default is exactly what stops the live status from showing.

- `setCustomStatus(text)` → normal live status; shows while online, clears when you disconnect (no `<delay>`).
- `setCustomStatus(text, { persistWhileOffline: true })` → also attach the far-future `<delay>` to keep it visible after disconnect.
- `showStatusWhenOffline(text)` → explicit alias for the `persistWhileOffline: true` behavior.
- `clearStatus()` → blanks the status so friends stop seeing it.

## setCustomStatus / showStatusWhenOffline / setAway / clearStatus / goOnline / goOffline
<Badge type="info" text="method" />

```ts
setCustomStatus(status: string, options?: CustomStatusOptions): void
showStatusWhenOffline(status: string, options?: Omit<CustomStatusOptions, 'persistWhileOffline'>): void
setAway(away: AwayStatus, status?: string): void
clearStatus(): void
goOnline(): void
goOffline(): void
```

Convenience wrappers over `setStatus`. `setCustomStatus` sets the live status line — shown while online, cleared on disconnect — and accepts `away`, `show`, `to`, `persistWhileOffline`, and `delayStamp` (pass `persistWhileOffline: true` to keep it showing after you disconnect); `showStatusWhenOffline` is an explicit alias for that persisted behavior; `setAway` flips the online indicator (`online` / `away` / `extended`), optionally with new status text; `clearStatus` blanks the line and clears the playing/joinable flags; `goOnline`/`goOffline` toggle availability.

```ts
xmpp.setCustomStatus('In a match', { away: 'away' });
xmpp.showStatusWhenOffline('Back later ✌️');
xmpp.setAway('extended', 'AFK');
xmpp.clearStatus();
```

## sendMessage
<Badge type="info" text="method" />

```ts
sendMessage(accountId: string, body: string): void
```

Sends a direct chat message. `accountId` may be a bare id (the domain is appended) or a full JID.

## requestPresence / ping
<Badge type="info" text="method" />

```ts
requestPresence(accountId: string): void
ping(): void
```

`requestPresence` probes a specific friend's presence. `ping` sends a XEP-0199 keepalive; the client already pings on an interval (default 60s) while connected.

## getPresence / presences
<Badge type="info" text="method" />

```ts
getPresence(accountId: string): FriendPresence | null
get presences(): ReadonlyMap<string, FriendPresence>
```

The client caches the latest presence per friend. `presences` is the live cache keyed by account id; `unavailable` friends are removed. The cache clears when the connection closes.

## Events
<Badge type="tip" text="emitter" />

`on` / `once` / `off` register typed listeners.

| Event | Payload | Fired when |
| --- | --- | --- |
| `connected` | `void` | The session is bound and ready. |
| `disconnected` | `{ code, reason }` | The stream closes. |
| `reconnecting` | `{ attempt, delay }` | An auto-reconnect is scheduled after an unexpected drop. |
| `presence` | `FriendPresence` | A friend's presence changes. |
| `message` | `XmppMessage` | A chat message arrives. |
| `stanza` | `XmlNode` | Any parsed stanza (advanced). |
| `raw` | `{ direction, data }` | Every frame in/out (debugging). |
| `error` | `Error` | A non-fatal client error. |

## Types
<Badge type="tip" text="interface" />

```ts
type PresenceShow = 'chat' | 'away' | 'xa' | 'dnd';

type AwayStatus = 'online' | 'away' | 'extended';

type XmppState =
  | 'idle' | 'connecting' | 'authenticating'
  | 'binding' | 'connected' | 'closing' | 'closed';

interface FortniteStatus {
  Status?: string;
  bIsPlaying?: boolean;
  bIsJoinable?: boolean;
  bHasVoiceSupport?: boolean;
  SessionId?: string;
  ProductName?: string;
  Properties?: Record<string, unknown>;
  [key: string]: unknown;
}

interface FriendPresence {
  accountId: string;
  jid: string;
  resource: string | null;
  platform: string | null;
  available: boolean;
  show: PresenceShow | null;
  statusText: string | null;
  status: FortniteStatus | null;
  playing: boolean;
  joinable: boolean;
  receivedAt: string;
}

interface XmppMessage {
  id: string | null;
  from: string;
  accountId: string;
  type: string;
  body: string;
  receivedAt: string;
}

interface SetStatusInput {
  status?: string;
  online?: boolean;
  away?: AwayStatus;
  show?: PresenceShow;
  playing?: boolean;
  joinable?: boolean;
  voice?: boolean;
  sessionId?: string;
  productName?: string;
  properties?: Record<string, unknown>;
  raw?: FortniteStatus;
  to?: string;
  persistWhileOffline?: boolean;
  delayStamp?: string;
}

interface CustomStatusOptions {
  away?: AwayStatus;
  show?: PresenceShow;
  to?: string;
  persistWhileOffline?: boolean;
  delayStamp?: string;
}

interface XmppClientOptions {
  accountId: string;
  getAccessToken: () => string | Promise<string>;
  webSocket?: WebSocketFactory;
  url?: string;
  domain?: string;
  app?: string;
  platform?: string;
  resource?: string;
  connectionTimeoutMs?: number;
  pingIntervalMs?: number;
  initialPresence?: SetStatusInput | false;
  autoReconnect?: boolean;
  reconnectInitialDelayMs?: number;
  reconnectMaxDelayMs?: number;
  maxReconnectAttempts?: number;
  debug?: (direction: 'in' | 'out', data: string) => void;
}
```

`XMPP_WEBSOCKET_URL`, `XMPP_DOMAIN`, `XMPP_SUBPROTOCOL`, `XMPP_DEFAULT_APP`, `XMPP_DEFAULT_PLATFORM`, and `PRESENCE_OFFLINE_PERSIST_STAMP` are exported as constants. The low-level stanza helpers (`buildStanza`, `parseStanza`, `findChild`, `findChildren`, `localName`, `escapeXml`, `unescapeXml`) are exported too for advanced stream work.

## Node without a global WebSocket

Node 18–20 without the `--experimental-websocket` flag has no `WebSocket` global. Pass a factory backed by the [`ws`](https://www.npmjs.com/package/ws) package:

```ts
import WebSocket from 'ws';

const xmpp = await session.connectXmpp({
  webSocket: (url, protocols) => new WebSocket(url, protocols) as never,
});
```

---

# Chat & Live Events

Epic splits social chat across two transports, and `fnapi-js` wires both into [`EpicAuthSession`](/epic/session):

- **Sending** DMs and party messages goes over the **EOS ChatService** (`https://api.epicgames.dev/epic/chat/v1`) with Ed25519-signed message bodies.
- **Receiving** live text — new DMs, party chat, presence — arrives over a **STOMP-over-WebSocket** connection to `wss://connect.epicgames.dev/`. `ConnectClient` speaks that protocol and re-emits each frame as a typed event.

The two are independent: you can send without opening the live stream, and you can listen for incoming messages without sending. A session exposes both so you rarely construct the clients by hand.

```ts
import { EpicGamesClient } from 'fnapi-js';

const epic = new EpicGamesClient();
const session = await epic.loginWithDeviceAuth(creds);

const events = await session.connectEvents();

events.on('friend:message', (dm) => {
  console.log(`DM from ${dm.accountId}: ${dm.body}`);
  void session.sendDM(dm.accountId, `you said: ${dm.body}`);
});

events.on('party:message', (msg) => {
  console.log(`party ${msg.accountId}: ${msg.body}`);
});
```

## Sending messages

Both send helpers connect to the ChatService on demand, register a chat public key the first time, sign the body, and post it.

### sendDM
<Badge type="info" text="method" />

```ts
sendDM(targetAccountId: string, content: string): Promise<ChatSendResult>
```

Sends a direct message. It resolves (or creates) the DM conversation, signs the message with your Ed25519 chat key, and posts it with the signature metadata Epic expects. If the conversation's `isReportable` flag is rejected, it retries once without it.

### sendPartyMessage
<Badge type="info" text="method" />

```ts
sendPartyMessage(content: string): Promise<ChatSendResult>
```

Sends a message to every other member of your current party. Throws a `ValidationError` if you are not in a party or are the only member. Messages are capped just under `CHAT_MAX_MESSAGE_LENGTH` characters.

### chatHistory
<Badge type="info" text="method" />

```ts
chatHistory(targetAccountId: string, options?: { limit?: number; signal?: AbortSignal }): Promise<ChatMessage[]>
```

Fetches previous messages for a DM conversation. Bodies are decoded from their signed base64 envelope back to plain text.

## Live events

`session.connectEvents(options?)` opens (or reuses) the `ConnectClient` and returns it. On connect it publishes your presence so the stream starts delivering events. `session.events` is the current client or `null`, and `session.disconnectEvents()` closes it. `session.logout()` closes the stream automatically.

```ts
const events = await session.connectEvents();
console.log('live connection', events.connection);
```

### Events
<Badge type="tip" text="emitter" />

`on` / `once` / `off` register typed listeners.

| Event | Payload | Fired when |
| --- | --- | --- |
| `connected` | `{ connectionId }` | The STOMP session is established (again after every reconnect). |
| `disconnected` | `{ code, reason }` | The socket closes. |
| `reconnecting` | `{ attempt, delay }` | An auto-reconnect is scheduled after an unexpected drop. |
| `friend:message` | `ConnectFriendMessage` | A DM arrives (body decoded to text). |
| `party:message` | `ConnectPartyMessage` | A party chat message arrives (your own echoes are skipped). |
| `presence` | `ConnectPresenceUpdate` | A friend's presence changes. |
| `frame` / `message` | `ConnectFrame` | Any parsed STOMP frame (advanced). |
| `raw` | `{ direction, data }` | Every frame in/out (debugging). |
| `error` | `Error` | A non-fatal client error. |

Once connected, an **unexpected** drop is recovered automatically with exponential backoff (`reconnectInitialDelayMs` 1000, doubling up to `reconnectMaxDelayMs` 30000; `maxReconnectAttempts` 0 = unlimited), and an `ERROR` frame with status `4019` (stale connection) restarts the session immediately. `onConnected` runs again on every reconnect, which is how the session re-applies your custom status. A `disconnect()` you call yourself never reconnects; `reconnect()` forces a fresh session on demand.

Epic refuses server heartbeats on this stream (`4005 Invalid heartbeat`), so a silently dead socket cannot be detected from the socket alone. The session covers this through its 30s presence re-send: when Epic answers `user_is_not_effectively_connected`, the session calls `reconnect()` for you.

## In-game custom status
<Badge type="info" text="method" />

```ts
setCustomStatus(status: string, options?: { onlineType?: string; signal?: AbortSignal }): Promise<EosOwnPresence | null>
clearCustomStatus(options?: { signal?: AbortSignal }): Promise<EosOwnPresence | null>
get customStatus(): string | null
```

Publish the friend-facing status text that modern Fortnite renders in-game (the line that otherwise reads *"In the launcher"*). This is **EOS presence**, not XMPP: the status string is sent as `activity.value` on an EOS presence `PATCH` tied to your live connect connection, so `setCustomStatus` opens (or reuses) the connect session for you and the status holds only while that session stays open. `onlineType` accepts `online` (default), `away`, or `xa` (extended away).

Both calls resolve to the presence Epic stored (`own` from the `PATCH` response), so you can confirm the text landed: `presence.perNs[0].activity.value`. The status survives connection loss — it is re-applied on every reconnect, re-sent every 30s, and if Epic reports the connection gone the session reconnects and retries once. `clearCustomStatus` sends an empty `activity` (omitting it would keep the old text); `disconnectEvents` / `logout` also remove it.

```ts
const presence = await session.setCustomStatus('Playing with fnapi-js 🚀');
console.log(presence?.perNs[0]?.activity?.value);
await session.clearCustomStatus();
```

> The XMPP presence path (`session.connectXmpp()` → `XmppClient.setCustomStatus`) still exists for XMPP-only tooling, but Fortnite no longer reads it for the in-game line — use `session.setCustomStatus` (EOS) for anything that must render in-game.

## Types
<Badge type="tip" text="interface" />

```ts
interface ConnectFriendMessage {
  conversationId: string | null;
  accountId: string;
  body: string;
  receivedAt: string;
  raw: Record<string, unknown>;
}

interface ConnectPartyMessage {
  partyId: string | null;
  conversationId: string | null;
  accountId: string;
  body: string;
  receivedAt: string;
  raw: Record<string, unknown>;
}

interface ConnectPresenceUpdate {
  accountId: string;
  payload: Record<string, unknown>;
  receivedAt: string;
}

interface ConnectClientOptions {
  accountId: string;
  getAccessToken: () => string | Promise<string>;
  onConnected?: (connectionId: string) => void | Promise<void>;
  webSocket?: ConnectWebSocketFactory;
  url?: string;
  connectionTimeoutMs?: number;
  autoReconnect?: boolean;
  reconnectInitialDelayMs?: number;
  reconnectMaxDelayMs?: number;
  maxReconnectAttempts?: number;
  debug?: (direction: 'in' | 'out', data: string) => void;
}

interface EosOwnPresence {
  accountId: string;
  status: string;
  perNs: EosPresenceNamespace[];
}

interface EosPresenceNamespace {
  productId?: string;
  appId?: string;
  status: string;
  activity?: { value?: string };
  ns: string;
  props: Record<string, string>;
  conns: Array<{ id: string; props: Record<string, string> }>;
}
```

`CONNECT_WEBSOCKET_URL`, `CONNECT_SUBPROTOCOL`, and `CONNECT_SEC_PROTOCOLS` are exported as constants. The ChatService primitives (`ChatService`, `generateChatKeypair`, `buildSignedMessage`, `decodeMessageBody`, `CHAT_BASE_URL`, `CHAT_MAX_MESSAGE_LENGTH`) are exported for advanced use.

## WebSocket for the connect stream

The connect stream authenticates with an `Authorization` header on the WebSocket upgrade, which browser and Node global `WebSocket` implementations cannot send. When no factory is passed, `ConnectClient` loads the [`ws`](https://www.npmjs.com/package/ws) package on first connect (it is an optional peer dependency — `npm install ws`; discord.js bots already have it). If `ws` cannot be loaded, `connect()` rejects with a `ConfigurationError`.

To supply your own transport (Tauri, Electron renderer bridges, proxies), pass a factory per call or once for every session through the `connectWebSocket` client option. The factory contract is `(url, protocols, options)` where `protocols` is always `undefined` and `options.headers` carries everything the handshake needs — the bearer, `Epic-Connect-Protocol` and the STOMP subprotocol as a `Sec-WebSocket-Protocol` header. Forward `options.headers` and nothing else: Epic never echoes a negotiated subprotocol, so handing one to `ws` as a constructor argument makes it close the socket with "Server sent no subprotocol".

A failure while the handshake is being written — a socket that closed or timed out before its `open` fired — rejects `connect()` (or triggers the normal reconnect once connected) instead of throwing out of the socket's event handler.

```ts
import WebSocket from 'ws';

const epic = new EpicGamesClient({
  connectWebSocket: (url, _protocols, options) =>
    new WebSocket(url, { headers: options?.headers }) as never,
});
```

---

# Live Bot (events)

`session.live()` returns a `LiveClient` — one event-driven object that turns Epic's raw realtime notifications into typed, named events and keeps a self-refreshing view of your party and friends.

Under the hood it wires **both** realtime transports for you:

- **XMPP** carries party and friendship **notifications** (invites, member joins, new captains, incoming friend requests, removals). `LiveClient` decodes each `com.epicgames.social.party.notification.v0.*` / `com.epicgames.friends.core.apiobjects.Friend` body into a typed event.
- **EOS connect** (STOMP) carries **chat and presence** — those are already decoded by [`ConnectClient`](/epic/chat) and re-emitted here as `friend:message`, `party:message` and `presence`.

You never hand-parse a notification string, and accept/decline live directly on the event object.

```ts
import { EpicGamesClient } from 'fnapi-js';

const epic = new EpicGamesClient();
const session = await epic.loginWithDeviceAuth(creds);

const bot = await session.live();

bot.on('friend:request', (request) => {
  console.log(`friend request from ${request.accountId}`);
  void request.accept();
});

bot.on('party:invite', (invite) => {
  console.log(`party invite from ${invite.fromId}`);
  void invite.accept();
});

bot.on('party:member:joined', (event) => {
  console.log(`${event.accountId} joined — party now has ${event.party?.members.length} members`);
});
```

## session.live
<Badge type="info" text="method" />

```ts
live(options?: LiveClientOptions): Promise<LiveClient>
```

Lazily creates the `LiveClient`, connects XMPP + the connect stream, seeds `bot.party` / `bot.friends`, and caches it on the session — a second `session.live()` returns the same instance. `session.liveClient` is the current client (or `null`), and `session.disconnectLive()` clears it and closes both transports. `session.logout()` tears it down automatically.

```ts
interface LiveClientOptions {
  xmpp?: Partial<XmppClientOptions>;      // minus accountId / getAccessToken
  connect?: Partial<ConnectClientOptions>; // minus accountId / getAccessToken
  seedParty?: boolean;                     // default true — fetch current party on start
  seedFriends?: boolean;                   // default true — fetch friends list on start
}
```

## LiveClient
<Badge type="tip" text="class" />

A `TypedEmitter` over `LiveEventMap`. Register listeners with `on` / `once` / `off`; `removeAllListeners()` clears your listeners (the internal transport wiring lives on the XMPP/connect channels, so it stays intact).

### Live state

| Member | Type | Description |
| --- | --- | --- |
| `party` | `Party \| null` | Your current party, re-fetched on every party notification and cleared when you leave or it disbands. |
| `friends` | `ReadonlyMap<string, ResolvedFriendEntry>` | Live friend cache, seeded from the friends list and mutated on `friend:added` / `friend:removed`. |
| `pendingInvites` | `ReadonlyMap<string, PartyInviteEvent>` | Party invites seen this session, keyed by sender account id. |
| `incomingRequests` | `ReadonlyMap<string, FriendRequestEvent>` | Inbound friend requests seen this session, keyed by account id. |

### Methods

| Method | Description |
| --- | --- |
| `start()` | Connect + seed. Called for you by `session.live()`; idempotent, and safe to call again if a previous start failed. |
| `stop()` | Detach from the XMPP / connect channels and clear live state. `session.disconnectLive()` calls it for you. |
| `running` | `true` between a successful `start()` and `stop()`. |
| `refreshParty()` | Force a re-fetch of the current party. |
| `refreshFriends()` | Rebuild the friend cache from the friends list. |
| `createParty(config?)` | Create a fresh party and set it as `bot.party`. |
| `leaveParty()` | Leave the current party and clear `bot.party`. |
| `joinParty(partyId)` | Join a party by id. |
| `joinFriend(accountId)` | Join a friend by reading their presence `join_info`. |
| `acceptInvite(invite \| fromId)` | Accept a pending invite (also on the event's `accept()`). |
| `declineInvite(invite \| fromId)` | Decline a pending invite (also on the event's `decline()`). |

`createParty` / `joinParty` need a live XMPP JID (they fill `join_info.connection.id` from `session.xmpp.jid`), which is why they live on the client, not the stateless [`PartyClient`](/epic/party#partyclient).

## Events
<Badge type="tip" text="emitter" />

| Event | Payload | Fired when |
| --- | --- | --- |
| `connected` | `void` | Both transports are up and state is seeded. |
| `disconnected` | `{ code, reason }` | The XMPP socket closes. |
| `reconnecting` | `{ attempt, delay }` | XMPP scheduled an auto-reconnect after an unexpected drop. |
| `reconnected` | `void` | XMPP is back and the party / friend state has been re-seeded. |
| `error` | `Error` | A non-fatal client/transport error. |
| `notification` | `DecodedNotification` | Every decoded XMPP notification (before the specific event). |
| `party:invite` | `PartyInviteEvent` | Someone invites/pings you into their party. |
| `party:invite:declined` | `PartyInviteDeclinedEvent` | An invite you sent was declined. |
| `party:join:request` | `PartyJoinRequestEvent` | Someone asks to join your party (needs confirmation). |
| `party:member:joined` | `PartyMemberEvent` | A member joins your party. |
| `party:member:left` | `PartyMemberEvent` | A member leaves. |
| `party:member:expired` | `PartyMemberEvent` | A member's connection expires. |
| `party:member:kicked` | `PartyMemberEvent` | A member is kicked. |
| `party:member:connected` | `PartyMemberEvent` | A member's connection comes online. |
| `party:member:disconnected` | `PartyMemberEvent` | A member's connection drops. |
| `party:member:updated` | `PartyMemberEvent` | A member's meta changes. |
| `party:member:promoted` | `PartyMemberEvent` | A member becomes captain. |
| `party:member:confirmation` | `PartyMemberEvent` | A member requires confirmation. |
| `party:updated` | `PartyUpdatedEvent` | The party meta/config changes. |
| `party:disbanded` | `{ partyId }` | You left or were kicked and the party view is cleared. |
| `friend:request` | `FriendRequestEvent` | An inbound (or outbound) friend request. |
| `friend:added` | `FriendAddedEvent` | A friend request is accepted. |
| `friend:removed` | `FriendRemovedEvent` | A friendship is removed/rejected/aborted. |
| `friend:message` | `ConnectFriendMessage` | A DM arrives (via the connect stream). |
| `party:message` | `ConnectPartyMessage` | A party chat message arrives. |
| `presence` | `ConnectPresenceUpdate` | A friend's presence changes. |

Every `party:member:*` and `party:updated` payload carries the freshly re-fetched `party`, so you can read `event.party?.members` without a manual refresh.

## Accept / decline ergonomics

The accept/decline handlers hang off the event object, so a bot can act without threading tokens or ids back through a call:

```ts
bot.on('friend:request', async (request) => {
  if (request.direction === 'INBOUND') await request.accept(); // else request.decline()
});

bot.on('party:invite', async (invite) => {
  const party = await invite.accept();  // joins and returns the Party
  await party?.me?.fakeReady(true);
});

bot.on('party:join:request', async (request) => {
  await request.confirm();               // or request.reject()
});
```

You can also drive them from the lookup maps later:

```ts
for (const request of bot.incomingRequests.values()) await request.accept();
await bot.acceptInvite('a1b2c3…');       // by sender account id
```

## Types
<Badge type="tip" text="interface" />

```ts
interface FriendRequestEvent {
  accountId: string;
  displayName?: string;
  direction: 'INBOUND' | 'OUTBOUND';
  favorite: boolean;
  created: string | null;
  accept(): Promise<void>;
  decline(): Promise<void>;
  raw: RawNotification;
}

interface PartyInviteEvent {
  fromId: string;
  accept(): Promise<Party | null>;
  decline(): Promise<void>;
  raw: RawNotification;
}

interface PartyJoinRequestEvent {
  partyId: string;
  requesterId: string;
  confirm(): Promise<void>;
  reject(): Promise<void>;
  raw: RawNotification;
}

interface PartyMemberEvent {
  partyId: string;
  accountId: string;
  party: Party | null;
  raw: RawNotification;
}
```

`decodeNotification(body)`, the notification-type constants (`PARTY_NOTIFICATION_PREFIX`, `FRIEND_NOTIFICATION_TYPE`, `FRIENDSHIP_REMOVE_TYPE`) and the `DecodedNotification` union are exported for advanced use.

## WebSockets

`LiveClient` connects the same [`XmppClient`](/epic/xmpp) and [`ConnectClient`](/epic/chat) a session builds. XMPP uses the global `WebSocket` (Node 22+, browsers); the connect stream needs header support and loads the [`ws`](https://www.npmjs.com/package/ws) package automatically, so `await session.live()` works with no options on Node. To use your own transports, pass factories through `options.xmpp` / `options.connect`, or set `connectWebSocket` once on the `EpicGamesClient`. When the connect stream cannot attach, `start()` still succeeds over XMPP and emits `error` — set `connectEvents: false` to skip it and read presence through [`session.friendPresences()`](/epic/presence#session-friendpresences).

```ts
import WebSocket from 'ws';

const bot = await session.live({
  xmpp: { webSocket: (url, protocols) => new WebSocket(url, protocols) as never },
});
```

---

# Shop & Gifting

`session.shop()` reads the **real item-shop catalog** off Epic's storefront endpoint and parses it into typed `ShopEntry` objects. A shop entry is gifted directly — find it, call `.gift(friend)` — and multiple entries or receivers can go in one call.

::: tip Real catalog, not the public mirror
This is the live storefront the game itself reads (via MCP / storefront service on your session token), so prices, gift flags and offer ids match what you see in-game. The unauthenticated [`ShopEndpoint`](/fortnite/shop) on `FortniteAPI` is a separate, read-only mirror for display; use it when you don't have a session.
:::

```ts
import { EpicGamesClient } from 'fnapi-js';

const epic = new EpicGamesClient();
const session = await epic.loginWithDeviceAuth(creds);

const shop = await session.shop();
console.log(`${shop.entries.length} offers, expires ${shop.expiration}`);

const skin = shop.find('Renegade Raider');
if (skin?.giftable) {
  await skin.gift('SomeFriendDisplayName', { message: 'gg' });
}
```

## session.shop
<Badge type="info" text="method" />

```ts
shop(options?: ShopFetchOptions): Promise<Shop>
```

Fetches the storefront catalog and returns a `Shop`. `ShopFetchOptions` is `{ signal?, timeout? }`. `session.storefrontCatalog<T>(options?)` returns the raw catalog if you want to parse it yourself, and `session.gifting()` returns a bare [`Gifting`](#gifting) helper for offers that aren't in the current shop.

## Shop
<Badge type="tip" text="class" />

A parsed snapshot of the catalog.

| Member | Type | Description |
| --- | --- | --- |
| `entries` | `ShopEntry[]` | Every offer across all storefronts. |
| `giftable` | `ShopEntry[]` | Only the entries whose `giftInfo` is enabled. |
| `expiration` | `string \| null` | ISO timestamp the shop rotates. |
| `gifting` | `Gifting` | The underlying gifting helper. |
| `raw` | `StorefrontCatalog` | The unparsed catalog. |
| `byOfferId(id)` | `ShopEntry \| null` | Exact offer-id lookup. |
| `find(nameOrOffer)` | `ShopEntry \| null` | Match by offer id, dev name, or display name (exact, then contains). |
| `search(query)` | `ShopEntry[]` | All entries whose dev/display name contains the query. |
| `filter(pred)` | `ShopEntry[]` | Filter entries with your own predicate. |
| `gift(entries, target, options?)` | `Promise<GiftResult[]>` | Gift one or many entries (by object or name/offer) to one or many receivers. |
| `refresh(options?)` | `Promise<this>` | Re-fetch the catalog in place. |

```ts
const shop = await session.shop();

shop.byOfferId('v2:/a1b2c3…');
shop.search('pickaxe');
shop.giftable.map((entry) => entry.name);

await shop.gift(['Renegade Raider', 'Floss'], 'FriendName');  // 2 offers → 1 friend
```

## ShopEntry
<Badge type="tip" text="class" />

One catalog offer.

| Member | Type | Description |
| --- | --- | --- |
| `offerId` | `string` | Catalog offer id (what gifting sends). |
| `devName` | `string` | Epic's internal dev name. |
| `displayName` | `string \| null` | Human title from `title` / `metaInfo`. |
| `name` | `string` | `displayName` if present, else `devName`. |
| `offerType` | `string \| null` | e.g. `StaticPage`. |
| `prices` | `ShopPrice[]` | All price rows. |
| `price` | `ShopPrice \| null` | First price row. |
| `giftable` | `boolean` | Whether `giftInfo` is enabled for this offer. |
| `categories` | `string[]` | Storefront panels the offer sits in. |
| `items` | `ShopItem[]` | `{ templateId, quantity }` grants. |
| `storefront` | `string` | The storefront name it came from. |
| `raw` | `RawCatalogEntry` | The unparsed entry. |
| `priceAt(index)` | `ShopPrice \| null` | A specific price row. |
| `gift(target, options?)` | `Promise<GiftResult>` | Gift this entry (delegates to `Gifting`). |

### gift
<Badge type="info" text="method" />

```ts
gift(target: string | string[], options?: GiftOptions): Promise<GiftResult>
```

Gifts this offer. `target` is an account id **or** a display name (resolved via `session.accountByDisplayName`), or an array of them — duplicates are de-duped and the price is multiplied per receiver. The MCP `GiftCatalogEntry` op runs on `common_core`, and `expectedTotalPrice` is `finalPrice × receivers` unless you override `price`.

```ts
const entry = shop.find('Renegade Raider')!;

await entry.gift('FriendName');
await entry.gift(['FriendA', 'b1c2d3…'], { message: 'enjoy!' });
```

```ts
interface GiftOptions {
  message?: string;             // personalMessage on the gift
  giftWrapTemplateId?: string;  // wrap template (default none)
  priceIndex?: number;          // which price row to charge (default 0)
  currencySubType?: string;     // override the currency subtype
  price?: number;               // override the per-receiver price
  precheck?: boolean;           // check every receiver before sending (default true)
  signal?: AbortSignal;
}
```

Before sending, every receiver is checked with the gift-eligibility endpoint. If anyone can't receive the gift, nothing is sent and a [`ShopError`](#shoperror) says why. Pass `precheck: false` to skip the check; a failed gift still throws a `ShopError`.

### checkGift
<Badge type="info" text="method" />

```ts
checkGift(target: string | string[]): Promise<GiftEligibility[]>
```

Checks each receiver without sending anything. Returns one `{ accountId, offerId, eligible, reason, message, price, items }` per receiver; `reason` is a `ShopErrorReason` such as `already-owned`, or `null` when the receiver is eligible.

```ts
for (const check of await entry.checkGift(['FriendA', 'FriendB'])) {
  console.log(check.accountId, check.eligible ? 'ok' : check.message);
}
```

### purchase
<Badge type="info" text="method" />

```ts
purchase(options?: { quantity?: number; priceIndex?: number; price?: number; currency?: string; currencySubType?: string; signal?: AbortSignal }): Promise<PurchaseResult>
```

Buys the offer for the signed-in account with `PurchaseCatalogEntry`. This **spends V-Bucks**. It resolves to `{ offerId, quantity, totalPrice, items, response }` and throws a `ShopError` such as `not-enough-vbucks` or `already-owned`. `shop.purchase(entryOrName)` does the same from the shop.

## ShopError
<Badge type="tip" text="class" />

Every gift, purchase, refund and creator-code failure is thrown as a `ShopError` with a readable message:

| Field | Description |
| --- | --- |
| `reason` | `not-enough-vbucks`, `already-owned`, `not-friends`, `gifts-disabled`, `recipient-not-eligible`, `gift-limit-reached`, `offer-unavailable`, `refund-unavailable`, `invalid-creator` or `unknown`. |
| `errorCode` | The raw Epic error code. |
| `offerId`, `accountIds` | What the failed action was about. |
| `cause` | The original `EpicApiError`. |

```ts
try {
  await entry.gift('FriendName');
} catch (error) {
  if (error instanceof ShopError) console.log(error.reason, error.message);
}
```

`shopErrorReason(errorCode)` and `toShopError(error, context)` are exported for mapping your own errors.

## Purchases & refunds
<Badge type="info" text="method" />

```ts
session.purchaseHistory(): Promise<PurchaseHistory>
session.refund(purchaseId: string, options?: { quickReturn?: boolean }): Promise<MCPResponse>
```

`purchaseHistory` reads `mtx_purchase_history` from `common_core`: `{ refundCredits, refundsUsed, tokenRefreshReferenceTime, purchases }`. Purchases are newest first, each with `purchaseId`, `offerId`, `purchaseDate`, `totalMtxPaid`, `freeRefundEligible`, `refundType` and the granted `items`.

`refund` returns a purchase with `RefundMtxPurchase`. Pass `quickReturn: true` for the free 24-hour return, which uses no refund ticket. Failures throw a `ShopError` with reason `refund-unavailable`.

```ts
const history = await session.purchaseHistory();
const latest = history.purchases[0];
if (latest?.freeRefundEligible) await session.refund(latest.purchaseId, { quickReturn: true });
```

## Gifting
<Badge type="tip" text="class" />

The standalone helper behind every gift — reach it with `session.gifting()` or `shop.gifting`. Use it to gift an **arbitrary offer id** that isn't in the current shop, or to toggle whether you accept gifts.

| Method | Description |
| --- | --- |
| `gift(offerId, target, options?)` | Gift a raw offer id. Pass `price` in options since there's no catalog row to read. |
| `giftEntry(entry, target, options?)` | Gift a single `ShopEntry`. |
| `giftEntries(entries, target, options?)` | Gift many entries (alias `giftMany`). |
| `setReceiveGiftsEnabled(enabled)` | `SetReceiveGiftsEnabled` — toggle whether others can gift you. |
| `checkEligibility(offer, target)` | Check receivers for any offer id, without sending. |
| `purchase(offerId, { price })` | Buy a raw offer id for yourself. |
| `purchaseEntry(entry, options?)` | Buy a `ShopEntry` for yourself. |

```ts
const gifting = session.gifting();

await gifting.gift('v2:/some_offer', 'FriendName', { price: 1200, currencySubType: 'Currency' });
await gifting.setReceiveGiftsEnabled(true);
```

## Types
<Badge type="tip" text="interface" />

```ts
interface ShopPrice {
  currencyType: string;     // e.g. 'MtxCurrency'
  currencySubType: string;  // e.g. 'Currency'
  basePrice: number;
  regularPrice: number;
  finalPrice: number;
}

interface ShopItem {
  templateId: string;
  quantity: number;
}

interface GiftResult {
  offerId: string;
  receiverAccountIds: string[];
  currencySubType: string;
  totalPrice: number;
  response: MCPResponse;
}
```

`GIFT_CURRENCY`, `GIFT_GAME_CONTEXT` and `GIFT_DEFAULT_CURRENCY_SUBTYPE` are exported as constants for the gift payload shape.

---

# LightswitchManager

Reads Epic's **Lightswitch** service-status feed — whether Fortnite is up, in maintenance, or your account is service-banned. Exposed as `client.lightswitch` on `EpicGamesClient` and mirrored with `serviceStatus*` convenience methods on a live `EpicAuthSession`. Every method requires a bearer token.

```ts
import { EpicGamesClient } from 'fnapi-js';

const epic = new EpicGamesClient();
const session = await epic.loginWithDeviceAuth(creds);

const status = await session.serviceStatus();
console.log(status.status, status.message ?? '');
if (status.banned) console.log('account is service-banned');
```

::: tip Service id
Calls default to the `Fortnite` service. Override per-call with the `serviceId` argument, or construct `new LightswitchManager(rest, bulkRest, { serviceId })` for a different default. The bulk endpoint lives on a separate host (`LIGHTSWITCH_BULK_BASE_URL`).
:::

## lightswitch.status
<Badge type="info" text="method" />

```ts
status(accessToken: string, serviceId?: string, options?: LightswitchOptions): Promise<LightswitchStatus>
```

Fetches the status of a single service.

| Parameter | Type | Description |
| --- | --- | --- |
| `accessToken` | `string` | Bearer token. |
| `serviceId` | `string` | Service to query (defaults to `Fortnite`). |
| `options.signal` | `AbortSignal` | Optional abort signal. |

**Returns:** `Promise<LightswitchStatus>` · **Session:** `session.serviceStatus(serviceId?)`

## lightswitch.statusBulk
<Badge type="info" text="method" />

```ts
statusBulk(accessToken: string, serviceIds: string[], options?: LightswitchOptions): Promise<LightswitchStatus[]>
```

Fetches the status of several services in one call, via the bulk host. The `serviceIds` array must be non-empty and serializes as repeated `serviceId` query params.

**Returns:** `Promise<LightswitchStatus[]>` · **Session:** `session.serviceStatusBulk(serviceIds)`

::: tip Note
Throws `ValidationError` when the array is empty.
:::

## Types
<Badge type="tip" text="interface" />

```ts
interface LightswitchStatus {
  serviceInstanceId: string;
  status: string;
  message?: string;
  maintenanceUri?: string | null;
  overrideCatalogIds?: string[];
  allowedActions?: string[];
  banned?: boolean;
  launcherInfoDTO?: LightswitchLauncherInfo;
}

interface LightswitchLauncherInfo {
  appName?: string;
  catalogItemId?: string;
  namespace?: string;
}

interface LightswitchOptions {
  signal?: AbortSignal;
}
```

`status` is typically `UP` or `DOWN`. `LIGHTSWITCH_BASE_URL`, `LIGHTSWITCH_BULK_BASE_URL`, and `LIGHTSWITCH_SERVICE_ID` are exported for advanced use.

---

# SocialBanManager

Reads Epic's dedicated **social-ban** service (`social-ban-public-service-prod`) — the record of active social bans and warnings on an account (chat, party, and social-feature suspensions). Exposed as `client.socialBan` on `EpicGamesClient` and mirrored with `session.socialBan()` on a live `EpicAuthSession`. It also backs the `social` signal in [`session.checkBan()`](/epic/session#matchmaking). Every method requires a bearer token.

```ts
import { EpicGamesClient } from 'fnapi-js';

const epic = new EpicGamesClient();
const session = await epic.loginWithDeviceAuth(creds);

const status = await session.socialBan();
if (status.active) console.log(status.bans, status.warnings);
```

## socialBan.status
<Badge type="info" text="method" />

```ts
status(accessToken: string, accountId: string, options?: SocialBanOptions): Promise<SocialBanStatus>
```

Fetches the social-ban record for an account.

| Parameter | Type | Description |
| --- | --- | --- |
| `accessToken` | `string` | Bearer token. |
| `accountId` | `string` | Account to query. |
| `options.signal` | `AbortSignal` | Optional abort signal. |

**Returns:** `Promise<SocialBanStatus>` · **Session:** `session.socialBan(accountId?)`

## Types
<Badge type="tip" text="interface" />

```ts
interface SocialBanStatus {
  active: boolean;
  bans: SocialBanEntry[];
  warnings: SocialBanEntry[];
}

interface SocialBanEntry {
  [key: string]: unknown;
}

interface SocialBanOptions {
  signal?: AbortSignal;
}
```

`active` is `true` when the `bans` array is non-empty. The service returns `{ bans: [], warnings: [] }` for a clean account, and may reply with an empty `204` body — both are normalised to empty arrays. Ban and warning entries are typed permissively (`{ [key: string]: unknown }`) because Epic does not publish a schema for populated records. `SOCIAL_BAN_BASE_URL` is exported for advanced use.

---

# StatsProxyManager

Reads Fortnite **StatsV2** data through Epic's stats proxy — per-account stat maps, bulk stat queries, and named leaderboards. Exposed as `client.stats` on `EpicGamesClient` and mirrored on a live `EpicAuthSession`. Every method requires a bearer token.

```ts
import { EpicGamesClient } from 'fnapi-js';

const epic = new EpicGamesClient();
const session = await epic.loginWithDeviceAuth(creds);

const stats = await session.userStats();
console.log(stats ? stats.stats : 'private profile');
```

## stats.userStats
<Badge type="info" text="method" />

```ts
userStats(accessToken: string, accountId: string, options?: UserStatsOptions): Promise<UserStats | null>
```

Fetches the stat map for a single account. Optionally window the read with `startTime` / `endTime` (epoch seconds). Returns `null` when the profile is private (Epic answers `204`).

| Parameter | Type | Description |
| --- | --- | --- |
| `accessToken` | `string` | Bearer token. |
| `accountId` | `string` | Account to read. |
| `options.startTime` | `number` | Window start (epoch seconds). |
| `options.endTime` | `number` | Window end (epoch seconds). |

**Returns:** `Promise<UserStats | null>` · **Session:** `session.userStats(accountId?)`

## stats.userStatsBulk
<Badge type="info" text="method" />

```ts
userStatsBulk(accessToken: string, accountIds: string[], options?: StatsQueryOptions): Promise<UserStats[]>
```

Queries stats for up to a full batch of accounts in one POST. `owners` comes from `accountIds` (must be non-empty); `appId` defaults to `Fortnite`, `startDate` to `0`, `endDate` to the max timestamp. The stats service **requires** an explicit `stats` list (each name is a full stat window key such as `br_placetop1_keyboardmouse_m0_playlist_defaultsolo`) unless you scope the query with a `category` (e.g. `StatsCategory.Fish`) for collection stats.

**Returns:** `Promise<UserStats[]>` · **Session:** `session.userStatsBulk(accountIds, options)`

::: tip Note
Throws `ValidationError` when `accountIds` is empty, or when neither `stats` nor `category` is supplied.
:::

## stats.leaderboard
<Badge type="info" text="method" />

```ts
leaderboard(accessToken: string, leaderboardName: string, options?: LeaderboardOptions): Promise<Leaderboard>
```

Fetches a named leaderboard (e.g. `br_placetop1_keyboardmouse_m0_playlist_defaultsolo`).

**Returns:** `Promise<Leaderboard>` · **Session:** `session.leaderboard(leaderboardName)`

## Types
<Badge type="tip" text="interface" />

```ts
interface UserStats {
  startTime: number;
  endTime: number;
  stats: Record<string, number>;
  accountId: string;
}

interface Leaderboard {
  entries: LeaderboardEntry[];
  maxSize: number;
}

interface LeaderboardEntry {
  account: string;
  value: number;
}

const StatsCategory = {
  Fish: 'collection_fish',
  Character: 'collection_character',
} as const;
```

`STATS_PROXY_BASE_URL`, `STATS_APP_ID`, and `STATS_MAX_TIMESTAMP` are exported for advanced use.

---

# FortniteGameManager

Reads live **game-service** data — the calendar timeline, battle-royale inventory, V-Bucks balance, the current purchase platform, and purchase receipts. Exposed as `client.game` on `EpicGamesClient` and mirrored on a live `EpicAuthSession`. Every method requires a bearer token; the manager talks to the MCP host.

The V-Bucks balance and platform methods read the account's `common_core` profile through MCP `QueryProfile`, exactly like the in-game store does. That profile is **self-only** — Epic returns `403` when you query another account's `common_core`, so the session wrappers always target the signed-in account.

```ts
import { EpicGamesClient } from 'fnapi-js';

const epic = new EpicGamesClient();
const session = await epic.loginWithDeviceAuth(creds);

const balance = await session.vbucksBalance();
console.log('v-bucks:', balance.total, 'on', balance.platform);
for (const entry of balance.entries) {
  console.log(`  ${entry.category}${entry.platform ? ` (${entry.platform})` : ''}: ${entry.amount}`);
}
```

## game.timeline
<Badge type="info" text="method" />

```ts
timeline(accessToken: string, options?: { signal?: AbortSignal }): Promise<Timeline>
```

Fetches the calendar timeline — the per-channel event state Epic uses to drive playlists, shop rotations, and season timers.

**Returns:** `Promise<Timeline>` · **Session:** `session.timeline()`

## game.brInventory
<Badge type="info" text="method" />

```ts
brInventory(accessToken: string, accountId: string, options?: { signal?: AbortSignal }): Promise<BrInventory>
```

Fetches the battle-royale inventory stash for an account — the raw balances (match gold, etc.). This is **not** the V-Bucks balance; use `vbucksBalance` for that.

**Returns:** `Promise<BrInventory>` · **Session:** `session.brInventory(accountId?)`

## game.commonCore
<Badge type="info" text="method" />

```ts
commonCore(accessToken: string, accountId: string, options?: { signal?: AbortSignal }): Promise<CommonCoreProfile>
```

Queries the account's `common_core` MCP profile — the raw source behind the V-Bucks balance and current platform. Self-only: querying another account's `common_core` returns `403`.

**Returns:** `Promise<CommonCoreProfile>` · **Session:** `session.commonCore()`

## game.vbucksBalance
<Badge type="info" text="method" />

```ts
vbucksBalance(accessToken: string, accountId: string, options?: { signal?: AbortSignal }): Promise<VbucksBalance>
```

Sums every `Currency:Mtx*` item in `common_core` into a total plus a per-source breakdown, and reports the account's current purchase platform. Categories map as:

| Template | Category |
| --- | --- |
| `Currency:MtxComplimentary` | Epic Games & Refunds |
| `Currency:MtxGiveaway` | Battlepass & Challenges |
| `Currency:MtxPurchased` | Purchased *(carries a `platform`)* |
| `Currency:MtxSubscription` | Crew |

**Returns:** `Promise<VbucksBalance>` · **Session:** `session.vbucksBalance()`

## game.vbucks
<Badge type="info" text="method" />

```ts
vbucks(accessToken: string, accountId: string, options?: { signal?: AbortSignal }): Promise<number>
```

Convenience wrapper over `vbucksBalance` that returns just the `total`.

**Returns:** `Promise<number>` · **Session:** `session.vbucks()`

## game.mtxPlatform
<Badge type="info" text="method" />

```ts
mtxPlatform(accessToken: string, accountId: string, options?: { signal?: AbortSignal }): Promise<string>
```

Reads the account's current purchase platform (`current_mtx_platform` in `common_core`).

**Returns:** `Promise<string>` · **Session:** `session.mtxPlatform()`

## game.setMtxPlatform
<Badge type="info" text="method" />

```ts
setMtxPlatform(
  accessToken: string,
  accountId: string,
  platform: MtxPlatform | (string & {}),
  options?: { signal?: AbortSignal },
): Promise<CommonCoreProfile | null>
```

Changes the account's purchase platform through the MCP `SetMtxPlatform` operation. Use a value from the `MtxPlatform` enum. Returns the updated `common_core` profile when Epic echoes one back.

```ts
import { MtxPlatform } from 'fnapi-js';

await session.setMtxPlatform(MtxPlatform.PlayStation);
console.log('now buying on', await session.mtxPlatform());
```

**Returns:** `Promise<CommonCoreProfile | null>` · **Session:** `session.setMtxPlatform(platform)`

## game.receipts
<Badge type="info" text="method" />

```ts
receipts(accessToken: string, accountId: string, options?: { signal?: AbortSignal }): Promise<Receipt[]>
```

Fetches the account's purchase receipts across app stores.

**Returns:** `Promise<Receipt[]>` · **Session:** `session.receipts(accountId?)`

## MtxPlatform
<Badge type="tip" text="enum" />

Valid purchase platforms for `setMtxPlatform`. `MTX_PLATFORM_LIST` is the value array and `isMtxPlatform(value)` is the guard.

```ts
const MtxPlatform = {
  WeGame: 'WeGame',
  EpicPCKorea: 'EpicPCKorea',
  Epic: 'Epic',
  EpicPC: 'EpicPC',
  EpicAndroid: 'EpicAndroid',
  PlayStation: 'PSN',
  Xbox: 'Live',
  IOS: 'IOSAppStore',
  Nintendo: 'Nintendo',
  Samsung: 'Samsung',
  GooglePlay: 'GooglePlay',
  Shared: 'Shared',
} as const;
```

## Types
<Badge type="tip" text="interface" />

```ts
interface Timeline {
  channels: Record<string, TimelineChannel>;
  eventsTimeOffsetHrs: number;
  cacheIntervalMins: number;
  currentTime: string;
}

interface BrInventory {
  stash: Record<string, number>;
}

interface CommonCoreItem {
  templateId: string;
  attributes: Record<string, unknown> & { platform?: string };
  quantity: number;
}

interface CommonCoreProfile {
  _id?: string;
  profileId?: string;
  items: Record<string, CommonCoreItem>;
  stats: {
    attributes: Record<string, unknown> & { current_mtx_platform?: string; mtx_affiliate?: string };
  };
}

interface VbucksEntry {
  templateId: string;
  category: string;
  platform?: string;
  amount: number;
}

interface VbucksBalance {
  total: number;
  platform: string;
  entries: VbucksEntry[];
}

interface Receipt {
  appStore: string;
  appStoreId: string;
  receiptId: string;
  receiptInfo: string;
}
```

`accountId` defaults to the signed-in account on every session convenience method; the V-Bucks and platform methods are self-only and take no `accountId`.

---

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

---

# Islands (Content Service)

UEFN islands are published through Epic's content service (`content-service.bfda`). The session wraps the three calls that matter — the cooked package for an island code, its AES key, and launching it on the account — and handles the parts that usually trip people up: the service only accepts a **Valkyrie (UEFN) client** token, the package lookup needs the **client build** major / minor / changelist, and the key comes back base64 while every tool wants hex.

```ts
const session = await epic.loginWithDeviceAuth(creds);

const keys = await session.islandKeys('7865-8305-9184');
console.log(keys[0]?.guid, keys[0]?.key); // 92431145-... 0x2F7A955B...
```

::: tip No setup
The Valkyrie token is minted from the session through an exchange code and cached like the launcher token. The build is read from the launcher's live Fortnite build (cached for five minutes) — the CL the server reports at `/fortnite/api/version` is a different number and the content service rejects it.
:::

## session.islandPackage
<Badge type="info" text="method" />

```ts
islandPackage(linkCode: string, options?: CookedPackageOptions & { build?: { major; minor; changelist } }): Promise<CookedContentPackage>
```

Returns the v4 cooked content package: `status`, `projectId`, `projectFlags` (title, owner, `liveLink` with its version and publish date), every `content` module with its `binaryVersion` and plugin URIs, `isEncrypted`, and `resolved.root` — the module id and version the key belongs to. `options.platform` (default `windows`) and `options.role` (default `client`) pass through; `options.build` skips the launcher lookup.

## session.islandKeys
<Badge type="info" text="method" />

```ts
islandKeys(linkCode: string, options?): Promise<IslandKey[]>
```

Fetches the package and, if it is encrypted, posts the root module to `module/key/batch`. Each `IslandKey` has `moduleId`, `version`, `guid`, the raw `keyBase64` and `key` — the same key as `0x`-prefixed upper-case hex, ready for FModel or CUE4Parse. An unencrypted island returns `[]`.

## session.launchIsland
<Badge type="info" text="method" />

```ts
launchIsland(linkCode: string, options?: { signal?: AbortSignal }): Promise<IslandLaunchResult>
```

Sends the island to the account's game client. `status` is `notified` when Fortnite is running and switched to it, or `queued` when it will load on the next launch.

## ContentServiceManager
<Badge type="tip" text="class" />

`epic.contentService` exposes the raw calls for your own Valkyrie token: `cookedPackage(token, linkCode, build, options?)`, `moduleKeys(token, modules)` and `launch(token, linkCode)`. The helpers `parseFortniteBuild(buildVersion)`, `contentKeyToHex(base64)` and `toIslandKey(entry)` are exported too.

---

# Islands & Links

Every island, playlist and mode set in Fortnite is a **link** in Epic's Links service (`links-public-service-live`). The session looks links up by code and flattens each one into an `Island` summary:

- title, tagline and description, localized when you pass a `locale`
- the creator
- version and state
- tags and genres
- player counts
- images
- age ratings

The session can also list a creator's published islands through the Discovery service and every link on your own account.

```ts
const session = await epic.loginWithDeviceAuth(creds);

const island = await session.island('8567-1055-6605');
console.log(island?.title, 'by', island?.creator.name, island?.players.max);

const trios = await session.island('playlist_trios');
console.log(trios?.type); // 'BR:Playlist'
```

All calls need an account-bound session.

## island
<Badge type="info" text="method" />

```ts
island(code: string, options?: { type?: string; version?: number; includeActivationHistory?: boolean; locale?: string }): Promise<Island | null>
```

Looks up one island or playlist code. It resolves to `null` when the code has no active version or does not exist. Pass `version` for an older published version.

## islands
<Badge type="info" text="method" />

```ts
islands(codes: Array<string | { mnemonic: string; type?: string; version?: number }>, options?: { locale?: string }): Promise<Island[]>
```

Looks up many codes at once, in chunks of 100. Codes that fail to resolve are skipped, so the result can be shorter than the input.

## islandRelated
<Badge type="info" text="method" />

```ts
islandRelated(code: string, options?: { version?: number }): Promise<LinkRelated>
```

Returns the link with its parents and children: `{ parentLinks, links }`. For example, `playlist_trios` sits under the `set_br_playlists` mode set, and a set lists its `sub_link_codes`.

## islandVersions
<Badge type="info" text="method" />

```ts
islandVersions(code: string, options?: { locale?: string }): Promise<Island[]>
```

Returns every published version of a link, newest first.

## creatorIslands
<Badge type="info" text="method" />

```ts
creatorIslands(creatorAccountId: string, options?: { limit?: number; olderThan?: string }): Promise<CreatorPage>
```

Returns a creator's published links from the Discovery service: `{ creatorId, links: [{ linkCode, globalCCU, isFavorite, lockStatus, isVisible }], hasMore }`. `limit` is at most 100. Page with `olderThan`, passing the last `lastActivatedDate`. To get full details, pass the codes to `islands`:

```ts
const page = await session.creatorIslands(island.creator.accountId);
const details = await session.islands(page.links.map((link) => link.linkCode));
```

## myIslands
<Badge type="info" text="method" />

```ts
myIslands(options?: { locale?: string }): Promise<Island[]>
```

Returns every link owned by the signed-in account, including private playtest links. The service only allows an account to list its own links.

## Island

| Field | Description |
| --- | --- |
| `code`, `type` | Link code and type, e.g. `valkyrie:application`, `BR:Playlist`, `ModeSet`. |
| `title`, `tagline`, `description` | Display text, localized when `locale` is passed. |
| `creator` | `{ accountId, name }`. Epic's own links use `epic`. |
| `version`, `active`, `state`, `moderationStatus`, `discoveryIntent` | Publishing state. |
| `tags`, `genres`, `mode` | Description tags, genres and the link mode. |
| `players` | `{ min, max }` from the matchmaking settings. |
| `image`, `images` | The full-size image and every size (`url`, `url_m`, `url_s`, `url_xs`). |
| `ratings` | Age rating per board, e.g. `{ ESRB: 'ESRB_TEEN' }`. |
| `supportCode`, `projectId` | Creator code and UEFN project. |
| `createdAt`, `publishedAt`, `updatedAt`, `lastActivatedAt` | Timestamps. |
| `link` | The raw `LinkMnemonic`. |

## LinksManager
<Badge type="tip" text="class" />

`epic.links` is the low-level client. Each method takes an access token:

- `mnemonic`
- `mnemonics`
- `related`
- `versions`
- `author`
- `creatorPage`

`toIsland(link, locale?)` turns a raw link into an `Island`.

---

# Launcher & Build Info

Everything needed to watch Fortnite builds: the server version, the live client build from the launcher, platform assets with their manifests, and the launcher installers.

```ts
const version = await epic.game.version();
console.log(version.version, version.cln);

const session = await epic.loginWithDeviceAuth(creds);
const build = await session.fortniteBuild();
console.log(build.version, build.changelist, build.buildVersion);
```

## game.version
<Badge type="info" text="method" />

```ts
epic.game.version(options?: { signal?: AbortSignal }): Promise<FortniteVersion>
session.fortniteVersion(options?): Promise<FortniteVersion>
```

`/fortnite/api/version` — no login. Returns the **server** build: `version` (`42.30`), `cln`, `build`, `branch`, `buildDate`, `serverDate` and `moduleName`. The server changelist is usually ahead of the client build; use `fortniteBuild` when you need the version players actually download.

## session.fortniteBuild
<Badge type="info" text="method" />

```ts
fortniteBuild(options?: LauncherBuildOptions): Promise<FortniteBuild>
```

Reads the live Windows build from the launcher and parses it into `{ buildVersion, version, major, minor, changelist, branch }`. Cached for five minutes; pass `cache: false` to bypass.

## session.launcherBuild / session.launcherAssets
<Badge type="info" text="method" />

```ts
launcherBuild(options?: LauncherBuildOptions): Promise<LauncherBuild>
launcherAssets(options?: { platform?; namespace?; label?; signal?; cache? }): Promise<LauncherAsset[]>
```

`launcherBuild` returns the v2 build elements for an app — `buildVersion`, `hash`, `labelName` and the signed `manifests` (CDN uri plus token query params). `LauncherBuildOptions`: `platform` (default `Windows`), `namespace` (`fn`), `catalogItemId` (Fortnite's `4fe75bbc5a674f4f9b356b5c90567da5`), `appName` (`Fortnite`), `label` (`Live`), `signal`, `cache`. `launcherAssets` lists every app in a namespace on a platform with its current `buildVersion`.

Both need a launcherApp token, which the session mints and caches for you. `epic.launcher` exposes the same calls for your own token.

## session.fortniteApk
<Badge type="info" text="method" />

```ts
fortniteApk(options?: Omit<LauncherBuildOptions, 'platform'>): Promise<LauncherApk>
```

The direct Fortnite APK for the live Android build: `{ buildVersion, manifestId, url, sizeBytes }`, where `url` is `https://epicgames-download1.akamaized.net/Builds/Fortnite/Apk/<manifestId>.apk`. `apkFromBuild(element)` derives the same from any Android build element. There is no iOS equivalent — Epic answers `download_info_not_found` for an iOS app binary.

## Platforms and device profiles

`launcherBuild` uses `GET` unless a device profile is given. Android only answers to a `POST` describing the device (`compatible_build_not_found` otherwise), so `platform: 'Android'` sends the built-in `ANDROID_DEVICE_PROFILE` automatically; pass `device` to send your own. iOS has no downloadable build on this endpoint.

## session.launcherAsset
<Badge type="info" text="method" />

```ts
launcherAsset(options?: { platform?; catalogItemId?; appName?; label?; signal?; cache? }): Promise<LauncherAppAsset>
```

The v1 single-app endpoint (`/launcher/api/public/assets/{platform}/{catalogItemId}/{appName}`). It returns one object — `buildVersion`, `expires` and `items` keyed by `MANIFEST` / `CHUNKS`, each with `distribution`, `path`, `signature`, optional `hash` and `additionalDistributions`. It answers for Windows and Switch; Mac, iOS and Android return 404 here with a launcher token.

## launcher.installer
<Badge type="info" text="method" />

```ts
epic.launcher.installer(app: LauncherInstaller | string): Promise<LauncherInstallerDownload>
epic.launcher.installerUrl(app: LauncherInstaller | string): string
```

No login. `installer` follows Epic's redirect without downloading and returns the real file `url` and `fileName`; `installerUrl` builds the redirecting API url. `LauncherInstaller` lists the known apps: `LauncherWindows`, `LauncherMac`, `UnrealEngineWindows`, `UnrealEngineMac`, `EpicGamesStoreAndroid` (the Epic Games Store app — for the Fortnite APK use [`fortniteApk`](#session-fortniteapk)) and `BuildPatchTool`.

---

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

---

# Epic Errors

Every non-2xx response from the Epic account service is thrown as a typed error. `EpicApiError` is the base (a subclass of `FortniteApiError`); `EpicAuthError`, `EpicPermissionError`, `EpicNotFoundError`, and `EpicRateLimitError` are status-specific subclasses. All of them carry the parsed Epic error body plus a human-readable `.description` resolved from the bundled catalog of documented error codes, so a bare `catch (err) { if (err instanceof EpicApiError) ... }` still handles every case while `instanceof` on a subclass lets you branch on the specific failure.

## EpicApiError
<Badge type="tip" text="class" />

```ts
class EpicApiError extends FortniteApiError { status; method; url; body; headers; errorCode; numericErrorCode; messageVars; description }
```

Thrown for failed Epic requests. Exposes HTTP context (`status`, `method`, `url`, `headers`), the raw `body` (`EpicErrorBody | string | null`), and the parsed Epic fields `errorCode`, `numericErrorCode`, and `messageVars`.

```ts
import { FortniteAPI, EpicGamesClient, EpicApiError, EpicAuthError } from 'fnapi-js';

try {
  await epic.accounts.byId(accessToken, accountId);
} catch (err) {
  if (err instanceof EpicApiError) {
    console.error(err.status, err.errorCode);
    console.error(err.description ?? err.message);
  }
}
```

::: tip Note
`description` is the documented, human-readable explanation for `errorCode`, looked up via `describeEpicError` — `null` when the code is unknown or absent.
:::

## EpicAuthError
<Badge type="tip" text="class" />

```ts
class EpicAuthError extends EpicApiError
```

OAuth-specific subclass with the same fields as `EpicApiError`. `createEpicError` returns this when the request hit an `/oauth/` URL or the `errorCode` contains `.oauth.`, so you can distinguish auth failures from general API failures via `instanceof`. This check runs first, so a `403` on an OAuth endpoint stays an `EpicAuthError` rather than an `EpicPermissionError`.

## EpicPermissionError
<Badge type="tip" text="class" />

```ts
class EpicPermissionError extends EpicApiError
```

Thrown when the token is valid but lacks the permission for the request — any `403`, or an `errorCode` containing `missing_permission`, `policy_missing_action`, or `deployment_product_access_forbidden` (the last two are how EOS reports a client-policy gap on a `400`). This is the error you get from `session.listDeviceAuths()` / `getDeviceAuth()` on a device-auth-grant token: that grant carries `CREATE`+`DELETE` on `account:public:account:deviceAuths` but not `READ`. Switch to a client that holds `READ` first — `await (await session.switchClient('fortnitePC')).listDeviceAuths()` (or `'launcherApp'`) — then the same call succeeds.

## EpicNotFoundError
<Badge type="tip" text="class" />

```ts
class EpicNotFoundError extends EpicApiError
```

Thrown for any `404` — an unknown account, missing device auth, or absent resource.

## EpicRateLimitError
<Badge type="tip" text="class" />

```ts
class EpicRateLimitError extends EpicApiError { retryAfterSeconds: number | null }
```

Thrown for a `429`. `retryAfterSeconds` is parsed from the `Retry-After` response header when Epic sends one, otherwise `null`.

## EpicApiErrorContext
<Badge type="tip" text="interface" />

```ts
interface EpicApiErrorContext { status: number; method: string; url: string; body: EpicErrorBody | string | null; headers?: Record<string, string> }
```

Constructor context for the Epic error classes and the input to `createEpicError`. `errorCode`, `numericErrorCode`, `messageVars`, and `description` are derived from `body` by the constructor.

## createEpicError
<Badge type="tip" text="function" />

```ts
createEpicError(context: EpicApiErrorContext): EpicApiError
```

Factory that builds the right error from a failed response. Derives a message from `body.errorMessage`/`error_description`/`error` (or a raw string body), then picks the class in order: `EpicAuthError` for OAuth-flagged requests, `EpicPermissionError` for permission failures (`403` or a permission `errorCode`), `EpicNotFoundError` for `404`, `EpicRateLimitError` for `429`, and `EpicApiError` for everything else.

| Parameter | Type | Description |
| --- | --- | --- |
| `context` | `EpicApiErrorContext` | Status, method, url, parsed/raw body, and optional headers. |

**Returns:** `EpicApiError (or one of the EpicAuthError / EpicPermissionError / EpicNotFoundError / EpicRateLimitError subclasses)`

## describeEpicError
<Badge type="tip" text="function" />

```ts
describeEpicError(errorCode: string | null | undefined): string | null
```

Looks up the documented explanation for an Epic `errorCode` in `EPIC_ERROR_DESCRIPTIONS`. Returns `null` for unknown, null, or undefined codes. This is exactly what populates `EpicApiError.description`.

| Parameter | Type | Description |
| --- | --- | --- |
| `errorCode` | `string \| null \| undefined` | An Epic error code such as `errors.com.epicgames.account.account_not_found`. |

**Returns:** `human-readable description, or null`

```ts
import { describeEpicError } from 'fnapi-js';

const text = describeEpicError('errors.com.epicgames.common.oauth.invalid_token');
// 'There was an issue verifying token eg1~xxx. Token contains invalid data.'
```

## EPIC_ERROR_DESCRIPTIONS
<Badge type="warning" text="constant" />

```ts
const EPIC_ERROR_DESCRIPTIONS: Readonly<Record<string, string>>
```

Bundled catalog of 219 documented Epic error codes mapped to their human-readable descriptions, scoped across the `account`, `accountportal`, `common`, and `oauth` namespaces. Backs `describeEpicError` and the `.description` field on Epic errors.

## EpicErrorBody
<Badge type="tip" text="interface" />

```ts
interface EpicErrorBody { errorCode?: string; errorMessage?: string; messageVars?: string[]; numericErrorCode?: number; error?: string; error_description?: string; [key: string]: unknown }
```

Shape of the JSON body Epic returns on errors. Fields are pulled out onto `EpicApiError`; the index signature keeps any extra Epic-specific keys accessible.

---


# ═══════════════  Dilly (fortniteapi.io)  ═══════════════

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

---


# ═══════════════  Fncc (fn-api.cc)  ═══════════════

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


---

# ═══════════════  Reference  ═══════════════

# Enums

Enums are `as const` string-value objects (plus one numeric bitfield for rarity backend). Each ships a matching value type, an all-caps `*_S` values array, and an `is*` type guard for runtime validation. Import any of them from the package root.

## Language
<Badge type="warning" text="enum" />

```ts
const Language: { Arabic:'ar'; German:'de'; English:'en'; Spanish:'es'; SpanishLatinAmerica:'es-419'; French:'fr'; Indonesian:'id'; Italian:'it'; Japanese:'ja'; Korean:'ko'; Polish:'pl'; PortugueseBrazil:'pt-BR'; Russian:'ru'; Thai:'th'; Turkish:'tr'; Vietnamese:'vi'; ChineseSimplified:'zh-Hans'; ChineseTraditional:'zh-Hant' }
```

Wire language codes accepted by the `language` option on most Fortnite endpoints. Includes the compound codes `es-419`, `pt-BR`, `zh-Hans`, and `zh-Hant`.

```ts
import { FortniteAPI, Language } from 'fnapi-js';

const api = new FortniteAPI();
const { data } = await api.cosmetics.all({ language: Language.PortugueseBrazil });
```

::: tip Note
Values array: `LANGUAGES`. Guard: `isLanguage(value)`.
:::

## Rarity
<Badge type="warning" text="enum" />

```ts
const Rarity: { Common:'common'; Uncommon:'uncommon'; Rare:'rare'; Epic:'epic'; Legendary:'legendary'; Mythic:'mythic'; Dark:'dark'; Dc:'dc'; Frozen:'frozen'; GamingLegends:'gaminglegends'; Icon:'icon'; Lamborghini:'lamborghini'; Lava:'lava'; Marvel:'marvel'; Shadow:'shadow'; Slurp:'slurp'; StarWars:'starwars' }
```

<div><span style="display:inline-flex;align-items:center;gap:5px;font-family:var(--vp-font-family-mono);font-size:12px;padding:2px 9px;margin:2px;border:1px solid var(--vp-c-divider);border-radius:999px"><span style="width:9px;height:9px;border-radius:50%;background:#9aa0ab"></span>common</span> <span style="display:inline-flex;align-items:center;gap:5px;font-family:var(--vp-font-family-mono);font-size:12px;padding:2px 9px;margin:2px;border:1px solid var(--vp-c-divider);border-radius:999px"><span style="width:9px;height:9px;border-radius:50%;background:#4ade80"></span>uncommon</span> <span style="display:inline-flex;align-items:center;gap:5px;font-family:var(--vp-font-family-mono);font-size:12px;padding:2px 9px;margin:2px;border:1px solid var(--vp-c-divider);border-radius:999px"><span style="width:9px;height:9px;border-radius:50%;background:#43a6ff"></span>rare</span> <span style="display:inline-flex;align-items:center;gap:5px;font-family:var(--vp-font-family-mono);font-size:12px;padding:2px 9px;margin:2px;border:1px solid var(--vp-c-divider);border-radius:999px"><span style="width:9px;height:9px;border-radius:50%;background:#b98bff"></span>epic</span> <span style="display:inline-flex;align-items:center;gap:5px;font-family:var(--vp-font-family-mono);font-size:12px;padding:2px 9px;margin:2px;border:1px solid var(--vp-c-divider);border-radius:999px"><span style="width:9px;height:9px;border-radius:50%;background:#f6a13c"></span>legendary</span> <span style="display:inline-flex;align-items:center;gap:5px;font-family:var(--vp-font-family-mono);font-size:12px;padding:2px 9px;margin:2px;border:1px solid var(--vp-c-divider);border-radius:999px"><span style="width:9px;height:9px;border-radius:50%;background:#f5d13b"></span>mythic</span></div>

Display rarity values as returned by fortnite-api.com. Full set: common, uncommon, rare, epic, legendary, mythic, dark, dc, frozen, gaminglegends, icon, lamborghini, lava, marvel, shadow, slurp, starwars.

```ts
import { Rarity, isRarity } from 'fnapi-js';

const value: string = 'legendary';
if (isRarity(value)) {
  const rarity: Rarity = value;
}
```

::: tip Note
Values array: `RARITIES`. Guard: `isRarity(value)`.
:::

## BackendRarity
<Badge type="warning" text="enum" />

```ts
const BackendRarity: { Common:'EFortRarity::Common'; Uncommon:'EFortRarity::Uncommon'; Rare:'EFortRarity::Rare'; Epic:'EFortRarity::Epic'; Legendary:'EFortRarity::Legendary'; Mythic:'EFortRarity::Mythic'; Unattainable:'EFortRarity::Unattainable' }
```

Raw `EFortRarity::*` values as they appear in the game backend, distinct from the display `Rarity` values.

```ts
import { BackendRarity } from 'fnapi-js';

const raw = BackendRarity.Legendary;
```

::: tip Note
Values array: `BACKEND_RARITIES`. Guard: `isBackendRarity(value)`.
:::

## CosmeticType
<Badge type="warning" text="enum" />

```ts
type CosmeticType = 'outfit'|'backpack'|'pickaxe'|'glider'|'contrail'|'emote'|'emoji'|'spray'|'toy'|'wrap'|'loadingscreen'|'music'|'banner'|'pet'|'petcarrier'|'shoe'|'sidekick'|'skin'|'body'|'wheel'|'booster'|'drifttrail'|'guitar'|'bass'|'drum'|'keyboard'|'mic'|'aura'|'legoprop'|'legoset'
```

Friendly cosmetic type keys. Each maps to a backend `Athena*`/`Vehicle*`/`Sparks*`/`Juno*` type via the `COSMETIC_TYPE_BACKEND` table.

```ts
import { CosmeticType, toBackendType, fromBackendType } from 'fnapi-js';

const backend = toBackendType(CosmeticType.outfit); // 'AthenaCharacter'
const key = fromBackendType('AthenaDance'); // 'emote'
```

::: tip Note
Values array: `COSMETIC_TYPES`. Guard: `isCosmeticType(value)`. Convert with `toBackendType(type)` (returns e.g. `AthenaCharacter`) and `fromBackendType(backendType)` (returns the key or `null`).
:::

## CosmeticSeries
<Badge type="warning" text="enum" />

```ts
const CosmeticSeries: { Crew:'CrewSeries'; Dark:'CUBESeries'; Dc:'DCUSeries'; Icon:'CreatorCollabSeries'; Marvel:'MarvelSeries'; StarWars:'ColumbusSeries'; Lamborghini:'Series_Lamborghini'; Ferrari:'Series_Ferrari'; /* ...plus vehicle/brand series */ }
```

Backend series identifiers for cosmetics, covering themed series (Crew, DC, Marvel, Star Wars, Slurp, etc.) and car-brand series (`Series_Ferrari`, `Series_Lamborghini`, `Series_Tesla`, and more).

```ts
import { CosmeticSeries, VEHICLE_SERIES } from 'fnapi-js';

const isCar = VEHICLE_SERIES.includes(CosmeticSeries.Ferrari); // true
```

::: tip Note
Values array: `COSMETIC_SERIES`. Guard: `isCosmeticSeries(value)`. `VEHICLE_SERIES` is a curated subset of the car-brand series (Aston Martin, BMW, Bugatti, Chevrolet, Ferrari, Lamborghini, Porsche, Tesla, etc.).
:::

## AccountType
<Badge type="warning" text="enum" />

```ts
const AccountType: { Epic:'epic'; Psn:'psn'; Xbl:'xbl' }
```

Platform account namespaces for stats lookups: Epic, PlayStation Network, and Xbox Live.

```ts
import { AccountType } from 'fnapi-js';

const platform = AccountType.Psn; // 'psn'
```

::: tip Note
Values array: `ACCOUNT_TYPES`. Guard: `isAccountType(value)`.
:::

## TimeWindow
<Badge type="warning" text="enum" />

```ts
const TimeWindow: { Lifetime:'lifetime'; Season:'season' }
```

Stats aggregation window: `lifetime` totals or current-`season` only.

```ts
import { TimeWindow } from 'fnapi-js';

const window = TimeWindow.Season; // 'season'
```

::: tip Note
Values array: `TIME_WINDOWS`. Guard: `isTimeWindow(value)`.
:::

## StatsImage
<Badge type="warning" text="enum" />

```ts
const StatsImage: { All:'all'; KeyboardMouse:'keyboardMouse'; Gamepad:'gamepad'; Touch:'touch'; None:'none' }
```

Which input-type stats image the stats endpoint should render: all inputs combined, keyboard/mouse, gamepad, touch, or none.

```ts
import { StatsImage } from 'fnapi-js';

const image = StatsImage.KeyboardMouse; // 'keyboardMouse'
```

::: tip Note
Values array: `STATS_IMAGES`. Guard: `isStatsImage(value)`.
:::

## MatchMethod
<Badge type="warning" text="enum" />

```ts
const MatchMethod: { Full:'full'; Contains:'contains'; Starts:'starts'; Ends:'ends' }
```

String match strategy for cosmetic search filters: exact (`full`), substring (`contains`), prefix (`starts`), or suffix (`ends`).

```ts
import { MatchMethod } from 'fnapi-js';

const method = MatchMethod.Contains; // 'contains'
```

::: tip Note
Values array: `MATCH_METHODS`. Guard: `isMatchMethod(value)`.
:::

## KeyFormat
<Badge type="warning" text="enum" />

```ts
const KeyFormat: { Hex:'hex'; Base64:'base64' }
```

Encoding format for AES keys returned by the AES endpoint: hexadecimal or base64.

```ts
import { FortniteAPI, KeyFormat } from 'fnapi-js';

const api = new FortniteAPI();
const { data } = await api.aes.get({ keyFormat: KeyFormat.Base64 });
```

::: tip Note
Values array: `KEY_FORMATS`. Guard: `isKeyFormat(value)`.
:::

---

# Response Flags

`ResponseFlags` is a numeric bitfield that opts extra data into cosmetic responses — asset `path`s, `gameplayTags`, and `shopHistory`. Combine flags with the helpers below and pass the resulting number to endpoints that accept a `responseFlags` option.

## ResponseFlags
<Badge type="warning" text="enum" />

```ts
const ResponseFlags: { None:0; Paths:1; GameplayTags:2; ShopHistory:4 }
```

Bit values controlling optional response fields. `Paths` adds asset paths, `GameplayTags` adds gameplay tag arrays, and `ShopHistory` adds shop appearance history to cosmetic items.

```ts
import { ResponseFlags, combineFlags } from 'fnapi-js';

const flags = combineFlags(ResponseFlags.Paths, ResponseFlags.ShopHistory); // 5
```

::: tip Note
Types: `ResponseFlagName` (keys) and `ResponseFlag` (values).
:::

## ALL_RESPONSE_FLAGS
<Badge type="warning" text="constant" />

```ts
const ALL_RESPONSE_FLAGS: number
```

Convenience value combining every optional flag (`Paths | GameplayTags | ShopHistory`, i.e. `7`).

```ts
import { ALL_RESPONSE_FLAGS } from 'fnapi-js';

const everything = ALL_RESPONSE_FLAGS; // 7
```

## combineFlags
<Badge type="tip" text="function" />

```ts
function combineFlags(...flags: Array<number | string>): number
```

OR-combines any mix of numeric or string flag inputs into a single bitmask. String inputs are parsed via `parseFlags` (decimal or `0x`-prefixed hex).

```ts
import { ResponseFlags, combineFlags } from 'fnapi-js';

const mask = combineFlags(ResponseFlags.Paths, '0x4'); // 5
```

## hasFlag
<Badge type="tip" text="function" />

```ts
function hasFlag(value: number | string, flag: number | string): boolean
```

Returns `true` when `value` contains every bit of `flag`. A zero `flag` always returns `false`.

```ts
import { ResponseFlags, hasFlag } from 'fnapi-js';

hasFlag(5, ResponseFlags.ShopHistory); // true
```

## listFlags
<Badge type="tip" text="function" />

```ts
function listFlags(value: number | string): ResponseFlagName[]
```

Expands a bitmask into the array of set flag names (excluding `None`).

```ts
import { listFlags } from 'fnapi-js';

listFlags(5); // ['Paths', 'ShopHistory']
```

## formatFlags
<Badge type="tip" text="function" />

```ts
function formatFlags(value: number | string): string
```

Formats a bitmask as a lowercase `0x`-prefixed hex string.

```ts
import { formatFlags } from 'fnapi-js';

formatFlags(5); // '0x5'
```

## parseFlags
<Badge type="tip" text="function" />

```ts
function parseFlags(value: number | string): number
```

Coerces a flag input to an integer. Numbers are truncated; strings parse as hex when `0x`-prefixed, otherwise decimal. Invalid input yields `0`.

```ts
import { parseFlags } from 'fnapi-js';

parseFlags('0x7'); // 7
parseFlags('nonsense'); // 0
```

---

# MCP Operations Catalog

MCP (profile) operations are the Fortnite game-service commands that read and mutate a player's profiles — cosmetics, purchases, quests, Save the World data and more. Every operation is the same request shape, so the wrapper exposes a single generic caller (`session.mcpOperation`, `client.mcp.operation`) plus typed helpers for the two query operations. See [MCP Client](/epic/mcp) for the API.

## Endpoint

```
POST https://fngw-mcp-gc-livefn.ol.epicgames.com/fortnite/api/game/v2/profile/{accountId}/{route}/{operation}?profileId={profileId}&rvn=-1
```

Requires a bearer token from an account-bound session. The body is operation-specific JSON (default `{}`). `rvn` (revision number) defaults to `-1`.

## Profiles

| `profileId` | Description |
| --- | --- |
| `athena` | Battle Royale data |
| `creative` | Creative data |
| `campaign` | Save the World data |
| `common_public` | Public data (e.g. current user banner) |
| `collections` | Battle Royale collections (Fishing / NPC) |
| `common_core` | Main profile: banners, purchases, ban status, gift history and more |
| `metadata` | Save the World Homebase data |
| `collection_book_people0` | Collection book: heroes, survivors, defenders |
| `collection_book_schematics0` | Collection book: schematics |
| `outpost0` | STW storage |
| `theater0` | STW backpack |
| `theater1` | Events backpack |
| `theater2` | Ventures data |
| `recycle_bin` | STW recycle bin |

## Routes

| `route` | Description |
| --- | --- |
| `client` | The route you normally use. |
| `public` | Only for `QueryPublicProfile`. |
| `dedicated_server` | Server-only; requires the dedicated-server role you cannot hold. |

## Operations

All 149 operations below can be called through `session.mcpOperation(name, options)` or `client.mcp.operation(accessToken, accountId, name, options)`. Use `isMCPOperation(name)` to validate a name, or `MCP_OPERATIONS` for the full list at runtime.

### Sourcing & refresh

`MCP_OPERATIONS` is generated from [LeleDerGrasshalmi/FortniteEndpointsDocumentation](https://github.com/LeleDerGrasshalmi/FortniteEndpointsDocumentation/tree/main/EpicGames/FN-Service/Game/Profile/Operations) — the same directory Epic's profile operations are documented in. The committed list (`src/epic/mcp-operations.generated.ts`) is what backs the compile-time `MCPOperation` union type and the default runtime allowlist, so nothing depends on the network at import time.

To regenerate the committed list from GitHub, run `npm run generate:mcp` (backed by `tools/generate-mcp-operations.ts`).

To top up the **runtime** allowlist without a rebuild — picking up operations added upstream since your installed version — call `refreshMCPOperations()`. It fetches the directory (via the global `fetch`, or one you pass), unions any new names into the allowlist used by `isMCPOperation`, and returns the names it added. It never removes known operations. `MCPClient` also exposes this as `mcp.refreshOperations()`, and `knownMCPOperations()` returns the current runtime set.

```ts
import { refreshMCPOperations, knownMCPOperations, isMCPOperation } from 'fnapi-js';

const added = await refreshMCPOperations();
console.log(`added ${added.length} new operations`, knownMCPOperations().length);
isMCPOperation(added[0]); // true
```

| Operation | Operation | Operation |
| --- | --- | --- |
| `AbandonExpedition` | `ExchangeGameCurrencyForSeasonPassOffer` | `SetActiveArchetype` |
| `ActivateConsumable` | `ExchangeGiftToken` | `SetActiveHeroLoadout` |
| `AddToCollection` | `FortRerollDailyQuest` | `SetAffiliateName` |
| `ApplyVote` | `GiftCatalogEntry` | `SetCosmeticLockerBanner` |
| `AssignDefenderToLoadout` | `InitializeTheater` | `SetCosmeticLockerName` |
| `AssignGadgetToLoadout` | `IssueFriendCode` | `SetCosmeticLockerSlot` |
| `AssignHeroToLoadout` | `LockProfileForWrite` | `SetCosmeticLockerSlots` |
| `AssignTeamPerkToLoadout` | `MarkCollectedItemsSeen` | `SetCreativePlotMetadata` |
| `AssignWeaponToDefender` | `MarkItemSeen` | `SetFactionChoice` |
| `AssignWorkerToSquad` | `MarkNewQuestNotificationSent` | `SetForcedIntroPlayed` |
| `AssignWorkerToSquadBatch` | `ModifyCreativePlotPermissions` | `SetGameplayStats` |
| `AthenaPinQuest` | `ModifyMission` | `SetHardcoreModifier` |
| `AthenaRemoveQuests` | `ModifyQuickbar` | `SetHeroCosmeticVariants` |
| `AthenaTrackQuests` | `OpenCardPack` | `SetHomebaseBanner` |
| `BulkUpdateCollections` | `OpenCardPackBatch` | `SetHomebaseName` |
| `CancelOrResumeSubscription` | `PopulatePrerolledOffers` | `SetIntroGamePlayed` |
| `ChallengeBundleLevelUp` | `PromoteItem` | `SetItemArchivedStatusBatch` |
| `ClaimCollectedResources` | `ProtoJuno_CreateWorld` | `SetItemFavoriteStatus` |
| `ClaimCollectionBookPageRewards` | `ProtoJuno_DeleteAllWorlds` | `SetItemFavoriteStatusBatch` |
| `ClaimCollectionBookRewards` | `ProtoJuno_DeleteWorld` | `SetLastUsedBattleLabFile` |
| `ClaimImportFriendsReward` | `ProtoJuno_MarkWorldDeleted` | `SetLastUsedCreativePlot` |
| `ClaimLoginReward` | `ProtoJuno_SetWorldName` | `SetLastUsedProject` |
| `ClaimMfaEnabled` | `ProtoJuno_UpdateWorldLastAccessTime` | `SetLoadoutShuffleEnabled` |
| `ClaimMissionAlertRewards` | `ProtoJuno_UpdateWorldMetadata` | `SetMatchmakingBansViewed` |
| `ClaimQuestReward` | `ProtoJuno_UpdateWorldSysMetadata` | `SetMtxPlatform` |
| `ClaimSubscriptionRewards` | `PurchaseCatalogEntry` | `SetPartyAssistQuest` |
| `ClearHeroLoadout` | `PurchaseMultipleCatalogEntries` | `SetPinnedQuests` |
| `ClientQuestLogin` | `PurchaseOrUpgradeHomebaseNode` | `SetRandomCosmeticLoadoutFlag` |
| `CollectExpedition` | `PurchaseResearchStatUpgrade` | `SetReceiveGiftsEnabled` |
| `CompletePlayerSurvey` | `PutModularCosmeticLoadout` | `SetRewardGraphConfig` |
| `ConvertItem` | `QueryProfile` | `SetSeasonPassAutoClaim` |
| `ConvertLegacyAlterations` | `QueryPublicProfile` | `SkipTutorial` |
| `ConvertSlottedItem` | `RecordCampaignMatchEnded` | `StartExpedition` |
| `CopyCosmeticLoadout` | `RecycleItem` | `StorageTransfer` |
| `CraftWorldItem` | `RecycleItemBatch` | `ToggleQuestActiveState` |
| `CreateNewBattleLabFile` | `RedeemRealMoneyPurchases` | `UnassignAllSquads` |
| `CreateNewIsland` | `RedeemResearchToken` | `UnlockProfileForWrite` |
| `CreateNewIslandFromLinkCode` | `RedeemSTWAccoladeTokens` | `UnlockRewardNode` |
| `DeleteBattleLabIsland` | `RefreshExpeditions` | `UnslotItemFromCollectionBook` |
| `DeleteCosmeticLoadout` | `RefundItem` | `UpdatePlotPublishInfo` |
| `DeleteIsland` | `RefundMtxPurchase` | `UpdateQuestClientObjectives` |
| `DeleteModularCosmeticLoadout` | `RemoveGiftBox` | `UpdateQuests` |
| `DepositPostResources` | `ReportConsumableUsed` | `UpgradeAlteration` |
| `DestroyWorldItems` | `RequestRestedStateIncrease` | `UpgradeItem` |
| `DisassembleWorldItems` | `ResearchItemFromCollectionBook` | `UpgradeItemBulk` |
| `DuplicateIsland` | `RespecAlteration` | `UpgradeItemRarity` |
| `EndBattleRoyaleGame` | `RespecResearch` | `UpgradeSlottedItem` |
| `EndBattleRoyaleGameV2` | `RespecUpgrades` | `VerifyRealMoneyPurchase` |
| `EquipModularCosmeticLoadoutPreset` | `RestoreDeletedIsland` | `ExecuteTerminalCommand` |
| `ExchangeGameCurrencyForBattlePassOffer` | `ServerQuestLogin` |  |

---

# Error Classes

All errors extend `FortniteApiError`. HTTP failures throw a specific `HttpError` subclass chosen by status code (via `createHttpError`); transport and validation problems throw the standalone subclasses. `catch` on the base class to handle everything, or `instanceof` a subclass to branch.

## FortniteApiError
<Badge type="tip" text="class" />

```ts
class FortniteApiError extends Error { constructor(message: string, options?: { cause?: unknown }) }
```

Root of the error hierarchy. Every error thrown by the library is an instance of this class.

```ts
import { FortniteApiError } from 'fnapi-js';

try {
  await api.cosmetics.all();
} catch (err) {
  if (err instanceof FortniteApiError) console.error(err.name, err.message);
}
```

## HttpError
<Badge type="tip" text="class" />

```ts
class HttpError extends FortniteApiError { status: number; method: string; url: string; body: unknown; headers: Record<string, string> }
```

Base for all non-2xx HTTP responses. Carries the `status`, `method`, `url`, response `body`, and `headers`.

```ts
import { HttpError } from 'fnapi-js';

try {
  await api.stats.byName('nobody-here');
} catch (err) {
  if (err instanceof HttpError) console.error(err.status, err.url);
}
```

## BadRequestError
<Badge type="tip" text="class" />

```ts
class BadRequestError extends HttpError
```

Thrown on HTTP 400 — the request was malformed or had invalid parameters.

```ts
import { BadRequestError } from 'fnapi-js';
```

## AuthenticationError
<Badge type="tip" text="class" />

```ts
class AuthenticationError extends HttpError
```

Thrown on HTTP 401 — missing or invalid API key for endpoints that require one.

```ts
import { AuthenticationError } from 'fnapi-js';
```

## ForbiddenError
<Badge type="tip" text="class" />

```ts
class ForbiddenError extends HttpError
```

Thrown on HTTP 403 — authenticated but not permitted to access the resource.

```ts
import { ForbiddenError } from 'fnapi-js';
```

## NotFoundError
<Badge type="tip" text="class" />

```ts
class NotFoundError extends HttpError
```

Thrown on HTTP 404 — the requested resource (cosmetic, player, playlist) does not exist.

```ts
import { NotFoundError } from 'fnapi-js';
```

## GoneError
<Badge type="tip" text="class" />

```ts
class GoneError extends HttpError
```

Thrown on HTTP 410 — the resource existed but is no longer available.

```ts
import { GoneError } from 'fnapi-js';
```

## RateLimitError
<Badge type="tip" text="class" />

```ts
class RateLimitError extends HttpError { retryAfter: number | null }
```

Thrown on HTTP 429. `retryAfter` holds the parsed `Retry-After` delay in milliseconds (from seconds or an HTTP date), or `null` when absent.

```ts
import { RateLimitError } from 'fnapi-js';

try {
  await api.cosmetics.all();
} catch (err) {
  if (err instanceof RateLimitError && err.retryAfter) {
    await new Promise((r) => setTimeout(r, err.retryAfter));
  }
}
```

## ServerError
<Badge type="tip" text="class" />

```ts
class ServerError extends HttpError
```

Thrown on any HTTP 5xx — an upstream/server-side failure.

```ts
import { ServerError } from 'fnapi-js';
```

## ValidationError
<Badge type="tip" text="class" />

```ts
class ValidationError extends FortniteApiError { parameter: string | null }
```

Thrown client-side before a request when arguments fail validation. `parameter` names the offending field, or `null` if unspecified.

```ts
import { ValidationError } from 'fnapi-js';

try {
  await api.stats.byName('');
} catch (err) {
  if (err instanceof ValidationError) console.error(err.parameter);
}
```

## TimeoutError
<Badge type="tip" text="class" />

```ts
class TimeoutError extends FortniteApiError { timeout: number; url: string }
```

Thrown when a request exceeds its configured `timeout` (ms). Reports the `timeout` value and the `url`.

```ts
import { TimeoutError } from 'fnapi-js';
```

## AbortError
<Badge type="tip" text="class" />

```ts
class AbortError extends FortniteApiError { url: string }
```

Thrown when a request is cancelled via an external `AbortSignal`. Carries the `url`.

```ts
import { AbortError } from 'fnapi-js';

const controller = new AbortController();
controller.abort();
try {
  await api.cosmetics.all({ signal: controller.signal });
} catch (err) {
  if (err instanceof AbortError) console.log('cancelled', err.url);
}
```

## NetworkError
<Badge type="tip" text="class" />

```ts
class NetworkError extends FortniteApiError { url: string }
```

Thrown when the underlying fetch fails at the transport layer (DNS, connection, offline). The original failure is on `cause`.

```ts
import { NetworkError } from 'fnapi-js';
```

## ParseError
<Badge type="tip" text="class" />

```ts
class ParseError extends FortniteApiError { url: string; raw: string }
```

Thrown when a response body cannot be parsed as expected JSON. `raw` holds the unparsed response text.

```ts
import { ParseError } from 'fnapi-js';
```

## ConflictError
<Badge type="tip" text="class" />

```ts
class ConflictError extends HttpError
```

Thrown on an HTTP `409 Conflict`. Carries the same `status`, `method`, `url`, `body` and `headers` as any `HttpError`.

```ts
import { ConflictError } from 'fnapi-js';
```

## ConfigurationError
<Badge type="tip" text="class" />

```ts
class ConfigurationError extends FortniteApiError { option: string | null }
```

Thrown when the client is asked to do something a safety flag disables — using a **custom auth client** without `allowCustomClients`, or a **custom MCP operation** without `allowCustomMcpOperations`. `option` names the flag you need to set.

```ts
import { ConfigurationError, EpicGamesClient } from 'fnapi-js';

try {
  new EpicGamesClient().client({ name: 'x', clientId: '...', clientSecret: '...' });
} catch (err) {
  if (err instanceof ConfigurationError) {
    console.error(`enable ${err.option} to use this`);
  }
}
```

---

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

---

