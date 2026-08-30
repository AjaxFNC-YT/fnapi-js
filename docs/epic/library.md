# LibraryManager

Reads the account's **Epic Games Library** — every game and subscription the user owns (Fortnite, plus anything else acquired on Epic), and the user-defined collections that group them. Exposed as `client.library` on `EpicGamesClient` and mirrored with `library*` convenience methods on a live `EpicAuthSession`.

::: warning Requires a launcherApp token
The library service only answers to a **launcherApp** access token, not a game client token. The session methods below mint and cache one automatically (same plumbing as playtime) — you never pass a token by hand. When calling `LibraryManager` directly, pass a launcherApp bearer token yourself.
:::

```ts
import { EpicGamesClient } from 'fnapi-js';

const epic = new EpicGamesClient();
const session = await epic.loginWithDeviceAuth(creds);

const games = await session.libraryAll();
for (const record of games) {
  console.log(record.sandboxName ?? record.namespace, record.recordType, record.acquisitionDate);
}
```

::: tip Refresh tokens
The session already handles refresh tokens end to end — `session.refresh()`, `session.canRefresh`, and the internal launcherApp token cache all refresh transparently, so a long-lived session keeps reading the library without re-login.
:::

## library.items
<Badge type="info" text="method" />

```ts
items(accessToken: string, options?: LibraryItemsOptions): Promise<LibraryItemsResponse>
```

Fetches a single page of library records. `responseMetadata` is normalized onto the result whether Epic returned it in the body (`includeMetadata: true`) or in the `X-Epic-Metadata` header.

| Parameter | Type | Description |
| --- | --- | --- |
| `accessToken` | `string` | launcherApp bearer token. |
| `options.includeMetadata` | `boolean` | Put pagination metadata in the body instead of the header. |
| `options.cursor` | `string` | Cursor from a previous page, or `buildLibraryCursor(offset)`. |
| `options.excludeNs` / `options.includeNs` | `string \| string[]` | Filter records by namespace. |
| `options.limit` | `number` | Maximum records per page. |
| `options.platform` | `string` | e.g. `Windows`, `Android`. |
| `options.includeCategories` | `string` | Only records whose catalog item has the category. |

**Returns:** `Promise<LibraryItemsResponse>` · **Session:** `session.library(options?)`

## library.allItems
<Badge type="info" text="method" />

```ts
allItems(accessToken: string, options?: LibraryAllItemsOptions): Promise<LibraryRecord[]>
```

Walks every page (following `nextCursor`, forcing `includeMetadata`) and returns the flattened list of records. Use `options.pageSize` to tune the per-request `limit`.

**Returns:** `Promise<LibraryRecord[]>` · **Session:** `session.libraryAll(options?)`

## library.stateTokenStatus
<Badge type="info" text="method" />

```ts
stateTokenStatus(accessToken: string, stateToken: string, options?: LibraryRequestOptions): Promise<boolean>
```

Reports whether a `stateToken` handed back in a previous `responseMetadata` is still valid (the library has not changed since).

**Returns:** `Promise<boolean>` · **Session:** `session.libraryStateTokenStatus(stateToken)`

## Collections
<Badge type="info" text="method" />

```ts
collections(accessToken, accountId, options?): Promise<LibraryCollection[]>
collectionItems(accessToken, collectionId, accountId, options?): Promise<LibraryCollectionItem[]>
createCollection(accessToken, accountId, name, options?): Promise<LibraryCollection>
updateCollection(accessToken, accountId, collectionId, name, options?): Promise<LibraryCollection>
deleteCollection(accessToken, accountId, collectionId, options?): Promise<void>
addCollectionItem(accessToken, accountId, collectionId, item, options?): Promise<LibraryCollection>
removeCollectionItem(accessToken, accountId, collectionId, item, options?): Promise<LibraryCollection>
```

Read and manage the user's collections — named groups such as the built-in `Favorites`. An item is identified by its `{ sandbox, catalogId, artifactId }` triple.

**Session:** `session.libraryCollections()`, `session.libraryCollectionItems(collectionId)`, `session.createLibraryCollection(name)`, `session.updateLibraryCollection(collectionId, name)`, `session.deleteLibraryCollection(collectionId)`, `session.addLibraryCollectionItem(collectionId, item)`, `session.removeLibraryCollectionItem(collectionId, item)`.

## library.launcherItems
<Badge type="warning" text="deprecated" />

```ts
launcherItems(accessToken: string, options?: LauncherLibraryItemsOptions): Promise<LauncherLibraryResponse>
```

The legacy launcher-service proxy (`launcher-public-service-prod06.ol.epicgames.com`). Epic has deprecated it in favor of `items`; kept for parity. Returns thin `{ namespace, catalogItemId, appName }` records.

**Returns:** `Promise<LauncherLibraryResponse>` · **Session:** `session.launcherLibrary(options?)`

## Types
<Badge type="tip" text="interface" />

```ts
interface LibraryRecord {
  namespace: string;
  catalogItemId: string;
  appName?: string;
  productId?: string;
  sandboxName?: string;
  sandboxType?: string;
  recordType?: string;
  acquisitionDate?: string;
  dependencies?: string[];
}

interface LibraryResponseMetadata {
  nextCursor?: string;
  stateToken?: string;
}

interface LibraryItemsResponse {
  responseMetadata: LibraryResponseMetadata;
  records: LibraryRecord[];
}

interface LibraryCollection {
  collectionId: string;
  name: string;
  libraryItemContentVersion: number;
}

interface LibraryCollectionItem {
  sandbox: string;
  catalogId: string;
  artifactId: string;
}
```

`recordType` is typically `APPLICATION` or `SUBSCRIPTION`. `LIBRARY_BASE_URL`, `LAUNCHER_LIBRARY_BASE_URL`, and the `buildLibraryCursor(offset)` helper are exported for advanced use.
