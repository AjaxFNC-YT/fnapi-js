# MCP Client

MCP (profile) operations are the Fortnite game-service commands that read and mutate a player's profiles — cosmetics, purchases, quests, Save the World data and more. Every operation shares one request shape, so the wrapper exposes a **single generic caller** plus typed helpers for the two query operations, rather than 148 near-identical methods.

Everything runs against `https://fngw-mcp-gc-livefn.ol.epicgames.com` with a bearer token from an **account-bound** session (a client-credentials session has no account and will throw). The full list of operations, profiles and routes is in the [MCP Operations Catalog](/reference/mcp-operations).

```ts
import { EpicGamesClient, MCPProfile } from 'fnapi-js';

const epic = new EpicGamesClient();
const session = await epic.loginWithDeviceAuth(creds);

// query a profile
const athena = await session.queryProfile(MCPProfile.athena);
console.log(athena.profileRevision, athena.profileChanges.length);

// call any operation by name
await session.mcpOperation('MarkItemSeen', {
  profileId: MCPProfile.athena,
  payload: { itemIds: ['AthenaCharacter:CID_028_Athena_Commando_F'] },
});
```

## session.queryProfile
<Badge type="info" text="method" />

```ts
queryProfile<T>(profileId?: MCPProfileId, options?): Promise<MCPResponse<T>>
```

Runs `QueryProfile` for the session's account on the given profile (default `common_core`). Refreshes the token first if it is close to expiring.

| Parameter | Type | Description |
| --- | --- | --- |
| `profileId` | `MCPProfileId` | Which profile to read — e.g. `MCPProfile.athena`, `MCPProfile.commonCore`, `MCPProfile.campaign`. |
| `options` | `MCPOperationOptions` | Optional `rvn`, `route`, `payload`, `signal`, `timeout`. |

**Returns:** `Promise<MCPResponse<T>>`

```ts
const core = await session.queryProfile(MCPProfile.commonCore);
```

## session.queryPublicProfile
<Badge type="info" text="method" />

```ts
queryPublicProfile<T>(accountId: string, profileId?: MCPProfileId, options?): Promise<MCPResponse<T>>
```

Runs `QueryPublicProfile` (the `public` route) for **another** account's public profile data.

**Returns:** `Promise<MCPResponse<T>>`

```ts
const publicData = await session.queryPublicProfile('4735ce9132924caf8a5b17789b40f79c');
```

## session.mcpOperation
<Badge type="info" text="method" />

```ts
mcpOperation<T>(operation: MCPOperation, options?: MCPOperationOptions): Promise<MCPResponse<T>>
```

Calls **any** MCP operation by name against the session's account, injecting the (auto-refreshed) token. Accepts any string, so operations not yet in the typed list still work.

| Parameter | Type | Description |
| --- | --- | --- |
| `operation` | `MCPOperation` | The operation name, e.g. `'SetItemFavoriteStatusBatch'`. Any of the [148 operations](/reference/mcp-operations). |
| `options` | `MCPOperationOptions` | `profileId` (default `common_core`), `route` (default `client`), `rvn` (default `-1`), `payload` (default `{}`), `signal`, `timeout`. |

**Returns:** `Promise<MCPResponse<T>>`

```ts
await session.mcpOperation('SetItemFavoriteStatusBatch', {
  profileId: MCPProfile.athena,
  payload: { itemIds: ['ABC'], itemFavStatus: [true] },
});
```

::: tip Custom operations
Any operation name in [`MCP_OPERATIONS`](/reference/mcp-operations) always works. To call an operation **not** in that list (e.g. one Epic added after this release), construct the client with `allowCustomMcpOperations: true` — otherwise the call throws a `ConfigurationError`.
:::

## client.mcp
<Badge type="tip" text="class" />

```ts
class MCPClient
```

The low-level client on `EpicGamesClient.mcp`. Same methods as the session helpers, but you pass the access token and account id explicitly — useful when you hold a raw token rather than a session.

```ts
const epic = new EpicGamesClient();
const res = await epic.mcp.operation(accessToken, accountId, 'QueryProfile', {
  profileId: MCPProfile.athena,
});
```

## client.mcp.operation
<Badge type="info" text="method" />

```ts
operation<T>(accessToken: string, accountId: string, operation: MCPOperation, options?): Promise<MCPResponse<T>>
```

The generic caller. Blank `accessToken`, `accountId` or `operation` throw a `ValidationError` before any request.

**Returns:** `Promise<MCPResponse<T>>`

## client.mcp.queryProfile / queryPublicProfile
<Badge type="info" text="method" />

```ts
queryProfile<T>(accessToken, accountId, profileId?, options?): Promise<MCPResponse<T>>
queryPublicProfile<T>(accessToken, accountId, profileId?, options?): Promise<MCPResponse<T>>
```

Explicit-token equivalents of the session helpers.

## MCPProfile
<Badge type="warning" text="constant" />

```ts
const MCPProfile: { athena, creative, campaign, commonPublic, collections, commonCore, metadata, ... }
```

Named profile ids. `MCPProfile.athena` is `'athena'`, `MCPProfile.commonCore` is `'common_core'`, and so on. See the [catalog](/reference/mcp-operations) for what each profile stores.

## MCPRoute
<Badge type="warning" text="constant" />

```ts
const MCPRoute: { client: 'client', public: 'public', dedicatedServer: 'dedicated_server' }
```

Request routes. `client` is the default; `public` is used by `queryPublicProfile`; `dedicated_server` requires a role you cannot hold.

## MCP_OPERATIONS
<Badge type="warning" text="constant" />

```ts
const MCP_OPERATIONS: readonly MCPOperation[]
```

The full list of 148 operation names at runtime. Pair with `isMCPOperation(name)` to validate user input before calling.

```ts
import { MCP_OPERATIONS, isMCPOperation } from 'fnapi-js';

console.log(MCP_OPERATIONS.length); // 148
isMCPOperation('QueryProfile');     // true
isMCPOperation('Nope');             // false
```

## MCP_BASE_URL
<Badge type="warning" text="constant" />

```ts
const MCP_BASE_URL: 'https://fngw-mcp-gc-livefn.ol.epicgames.com'
```

The game-service base URL all MCP operations hit. `client.mcpRest` is the `EpicRestClient` pointed at it.
