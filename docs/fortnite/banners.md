# BannersEndpoint

`client.banners` — profile banners and banner colors, with client-side helpers to look one up by id. Accessed via `client.banners`.

## BannersEndpoint
<Badge type="tip" text="class" />

```ts
class BannersEndpoint extends BaseEndpoint
```

Lists banners and banner colors. The `byId`/`colorById` helpers fetch the full list and filter locally.

```ts
const banners = await client.banners.all();
const colors = await client.banners.colors();
```

::: tip Note
`all` and `byId` accept `LanguageOptions` (localizable); `colors` and `colorById` accept plain `BaseOptions`.
:::

## all
<Badge type="info" text="method" />

```ts
all(options?: LanguageOptions): Promise<Banner[]>
```

Fetches every profile banner.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `LanguageOptions` | Optional; `language` plus base request options. |

**Returns:** `Promise<Banner[]> — all banners`

```ts
const banners = await client.banners.all();
console.log(`${banners.length} banners`);
```

## colors
<Badge type="info" text="method" />

```ts
colors(options?: BaseOptions): Promise<BannerColor[]>
```

Fetches every available banner color.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `BaseOptions` | Optional base request options (`signal`, `timeout`, `cache`, `headers`). |

**Returns:** `Promise<BannerColor[]> — all banner colors`

```ts
const colors = await client.banners.colors();
```

## byId
<Badge type="info" text="method" />

```ts
byId(bannerId: string, options?: LanguageOptions): Promise<Banner | null>
```

Fetches all banners and returns the one whose `id` matches, or `null` if none match.

| Parameter | Type | Description |
| --- | --- | --- |
| `bannerId` | `string` | The banner id to find. Required non-empty string. |
| `options` | `LanguageOptions` | Optional; `language` plus base request options. |

**Returns:** `Promise<Banner | null> — the matching banner, or null`

```ts
const banner = await client.banners.byId('standardbanner15');
if (banner) console.log(banner.category);
```

## colorById
<Badge type="info" text="method" />

```ts
colorById(colorId: string, options?: BaseOptions): Promise<BannerColor | null>
```

Fetches all banner colors and returns the one whose `id` matches, or `null` if none match.

| Parameter | Type | Description |
| --- | --- | --- |
| `colorId` | `string` | The banner color id to find. Required non-empty string. |
| `options` | `BaseOptions` | Optional base request options. |

**Returns:** `Promise<BannerColor | null> — the matching color, or null`

```ts
const color = await client.banners.colorById('defaultcolor1');
if (color) console.log(color.color);
```
