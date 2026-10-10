# Islands & Links

Every island, playlist and mode set in Fortnite is a **link** in Epic's Links service (`links-public-service-live`). The session looks links up by code and flattens each one into an `Island` summary:

- title, tagline and description, localized when you pass a `locale`
- the creator
- version and state
- tags and genres
- player counts
- images
- age ratings

The session can also list a creator's published islands through the Discovery service and every link on your own account.

```ts
const session = await epic.loginWithDeviceAuth(creds);

const island = await session.island('8567-1055-6605');
console.log(island?.title, 'by', island?.creator.name, island?.players.max);

const trios = await session.island('playlist_trios');
console.log(trios?.type); // 'BR:Playlist'
```

All calls need an account-bound session.

## island
<Badge type="info" text="method" />

```ts
island(code: string, options?: { type?: string; version?: number; includeActivationHistory?: boolean; locale?: string }): Promise<Island | null>
```

Looks up one island or playlist code. It resolves to `null` when the code has no active version or does not exist. Pass `version` for an older published version.

## islands
<Badge type="info" text="method" />

```ts
islands(codes: Array<string | { mnemonic: string; type?: string; version?: number }>, options?: { locale?: string }): Promise<Island[]>
```

Looks up many codes at once, in chunks of 100. Codes that fail to resolve are skipped, so the result can be shorter than the input.

## islandRelated
<Badge type="info" text="method" />

```ts
islandRelated(code: string, options?: { version?: number }): Promise<LinkRelated>
```

Returns the link with its parents and children: `{ parentLinks, links }`. For example, `playlist_trios` sits under the `set_br_playlists` mode set, and a set lists its `sub_link_codes`.

## islandVersions
<Badge type="info" text="method" />

```ts
islandVersions(code: string, options?: { locale?: string }): Promise<Island[]>
```

Returns every published version of a link, newest first.

## creatorIslands
<Badge type="info" text="method" />

```ts
creatorIslands(creatorAccountId: string, options?: { limit?: number; olderThan?: string }): Promise<CreatorPage>
```

Returns a creator's published links from the Discovery service: `{ creatorId, links: [{ linkCode, globalCCU, isFavorite, lockStatus, isVisible }], hasMore }`. `limit` is at most 100. Page with `olderThan`, passing the last `lastActivatedDate`. To get full details, pass the codes to `islands`:

```ts
const page = await session.creatorIslands(island.creator.accountId);
const details = await session.islands(page.links.map((link) => link.linkCode));
```

## myIslands
<Badge type="info" text="method" />

```ts
myIslands(options?: { locale?: string }): Promise<Island[]>
```

Returns every link owned by the signed-in account, including private playtest links. The service only allows an account to list its own links.

## Island

| Field | Description |
| --- | --- |
| `code`, `type` | Link code and type, e.g. `valkyrie:application`, `BR:Playlist`, `ModeSet`. |
| `title`, `tagline`, `description` | Display text, localized when `locale` is passed. |
| `creator` | `{ accountId, name }`. Epic's own links use `epic`. |
| `version`, `active`, `state`, `moderationStatus`, `discoveryIntent` | Publishing state. |
| `tags`, `genres`, `mode` | Description tags, genres and the link mode. |
| `players` | `{ min, max }` from the matchmaking settings. |
| `image`, `images` | The full-size image and every size (`url`, `url_m`, `url_s`, `url_xs`). |
| `ratings` | Age rating per board, e.g. `{ ESRB: 'ESRB_TEEN' }`. |
| `supportCode`, `projectId` | Creator code and UEFN project. |
| `createdAt`, `publishedAt`, `updatedAt`, `lastActivatedAt` | Timestamps. |
| `link` | The raw `LinkMnemonic`. |

## LinksManager
<Badge type="tip" text="class" />

`epic.links` is the low-level client. Each method takes an access token:

- `mnemonic`
- `mnemonics`
- `related`
- `versions`
- `author`
- `creatorPage`

`toIsland(link, locale?)` turns a raw link into an `Island`.
