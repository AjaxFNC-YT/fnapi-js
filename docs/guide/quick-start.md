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
