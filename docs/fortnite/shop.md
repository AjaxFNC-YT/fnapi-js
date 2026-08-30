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
