# CreatorCodeEndpoint

`client.creatorCode` (alias `client.sac`) — Support-A-Creator code lookups and an existence check. Both accept `BaseOptions`.

## CreatorCodeEndpoint
<Badge type="tip" text="class" />

```ts
class CreatorCodeEndpoint extends BaseEndpoint
```

Resolves Support-A-Creator codes to their owning account and status. Exposed as both `client.creatorCode` and `client.sac`.

```ts
const creator = await client.creatorCode.get('ninja');
console.log(creator.account.name, creator.status);
```

::: tip Note
`get` throws `NotFoundError` for unknown codes; `exists` catches that and returns `false`.
:::

## get
<Badge type="info" text="method" />

```ts
get(code: string, options?: BaseOptions): Promise<CreatorCode>
```

Looks up a Support-A-Creator code and returns its details, including the owning account and status. Throws `NotFoundError` if the code does not exist.

| Parameter | Type | Description |
| --- | --- | --- |
| `code` | `string` | The creator code to resolve. Required non-empty string. |
| `options` | `BaseOptions` | Optional base request options (`signal`, `timeout`, `cache`, `headers`). |

**Returns:** `Promise<CreatorCode> — the resolved code details`

```ts
const creator = await client.creatorCode.get('ninja');
console.log(`${creator.code} -> ${creator.account.name} (${creator.status})`);
```

## exists
<Badge type="info" text="method" />

```ts
exists(code: string, options?: BaseOptions): Promise<boolean>
```

Returns `true` if the creator code resolves, `false` if it triggers a `NotFoundError`. Other errors still propagate.

| Parameter | Type | Description |
| --- | --- | --- |
| `code` | `string` | The creator code to check. Required non-empty string. |
| `options` | `BaseOptions` | Optional base request options. |

**Returns:** `Promise<boolean> — whether the code exists`

```ts
if (await client.sac.exists('ninja')) {
  console.log('code is active');
}
```
