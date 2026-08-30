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
