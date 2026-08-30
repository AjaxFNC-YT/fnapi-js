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
