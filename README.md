# fnapi-js

Zero-dependency TypeScript wrapper for the public Fortnite APIs, with a complete Epic Games account-service auth, realtime (XMPP/EOS), party, MCP and item-shop/gifting layer.

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)
[![types](https://img.shields.io/badge/types-included-blue.svg)](#)

## Install

```bash
npm install fnapi-js
```

Node 18+. Ships dual ESM/CJS builds and full `.d.ts` types; works identically from TypeScript and plain JavaScript. No runtime dependencies.

## Two halves

Everything is imported from the package root:

```ts
import { FortniteAPI, EpicGamesClient } from 'fnapi-js';
```

- **`FortniteAPI`** — the [fortnite-api.com](https://fortnite-api.com) wrapper: `shop`, `cosmetics`, `aes`, `banners`, `creatorCode` (`sac`), `map`, `news`, `playlists`, `stats`.
- **`EpicGamesClient`** — the Epic Games account service: every OAuth grant, device-code login, device auths, account lookups, sessions with auto-refresh — and on top of a signed-in session: MCP profile operations, the item shop + gifting, friends, party create/join/lifecycle, XMPP + EOS realtime, and an event-driven `LiveClient` bot.

## Quick start

### Fortnite API

```ts
import { FortniteAPI, Language, MatchMethod } from 'fnapi-js';

const client = new FortniteAPI({ language: Language.English });

const shop = await client.shop.get();
console.log(`Shop for ${shop.date} has ${shop.entries.length} entries`);

const renegade = await client.cosmetics.search({
  name: 'Renegade Raider',
  matchMethod: MatchMethod.Full,
});
console.log(`${renegade.name} — ${renegade.rarity.displayValue}`);
```

### Epic Games auth

```ts
import { EpicGamesClient } from 'fnapi-js';

const epic = new EpicGamesClient();

const session = await epic.loginClientCredentials();
const verified = await session.verify();
console.log(`verified client ${verified.client_id}`);
await session.logout();
```

To sign in as a user, use the device-code flow — see the docs.

### Live bot, shop & party

```ts
const session = await epic.loginWithDeviceAuth(creds);

const bot = await session.live();
bot.on('friend:request', (request) => request.accept());
bot.on('party:invite', (invite) => invite.accept());

const shop = await session.shop();
await shop.find('Renegade Raider')?.gift('SomeFriend');

const party = await bot.createParty();
await party.setPrivacy('private');
```

## Configuration

Runtime configuration lives in `config.json` (no `.env`). Copy the template and fill in your own values:

```bash
cp config.example.json config.json
```

`config.json` is git-ignored — it holds account/device-auth secrets and must never be committed.

## Documentation

The full API reference is consolidated in [`docs.md`](./docs.md), and the source pages live under [`docs/`](./docs) (built with VitePress).

## CLI

An interactive CLI covers most of the surface — auth, shop, gifting, party, live events, Fortnite endpoints:

```bash
npm run cli
```

## License

[MIT](./LICENSE)
