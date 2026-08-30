# PlaylistsEndpoint

Playlist metadata. Reached via `client.playlists`. `all()` lists every playlist; `byId()` fetches one directly from the API. Both accept optional `LanguageOptions`.

## PlaylistsEndpoint
<Badge type="tip" text="class" />

```ts
class PlaylistsEndpoint extends BaseEndpoint
```

Endpoint wrapper for the `/v1/playlists` routes.

```ts
import { FortniteAPI } from 'fnapi-js';

const client = new FortniteAPI();
const playlists = await client.playlists.all();
console.log(playlists.length);
```

## all
<Badge type="info" text="method" />

```ts
all(options?: LanguageOptions): Promise<Playlist[]>
```

Fetches the full list of available playlists.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `LanguageOptions` | Optional language and transport controls. |

**Returns:** `Promise<Playlist[]> — every known playlist`

```ts
const playlists = await client.playlists.all();
for (const p of playlists) console.log(p.id, p.name);
```

## byId
<Badge type="info" text="method" />

```ts
byId(playlistId: string, options?: LanguageOptions): Promise<Playlist>
```

Fetches a single playlist by id via a dedicated request. Throws `ValidationError` when `playlistId` is empty and `NotFoundError` when the playlist does not exist.

| Parameter | Type | Description |
| --- | --- | --- |
| `playlistId` | `string` | The playlist id (e.g. `"Playlist_DefaultSolo"`). |
| `options` | `LanguageOptions` | Optional language and transport controls. |

**Returns:** `Promise<Playlist> — the matching playlist`

```ts
const solo = await client.playlists.byId('Playlist_DefaultSolo');
console.log(solo.name);
```
