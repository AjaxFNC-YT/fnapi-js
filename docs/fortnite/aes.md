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
