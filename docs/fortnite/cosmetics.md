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
