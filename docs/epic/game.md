# FortniteGameManager

Reads live **game-service** data — the calendar timeline, battle-royale inventory, V-Bucks balance, the current purchase platform, and purchase receipts. Exposed as `client.game` on `EpicGamesClient` and mirrored on a live `EpicAuthSession`. Every method requires a bearer token; the manager talks to the MCP host.

The V-Bucks balance and platform methods read the account's `common_core` profile through MCP `QueryProfile`, exactly like the in-game store does. That profile is **self-only** — Epic returns `403` when you query another account's `common_core`, so the session wrappers always target the signed-in account.

```ts
import { EpicGamesClient } from 'fnapi-js';

const epic = new EpicGamesClient();
const session = await epic.loginWithDeviceAuth(creds);

const balance = await session.vbucksBalance();
console.log('v-bucks:', balance.total, 'on', balance.platform);
for (const entry of balance.entries) {
  console.log(`  ${entry.category}${entry.platform ? ` (${entry.platform})` : ''}: ${entry.amount}`);
}
```

## game.timeline
<Badge type="info" text="method" />

```ts
timeline(accessToken: string, options?: { signal?: AbortSignal }): Promise<Timeline>
```

Fetches the calendar timeline — the per-channel event state Epic uses to drive playlists, shop rotations, and season timers.

**Returns:** `Promise<Timeline>` · **Session:** `session.timeline()`

## game.brInventory
<Badge type="info" text="method" />

```ts
brInventory(accessToken: string, accountId: string, options?: { signal?: AbortSignal }): Promise<BrInventory>
```

Fetches the battle-royale inventory stash for an account — the raw balances (match gold, etc.). This is **not** the V-Bucks balance; use `vbucksBalance` for that.

**Returns:** `Promise<BrInventory>` · **Session:** `session.brInventory(accountId?)`

## game.commonCore
<Badge type="info" text="method" />

```ts
commonCore(accessToken: string, accountId: string, options?: { signal?: AbortSignal }): Promise<CommonCoreProfile>
```

Queries the account's `common_core` MCP profile — the raw source behind the V-Bucks balance and current platform. Self-only: querying another account's `common_core` returns `403`.

**Returns:** `Promise<CommonCoreProfile>` · **Session:** `session.commonCore()`

## game.vbucksBalance
<Badge type="info" text="method" />

```ts
vbucksBalance(accessToken: string, accountId: string, options?: { signal?: AbortSignal }): Promise<VbucksBalance>
```

Sums every `Currency:Mtx*` item in `common_core` into a total plus a per-source breakdown, and reports the account's current purchase platform. Categories map as:

| Template | Category |
| --- | --- |
| `Currency:MtxComplimentary` | Epic Games & Refunds |
| `Currency:MtxGiveaway` | Battlepass & Challenges |
| `Currency:MtxPurchased` | Purchased *(carries a `platform`)* |
| `Currency:MtxSubscription` | Crew |

**Returns:** `Promise<VbucksBalance>` · **Session:** `session.vbucksBalance()`

## game.vbucks
<Badge type="info" text="method" />

```ts
vbucks(accessToken: string, accountId: string, options?: { signal?: AbortSignal }): Promise<number>
```

Convenience wrapper over `vbucksBalance` that returns just the `total`.

**Returns:** `Promise<number>` · **Session:** `session.vbucks()`

## game.mtxPlatform
<Badge type="info" text="method" />

```ts
mtxPlatform(accessToken: string, accountId: string, options?: { signal?: AbortSignal }): Promise<string>
```

Reads the account's current purchase platform (`current_mtx_platform` in `common_core`).

**Returns:** `Promise<string>` · **Session:** `session.mtxPlatform()`

## game.setMtxPlatform
<Badge type="info" text="method" />

```ts
setMtxPlatform(
  accessToken: string,
  accountId: string,
  platform: MtxPlatform | (string & {}),
  options?: { signal?: AbortSignal },
): Promise<CommonCoreProfile | null>
```

Changes the account's purchase platform through the MCP `SetMtxPlatform` operation. Use a value from the `MtxPlatform` enum. Returns the updated `common_core` profile when Epic echoes one back.

```ts
import { MtxPlatform } from 'fnapi-js';

await session.setMtxPlatform(MtxPlatform.PlayStation);
console.log('now buying on', await session.mtxPlatform());
```

**Returns:** `Promise<CommonCoreProfile | null>` · **Session:** `session.setMtxPlatform(platform)`

## game.receipts
<Badge type="info" text="method" />

```ts
receipts(accessToken: string, accountId: string, options?: { signal?: AbortSignal }): Promise<Receipt[]>
```

Fetches the account's purchase receipts across app stores.

**Returns:** `Promise<Receipt[]>` · **Session:** `session.receipts(accountId?)`

## MtxPlatform
<Badge type="tip" text="enum" />

Valid purchase platforms for `setMtxPlatform`. `MTX_PLATFORM_LIST` is the value array and `isMtxPlatform(value)` is the guard.

```ts
const MtxPlatform = {
  WeGame: 'WeGame',
  EpicPCKorea: 'EpicPCKorea',
  Epic: 'Epic',
  EpicPC: 'EpicPC',
  EpicAndroid: 'EpicAndroid',
  PlayStation: 'PSN',
  Xbox: 'Live',
  IOS: 'IOSAppStore',
  Nintendo: 'Nintendo',
  Samsung: 'Samsung',
  GooglePlay: 'GooglePlay',
  Shared: 'Shared',
} as const;
```

## Types
<Badge type="tip" text="interface" />

```ts
interface Timeline {
  channels: Record<string, TimelineChannel>;
  eventsTimeOffsetHrs: number;
  cacheIntervalMins: number;
  currentTime: string;
}

interface BrInventory {
  stash: Record<string, number>;
}

interface CommonCoreItem {
  templateId: string;
  attributes: Record<string, unknown> & { platform?: string };
  quantity: number;
}

interface CommonCoreProfile {
  _id?: string;
  profileId?: string;
  items: Record<string, CommonCoreItem>;
  stats: {
    attributes: Record<string, unknown> & { current_mtx_platform?: string; mtx_affiliate?: string };
  };
}

interface VbucksEntry {
  templateId: string;
  category: string;
  platform?: string;
  amount: number;
}

interface VbucksBalance {
  total: number;
  platform: string;
  entries: VbucksEntry[];
}

interface Receipt {
  appStore: string;
  appStoreId: string;
  receiptId: string;
  receiptInfo: string;
}
```

`accountId` defaults to the signed-in account on every session convenience method; the V-Bucks and platform methods are self-only and take no `accountId`.
