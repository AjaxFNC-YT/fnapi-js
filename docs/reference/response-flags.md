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
