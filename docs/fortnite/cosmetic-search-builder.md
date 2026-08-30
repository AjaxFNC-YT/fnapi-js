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
