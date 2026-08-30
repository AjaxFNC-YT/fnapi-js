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
