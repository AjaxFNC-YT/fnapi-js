# MapEndpoint

Access to the current Battle Royale map, its POIs, and single-POI lookup. Reached via `client.map`. All methods accept optional `LanguageOptions` (`language`, `signal`, `timeout`, `cache`, `headers`).

## MapEndpoint
<Badge type="tip" text="class" />

```ts
class MapEndpoint extends BaseEndpoint
```

Endpoint wrapper for `/v1/map`. Exposes the map image URLs plus the list of named POIs, and helpers to slice that list without a second request.

```ts
import { FortniteAPI } from 'fnapi-js';

const client = new FortniteAPI();
const map = await client.map.get();
console.log(map.images.pois, map.pois.length);
```

## get
<Badge type="info" text="method" />

```ts
get(options?: LanguageOptions): Promise<GameMap>
```

Fetches the full map object, including `images` (blank and POI overlays) and the `pois` array.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `LanguageOptions` | Optional per-request `language` plus transport controls (`signal`, `timeout`, `cache`, `headers`). |

**Returns:** `Promise<GameMap> resolving to the map, its image URLs, and POIs`

```ts
const map = await client.map.get({ language: 'en' });
console.log(map.images.blank);
```

## pois
<Badge type="info" text="method" />

```ts
pois(options?: LanguageOptions): Promise<Poi[]>
```

Convenience accessor that calls `get()` and returns only the `pois` array.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `LanguageOptions` | Optional language and transport controls. |

**Returns:** `Promise<Poi[]> — the named locations on the map`

```ts
const pois = await client.map.pois();
for (const poi of pois) console.log(poi.id, poi.name);
```

## poiById
<Badge type="info" text="method" />

```ts
poiById(poiId: string, options?: LanguageOptions): Promise<Poi | null>
```

Fetches the POI list and returns the POI whose `id` matches, or `null` if none match. Throws `ValidationError` when `poiId` is empty.

| Parameter | Type | Description |
| --- | --- | --- |
| `poiId` | `string` | The POI id to look up (e.g. `"Athena.Location.POI..."`). |
| `options` | `LanguageOptions` | Optional language and transport controls. |

**Returns:** `Promise<Poi | null> — the matching POI, or null`

```ts
const poi = await client.map.poiById('Athena.Location.POI.Foo');
if (poi) console.log(poi.name, poi.location);
```
