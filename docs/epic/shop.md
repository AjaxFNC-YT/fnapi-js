# Shop & Gifting

`session.shop()` reads the **real item-shop catalog** off Epic's storefront endpoint and parses it into typed `ShopEntry` objects. A shop entry is gifted directly — find it, call `.gift(friend)` — and multiple entries or receivers can go in one call.

::: tip Real catalog, not the public mirror
This is the live storefront the game itself reads (via MCP / storefront service on your session token), so prices, gift flags and offer ids match what you see in-game. The unauthenticated [`ShopEndpoint`](/fortnite/shop) on `FortniteAPI` is a separate, read-only mirror for display; use it when you don't have a session.
:::

```ts
import { EpicGamesClient } from 'fnapi-js';

const epic = new EpicGamesClient();
const session = await epic.loginWithDeviceAuth(creds);

const shop = await session.shop();
console.log(`${shop.entries.length} offers, expires ${shop.expiration}`);

const skin = shop.find('Renegade Raider');
if (skin?.giftable) {
  await skin.gift('SomeFriendDisplayName', { message: 'gg' });
}
```

## session.shop
<Badge type="info" text="method" />

```ts
shop(options?: ShopFetchOptions): Promise<Shop>
```

Fetches the storefront catalog and returns a `Shop`. `ShopFetchOptions` is `{ signal?, timeout? }`. `session.storefrontCatalog<T>(options?)` returns the raw catalog if you want to parse it yourself, and `session.gifting()` returns a bare [`Gifting`](#gifting) helper for offers that aren't in the current shop.

## Shop
<Badge type="tip" text="class" />

A parsed snapshot of the catalog.

| Member | Type | Description |
| --- | --- | --- |
| `entries` | `ShopEntry[]` | Every offer across all storefronts. |
| `giftable` | `ShopEntry[]` | Only the entries whose `giftInfo` is enabled. |
| `expiration` | `string \| null` | ISO timestamp the shop rotates. |
| `gifting` | `Gifting` | The underlying gifting helper. |
| `raw` | `StorefrontCatalog` | The unparsed catalog. |
| `byOfferId(id)` | `ShopEntry \| null` | Exact offer-id lookup. |
| `find(nameOrOffer)` | `ShopEntry \| null` | Match by offer id, dev name, or display name (exact, then contains). |
| `search(query)` | `ShopEntry[]` | All entries whose dev/display name contains the query. |
| `filter(pred)` | `ShopEntry[]` | Filter entries with your own predicate. |
| `gift(entries, target, options?)` | `Promise<GiftResult[]>` | Gift one or many entries (by object or name/offer) to one or many receivers. |
| `refresh(options?)` | `Promise<this>` | Re-fetch the catalog in place. |

```ts
const shop = await session.shop();

shop.byOfferId('v2:/a1b2c3…');
shop.search('pickaxe');
shop.giftable.map((entry) => entry.name);

await shop.gift(['Renegade Raider', 'Floss'], 'FriendName');  // 2 offers → 1 friend
```

## ShopEntry
<Badge type="tip" text="class" />

One catalog offer.

| Member | Type | Description |
| --- | --- | --- |
| `offerId` | `string` | Catalog offer id (what gifting sends). |
| `devName` | `string` | Epic's internal dev name. |
| `displayName` | `string \| null` | Human title from `title` / `metaInfo`. |
| `name` | `string` | `displayName` if present, else `devName`. |
| `offerType` | `string \| null` | e.g. `StaticPage`. |
| `prices` | `ShopPrice[]` | All price rows. |
| `price` | `ShopPrice \| null` | First price row. |
| `giftable` | `boolean` | Whether `giftInfo` is enabled for this offer. |
| `categories` | `string[]` | Storefront panels the offer sits in. |
| `items` | `ShopItem[]` | `{ templateId, quantity }` grants. |
| `storefront` | `string` | The storefront name it came from. |
| `raw` | `RawCatalogEntry` | The unparsed entry. |
| `priceAt(index)` | `ShopPrice \| null` | A specific price row. |
| `gift(target, options?)` | `Promise<GiftResult>` | Gift this entry (delegates to `Gifting`). |

### gift
<Badge type="info" text="method" />

```ts
gift(target: string | string[], options?: GiftOptions): Promise<GiftResult>
```

Gifts this offer. `target` is an account id **or** a display name (resolved via `session.accountByDisplayName`), or an array of them — duplicates are de-duped and the price is multiplied per receiver. The MCP `GiftCatalogEntry` op runs on `common_core`, and `expectedTotalPrice` is `finalPrice × receivers` unless you override `price`.

```ts
const entry = shop.find('Renegade Raider')!;

await entry.gift('FriendName');
await entry.gift(['FriendA', 'b1c2d3…'], { message: 'enjoy!' });
```

```ts
interface GiftOptions {
  message?: string;             // personalMessage on the gift
  giftWrapTemplateId?: string;  // wrap template (default none)
  priceIndex?: number;          // which price row to charge (default 0)
  currencySubType?: string;     // override the currency subtype
  price?: number;               // override the per-receiver price
  precheck?: boolean;           // check every receiver before sending (default true)
  signal?: AbortSignal;
}
```

Before sending, every receiver is checked with the gift-eligibility endpoint. If anyone can't receive the gift, nothing is sent and a [`ShopError`](#shoperror) says why. Pass `precheck: false` to skip the check; a failed gift still throws a `ShopError`.

### checkGift
<Badge type="info" text="method" />

```ts
checkGift(target: string | string[]): Promise<GiftEligibility[]>
```

Checks each receiver without sending anything. Returns one `{ accountId, offerId, eligible, reason, message, price, items }` per receiver; `reason` is a `ShopErrorReason` such as `already-owned`, or `null` when the receiver is eligible.

```ts
for (const check of await entry.checkGift(['FriendA', 'FriendB'])) {
  console.log(check.accountId, check.eligible ? 'ok' : check.message);
}
```

### purchase
<Badge type="info" text="method" />

```ts
purchase(options?: { quantity?: number; priceIndex?: number; price?: number; currency?: string; currencySubType?: string; signal?: AbortSignal }): Promise<PurchaseResult>
```

Buys the offer for the signed-in account with `PurchaseCatalogEntry`. This **spends V-Bucks**. It resolves to `{ offerId, quantity, totalPrice, items, response }` and throws a `ShopError` such as `not-enough-vbucks` or `already-owned`. `shop.purchase(entryOrName)` does the same from the shop.

## ShopError
<Badge type="tip" text="class" />

Every gift, purchase, refund and creator-code failure is thrown as a `ShopError` with a readable message:

| Field | Description |
| --- | --- |
| `reason` | `not-enough-vbucks`, `already-owned`, `not-friends`, `gifts-disabled`, `recipient-not-eligible`, `gift-limit-reached`, `offer-unavailable`, `refund-unavailable`, `invalid-creator` or `unknown`. |
| `errorCode` | The raw Epic error code. |
| `offerId`, `accountIds` | What the failed action was about. |
| `cause` | The original `EpicApiError`. |

```ts
try {
  await entry.gift('FriendName');
} catch (error) {
  if (error instanceof ShopError) console.log(error.reason, error.message);
}
```

`shopErrorReason(errorCode)` and `toShopError(error, context)` are exported for mapping your own errors.

## Purchases & refunds
<Badge type="info" text="method" />

```ts
session.purchaseHistory(): Promise<PurchaseHistory>
session.refund(purchaseId: string, options?: { quickReturn?: boolean }): Promise<MCPResponse>
```

`purchaseHistory` reads `mtx_purchase_history` from `common_core`: `{ refundCredits, refundsUsed, tokenRefreshReferenceTime, purchases }`. Purchases are newest first, each with `purchaseId`, `offerId`, `purchaseDate`, `totalMtxPaid`, `freeRefundEligible`, `refundType` and the granted `items`.

`refund` returns a purchase with `RefundMtxPurchase`. Pass `quickReturn: true` for the free 24-hour return, which uses no refund ticket. Failures throw a `ShopError` with reason `refund-unavailable`.

```ts
const history = await session.purchaseHistory();
const latest = history.purchases[0];
if (latest?.freeRefundEligible) await session.refund(latest.purchaseId, { quickReturn: true });
```

## Gifting
<Badge type="tip" text="class" />

The standalone helper behind every gift — reach it with `session.gifting()` or `shop.gifting`. Use it to gift an **arbitrary offer id** that isn't in the current shop, or to toggle whether you accept gifts.

| Method | Description |
| --- | --- |
| `gift(offerId, target, options?)` | Gift a raw offer id. Pass `price` in options since there's no catalog row to read. |
| `giftEntry(entry, target, options?)` | Gift a single `ShopEntry`. |
| `giftEntries(entries, target, options?)` | Gift many entries (alias `giftMany`). |
| `setReceiveGiftsEnabled(enabled)` | `SetReceiveGiftsEnabled` — toggle whether others can gift you. |
| `checkEligibility(offer, target)` | Check receivers for any offer id, without sending. |
| `purchase(offerId, { price })` | Buy a raw offer id for yourself. |
| `purchaseEntry(entry, options?)` | Buy a `ShopEntry` for yourself. |

```ts
const gifting = session.gifting();

await gifting.gift('v2:/some_offer', 'FriendName', { price: 1200, currencySubType: 'Currency' });
await gifting.setReceiveGiftsEnabled(true);
```

## Types
<Badge type="tip" text="interface" />

```ts
interface ShopPrice {
  currencyType: string;     // e.g. 'MtxCurrency'
  currencySubType: string;  // e.g. 'Currency'
  basePrice: number;
  regularPrice: number;
  finalPrice: number;
}

interface ShopItem {
  templateId: string;
  quantity: number;
}

interface GiftResult {
  offerId: string;
  receiverAccountIds: string[];
  currencySubType: string;
  totalPrice: number;
  response: MCPResponse;
}
```

`GIFT_CURRENCY`, `GIFT_GAME_CONTEXT` and `GIFT_DEFAULT_CURRENCY_SUBTYPE` are exported as constants for the gift payload shape.
