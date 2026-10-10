import { ValidationError } from '../core/errors.js';
import { EpicApiError } from './errors.js';
import type { MCPResponse } from './mcp.js';
import type { EpicAuthSession } from './session.js';

export const GIFT_CURRENCY = 'MtxCurrency';
export const GIFT_GAME_CONTEXT = 'Frontend.CatabaScreen';
export const GIFT_DEFAULT_CURRENCY_SUBTYPE = 'Currency';
export const PURCHASE_GAME_CONTEXT = 'Frontend.CatabaScreen';
export const REFUND_GAME_CONTEXT = 'Frontend.AthenaLobby';

export const ShopErrorReason = {
  NotEnoughVbucks: 'not-enough-vbucks',
  AlreadyOwned: 'already-owned',
  NotFriends: 'not-friends',
  GiftsDisabled: 'gifts-disabled',
  RecipientNotEligible: 'recipient-not-eligible',
  GiftLimitReached: 'gift-limit-reached',
  OfferUnavailable: 'offer-unavailable',
  RefundUnavailable: 'refund-unavailable',
  InvalidCreator: 'invalid-creator',
  Unknown: 'unknown',
} as const;

export type ShopErrorReason = (typeof ShopErrorReason)[keyof typeof ShopErrorReason];

const SHOP_ERROR_REASONS: Record<string, ShopErrorReason> = {
  'errors.com.epicgames.modules.gameplayutils.not_enough_mtx': 'not-enough-vbucks',
  'errors.com.epicgames.modules.gamesubcatalog.cannot_afford_purchase': 'not-enough-vbucks',
  'errors.com.epicgames.modules.gamesubcatalog.purchase_not_allowed': 'already-owned',
  'errors.com.epicgames.modules.gamesubcatalog.receiver_owns_item_from_bundle': 'already-owned',
  'errors.com.epicgames.ecommerce.orderprocessor.purchase_limit_error': 'already-owned',
  'errors.com.epicgames.modules.gamesubcatalog.gift_recipient_is_not_eligible_friend': 'not-friends',
  'errors.com.epicgames.friends.friendship_not_found': 'not-friends',
  'errors.com.epicgames.friends.invalid_friendship': 'not-friends',
  'errors.com.epicgames.modules.gamesubcatalog.receiver_will_not_accept_gifts': 'gifts-disabled',
  'errors.com.epicgames.modules.gamesubcatalog.gift_recipient_not_eligible': 'recipient-not-eligible',
  'errors.com.epicgames.modules.gamesubcatalog.gift_limit_reached': 'gift-limit-reached',
  'errors.com.epicgames.modules.gamesubcatalog.catalog_out_of_date': 'offer-unavailable',
  'errors.com.epicgames.modules.gamesubcatalog.no_history': 'refund-unavailable',
  'errors.com.epicgames.modules.gamesubcatalog.refund_not_permitted': 'refund-unavailable',
  'errors.com.epicgames.modules.gamesubcatalog.already_rolled_back': 'refund-unavailable',
  'errors.com.epicgames.modules.gamesubcatalog.refund_failed': 'refund-unavailable',
  'errors.com.epicgames.fortnite.invalid_affiliate': 'invalid-creator',
  'errors.com.epicgames.ecommerce.affiliate.not_found': 'invalid-creator',
};

const SHOP_ERROR_MESSAGES: Record<ShopErrorReason, string> = {
  'not-enough-vbucks': 'Not enough V-Bucks for this purchase.',
  'already-owned': 'The account already owns this item.',
  'not-friends': 'Gifts can only be sent to friends of at least 48 hours.',
  'gifts-disabled': 'The receiver has turned off receiving gifts.',
  'recipient-not-eligible': 'The receiver is not eligible to receive this gift.',
  'gift-limit-reached': 'The daily gift limit (5 per 24 hours) has been reached.',
  'offer-unavailable': 'This offer is no longer in the shop.',
  'refund-unavailable': 'This purchase cannot be refunded.',
  'invalid-creator': 'That Support-a-Creator code does not exist or is not active.',
  unknown: 'The request was rejected by Epic.',
};

export class ShopError extends Error {
  public override readonly name: string = 'ShopError';
  readonly reason: ShopErrorReason;
  readonly errorCode: string | null;
  readonly offerId: string | null;
  readonly accountIds: string[];

  constructor(
    reason: ShopErrorReason,
    init: { message?: string; errorCode?: string | null; offerId?: string | null; accountIds?: string[]; cause?: unknown } = {},
  ) {
    super(init.message ?? SHOP_ERROR_MESSAGES[reason], init.cause !== undefined ? { cause: init.cause } : undefined);
    this.reason = reason;
    this.errorCode = init.errorCode ?? null;
    this.offerId = init.offerId ?? null;
    this.accountIds = init.accountIds ?? [];
  }
}

export function shopErrorReason(errorCode: string | null | undefined): ShopErrorReason {
  return (errorCode && SHOP_ERROR_REASONS[errorCode]) || 'unknown';
}

export function toShopError(error: unknown, context: { offerId?: string; accountIds?: string[] } = {}): unknown {
  if (!(error instanceof EpicApiError)) return error;
  const reason = shopErrorReason(error.errorCode);
  const detail = reason === 'unknown' ? ` (${error.message})` : '';
  return new ShopError(reason, {
    message: `${SHOP_ERROR_MESSAGES[reason]}${detail}`,
    errorCode: error.errorCode ?? null,
    offerId: context.offerId ?? null,
    accountIds: context.accountIds ?? [],
    cause: error,
  });
}

const ACCOUNT_ID_PATTERN = /^[0-9a-f]{32}$/i;

export interface RawCatalogPrice {
  currencyType?: string;
  currencySubType?: string;
  regularPrice?: number;
  dynamicRegularPrice?: number;
  finalPrice?: number;
  basePrice?: number;
  saleExpiration?: string;
  [key: string]: unknown;
}

export interface RawGiftInfo {
  bIsEnabled?: boolean;
  forcedGiftBoxTemplateId?: string;
  purchaseRequirements?: unknown[];
  giftRecordIds?: unknown[];
  [key: string]: unknown;
}

export interface RawItemGrant {
  templateId?: string;
  quantity?: number;
  [key: string]: unknown;
}

export interface RawMetaInfo {
  key?: string;
  value?: string;
}

export interface RawCatalogEntry {
  offerId?: string;
  devName?: string;
  offerType?: string;
  prices?: RawCatalogPrice[];
  categories?: string[];
  giftInfo?: RawGiftInfo;
  itemGrants?: RawItemGrant[];
  metaInfo?: RawMetaInfo[];
  meta?: Record<string, unknown>;
  title?: string;
  displayAssetPath?: string;
  refundable?: boolean;
  [key: string]: unknown;
}

export interface RawStorefront {
  name?: string;
  catalogEntries?: RawCatalogEntry[];
  [key: string]: unknown;
}

export interface StorefrontCatalog {
  refreshIntervalHrs?: number;
  dailyPurchaseHrs?: number;
  expiration?: string;
  storefronts?: RawStorefront[];
  [key: string]: unknown;
}

export interface ShopPrice {
  currencyType: string;
  currencySubType: string;
  basePrice: number;
  regularPrice: number;
  finalPrice: number;
}

export interface ShopItem {
  templateId: string;
  quantity: number;
}

export type GiftTarget = string | string[];

export interface GiftOptions {
  message?: string;
  giftWrapTemplateId?: string;
  priceIndex?: number;
  currencySubType?: string;
  price?: number;
  precheck?: boolean;
  signal?: AbortSignal;
}

export interface GiftEligibility {
  accountId: string;
  offerId: string;
  eligible: boolean;
  reason: ShopErrorReason | null;
  message: string | null;
  price: ShopPrice | null;
  items: ShopItem[];
}

export interface PurchaseOptions {
  quantity?: number;
  priceIndex?: number;
  price?: number;
  currency?: string;
  currencySubType?: string;
  gameContext?: string;
  signal?: AbortSignal;
}

export interface PurchaseResult {
  offerId: string;
  quantity: number;
  totalPrice: number;
  items: Array<{ templateId: string; quantity: number; itemGuid: string | null; profileId: string | null }>;
  response: MCPResponse;
}

export interface PurchaseRecord {
  purchaseId: string;
  offerId: string;
  purchaseDate: string;
  totalMtxPaid: number;
  freeRefundEligible: boolean;
  refundType: string | null;
  items: Array<{ templateId: string; quantity: number; itemGuid: string | null; profileId: string | null }>;
  raw: Record<string, unknown>;
}

export interface PurchaseHistory {
  refundCredits: number;
  refundsUsed: number;
  tokenRefreshReferenceTime: string | null;
  purchases: PurchaseRecord[];
}

export interface GiftResult {
  offerId: string;
  receiverAccountIds: string[];
  currencySubType: string;
  totalPrice: number;
  response: MCPResponse;
}

export interface ShopFetchOptions {
  signal?: AbortSignal;
  timeout?: number;
}

interface GiftDescriptor {
  offerId: string;
  currencySubType: string;
  unitPrice: number;
}

function normalizePrice(price: RawCatalogPrice): ShopPrice {
  const regularPrice =
    typeof price.regularPrice === 'number'
      ? price.regularPrice
      : typeof price.dynamicRegularPrice === 'number'
        ? price.dynamicRegularPrice
        : 0;
  const finalPrice = typeof price.finalPrice === 'number' ? price.finalPrice : regularPrice;
  return {
    currencyType: typeof price.currencyType === 'string' ? price.currencyType : '',
    currencySubType: typeof price.currencySubType === 'string' ? price.currencySubType : '',
    basePrice: typeof price.basePrice === 'number' ? price.basePrice : regularPrice,
    regularPrice,
    finalPrice,
  };
}

function extractDisplayName(raw: RawCatalogEntry): string | null {
  if (typeof raw.title === 'string' && raw.title.length > 0) return raw.title;
  for (const info of raw.metaInfo ?? []) {
    const key = typeof info.key === 'string' ? info.key.toLowerCase() : '';
    if ((key === 'displayname' || key === 'title') && typeof info.value === 'string') {
      return info.value;
    }
  }
  const metaTitle = raw.meta?.['DisplayName'] ?? raw.meta?.['title'];
  return typeof metaTitle === 'string' ? metaTitle : null;
}

function buildEntries(gifting: Gifting, catalog: StorefrontCatalog): ShopEntry[] {
  const entries: ShopEntry[] = [];
  for (const storefront of catalog.storefronts ?? []) {
    const name = typeof storefront.name === 'string' ? storefront.name : '';
    for (const raw of storefront.catalogEntries ?? []) {
      if (typeof raw.offerId !== 'string' || raw.offerId.length === 0) continue;
      entries.push(new ShopEntry(gifting, name, raw));
    }
  }
  return entries;
}

export class ShopEntry {
  readonly offerId: string;
  readonly devName: string;
  readonly displayName: string | null;
  readonly offerType: string | null;
  readonly prices: ShopPrice[];
  readonly giftable: boolean;
  readonly categories: string[];
  readonly items: ShopItem[];
  readonly storefront: string;
  readonly raw: RawCatalogEntry;

  constructor(
    private readonly gifting: Gifting,
    storefront: string,
    raw: RawCatalogEntry,
  ) {
    this.raw = raw;
    this.storefront = storefront;
    this.offerId = typeof raw.offerId === 'string' ? raw.offerId : '';
    this.devName = typeof raw.devName === 'string' ? raw.devName : '';
    this.offerType = typeof raw.offerType === 'string' ? raw.offerType : null;
    this.displayName = extractDisplayName(raw);
    this.prices = (raw.prices ?? []).map(normalizePrice);
    this.giftable = raw.giftInfo?.bIsEnabled === true;
    this.categories = Array.isArray(raw.categories)
      ? raw.categories.filter((category): category is string => typeof category === 'string')
      : [];
    this.items = (raw.itemGrants ?? [])
      .filter((grant) => typeof grant.templateId === 'string')
      .map((grant) => ({
        templateId: grant.templateId as string,
        quantity: typeof grant.quantity === 'number' ? grant.quantity : 1,
      }));
  }

  get price(): ShopPrice | null {
    return this.prices[0] ?? null;
  }

  get name(): string {
    return this.displayName ?? this.devName;
  }

  priceAt(index: number): ShopPrice | null {
    return this.prices[index] ?? null;
  }

  gift(target: GiftTarget, options: GiftOptions = {}): Promise<GiftResult> {
    return this.gifting.giftEntry(this, target, options);
  }

  checkGift(target: GiftTarget, options: { signal?: AbortSignal } = {}): Promise<GiftEligibility[]> {
    return this.gifting.checkEligibility(this.offerId, target, options);
  }

  purchase(options: PurchaseOptions = {}): Promise<PurchaseResult> {
    return this.gifting.purchaseEntry(this, options);
  }
}

function lootItems(value: unknown): PurchaseResult['items'] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
    .map((entry) => ({
      templateId: typeof entry['itemType'] === 'string' ? entry['itemType'] : String(entry['templateId'] ?? ''),
      quantity: typeof entry['quantity'] === 'number' ? entry['quantity'] : 1,
      itemGuid: typeof entry['itemGuid'] === 'string' ? entry['itemGuid'] : null,
      profileId: typeof entry['itemProfile'] === 'string' ? entry['itemProfile'] : null,
    }));
}

export function parsePurchaseHistory(stats: Record<string, unknown>): PurchaseHistory {
  const history = (stats['mtx_purchase_history'] ?? {}) as Record<string, unknown>;
  const purchases = Array.isArray(history['purchases']) ? (history['purchases'] as Record<string, unknown>[]) : [];
  return {
    refundCredits: typeof history['refundCredits'] === 'number' ? history['refundCredits'] : 0,
    refundsUsed: typeof history['refundsUsed'] === 'number' ? history['refundsUsed'] : 0,
    tokenRefreshReferenceTime:
      typeof history['tokenRefreshReferenceTime'] === 'string' ? history['tokenRefreshReferenceTime'] : null,
    purchases: purchases
      .map((purchase) => ({
        purchaseId: String(purchase['purchaseId'] ?? ''),
        offerId: String(purchase['offerId'] ?? ''),
        purchaseDate: String(purchase['purchaseDate'] ?? ''),
        totalMtxPaid: typeof purchase['totalMtxPaid'] === 'number' ? purchase['totalMtxPaid'] : 0,
        freeRefundEligible: purchase['freeRefundEligible'] === true,
        refundType: typeof purchase['refundType'] === 'string' ? purchase['refundType'] : null,
        items: lootItems(purchase['lootResult']),
        raw: purchase,
      }))
      .sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate)),
  };
}

export class Gifting {
  constructor(private readonly session: EpicAuthSession) {}

  gift(offerId: string, target: GiftTarget, options: GiftOptions = {}): Promise<GiftResult> {
    if (typeof offerId !== 'string' || offerId.length === 0) {
      throw new ValidationError('"offerId" is required and must be a non-empty string', 'offerId');
    }
    return this.giftDescriptor(
      {
        offerId,
        currencySubType: options.currencySubType ?? GIFT_DEFAULT_CURRENCY_SUBTYPE,
        unitPrice: options.price ?? 0,
      },
      target,
      options,
    );
  }

  giftEntry(entry: ShopEntry, target: GiftTarget, options: GiftOptions = {}): Promise<GiftResult> {
    if (!(entry instanceof ShopEntry)) {
      throw new ValidationError('"entry" must be a ShopEntry', 'entry');
    }
    return this.giftDescriptor(this.describe(entry, options), target, options);
  }

  async giftEntries(
    entries: ShopEntry[],
    target: GiftTarget,
    options: GiftOptions = {},
  ): Promise<GiftResult[]> {
    if (!Array.isArray(entries) || entries.length === 0) {
      throw new ValidationError('"entries" must be a non-empty array of ShopEntry', 'entries');
    }
    const receivers = await this.resolveTargets(target, options.signal);
    const descriptors = entries.map((entry) => this.describe(entry, options));
    const results: GiftResult[] = [];
    for (const descriptor of descriptors) {
      results.push(await this.send(descriptor, receivers, options));
    }
    return results;
  }

  giftMany(entries: ShopEntry[], target: GiftTarget, options: GiftOptions = {}): Promise<GiftResult[]> {
    return this.giftEntries(entries, target, options);
  }

  async checkEligibility(
    offer: string | ShopEntry,
    target: GiftTarget,
    options: { signal?: AbortSignal } = {},
  ): Promise<GiftEligibility[]> {
    const offerId = offer instanceof ShopEntry ? offer.offerId : offer;
    if (typeof offerId !== 'string' || offerId.length === 0) {
      throw new ValidationError('"offerId" is required and must be a non-empty string', 'offerId');
    }
    const receivers = await this.resolveTargets(target, options.signal);
    const results: GiftEligibility[] = [];
    for (const accountId of receivers) {
      try {
        const data = await this.session.giftEligibility(accountId, offerId, options);
        results.push({
          accountId,
          offerId,
          eligible: true,
          reason: null,
          message: null,
          price: data.price ? normalizePrice(data.price) : null,
          items: (data.items ?? [])
            .filter((grant) => typeof grant.templateId === 'string')
            .map((grant) => ({ templateId: grant.templateId as string, quantity: grant.quantity ?? 1 })),
        });
      } catch (error) {
        if (!(error instanceof EpicApiError)) throw error;
        const shopError = toShopError(error, { offerId, accountIds: [accountId] }) as ShopError;
        results.push({
          accountId,
          offerId,
          eligible: false,
          reason: shopError.reason,
          message: shopError.message,
          price: null,
          items: [],
        });
      }
    }
    return results;
  }

  purchase(offerId: string, options: PurchaseOptions & { price: number }): Promise<PurchaseResult> {
    if (typeof offerId !== 'string' || offerId.length === 0) {
      throw new ValidationError('"offerId" is required and must be a non-empty string', 'offerId');
    }
    return this.sendPurchase(
      {
        offerId,
        currency: options.currency ?? GIFT_CURRENCY,
        currencySubType: options.currencySubType ?? '',
        unitPrice: options.price,
      },
      options,
    );
  }

  purchaseEntry(entry: ShopEntry, options: PurchaseOptions = {}): Promise<PurchaseResult> {
    if (!(entry instanceof ShopEntry)) {
      throw new ValidationError('"entry" must be a ShopEntry', 'entry');
    }
    const price = entry.priceAt(options.priceIndex ?? 0);
    if (!price) {
      throw new ValidationError(`Shop entry "${entry.offerId}" has no price to purchase with`, 'entry');
    }
    return this.sendPurchase(
      {
        offerId: entry.offerId,
        currency: options.currency ?? (price.currencyType || GIFT_CURRENCY),
        currencySubType: options.currencySubType ?? price.currencySubType,
        unitPrice: options.price ?? price.finalPrice,
      },
      options,
    );
  }

  private async sendPurchase(
    offer: { offerId: string; currency: string; currencySubType: string; unitPrice: number },
    options: PurchaseOptions,
  ): Promise<PurchaseResult> {
    const quantity = options.quantity ?? 1;
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new ValidationError('"quantity" must be a positive integer', 'quantity');
    }
    const totalPrice = offer.unitPrice * quantity;
    try {
      const response = await this.session.mcpOperation('PurchaseCatalogEntry', {
        profileId: 'common_core',
        payload: {
          offerId: offer.offerId,
          purchaseQuantity: quantity,
          currency: offer.currency,
          currencySubType: offer.currencySubType,
          expectedTotalPrice: totalPrice,
          gameContext: options.gameContext ?? PURCHASE_GAME_CONTEXT,
        },
        ...(options.signal ? { signal: options.signal } : {}),
      });
      const notifications = Array.isArray(response.notifications) ? response.notifications : [];
      const loot = notifications.flatMap((notification) => {
        const lootResult = (notification as { lootResult?: { items?: unknown } }).lootResult;
        return lootItems(lootResult?.items);
      });
      return { offerId: offer.offerId, quantity, totalPrice, items: loot, response };
    } catch (error) {
      throw toShopError(error, { offerId: offer.offerId });
    }
  }

  setReceiveGiftsEnabled(
    enabled: boolean,
    options: { signal?: AbortSignal } = {},
  ): Promise<MCPResponse> {
    return this.session.mcpOperation('SetReceiveGiftsEnabled', {
      profileId: 'common_core',
      payload: { bReceiveGifts: enabled },
      ...(options.signal ? { signal: options.signal } : {}),
    });
  }

  private describe(entry: ShopEntry, options: GiftOptions): GiftDescriptor {
    const price = entry.priceAt(options.priceIndex ?? 0);
    if (!price) {
      throw new ValidationError(`Shop entry "${entry.offerId}" has no price to gift with`, 'entry');
    }
    return {
      offerId: entry.offerId,
      currencySubType: options.currencySubType ?? price.currencySubType,
      unitPrice: options.price ?? price.finalPrice,
    };
  }

  private async giftDescriptor(
    descriptor: GiftDescriptor,
    target: GiftTarget,
    options: GiftOptions,
  ): Promise<GiftResult> {
    const receivers = await this.resolveTargets(target, options.signal);
    return this.send(descriptor, receivers, options);
  }

  private async send(
    descriptor: GiftDescriptor,
    receivers: string[],
    options: GiftOptions,
  ): Promise<GiftResult> {
    if (receivers.length === 0) {
      throw new ValidationError('A gift needs at least one receiver', 'target');
    }
    if (options.precheck !== false) {
      const checks = await this.checkEligibility(descriptor.offerId, receivers, options.signal ? { signal: options.signal } : {});
      const failed = checks.filter((check) => !check.eligible);
      if (failed.length > 0) {
        const first = failed[0]!;
        throw new ShopError(first.reason ?? 'unknown', {
          message: failed.map((check) => `${check.accountId}: ${check.message}`).join('; '),
          offerId: descriptor.offerId,
          accountIds: failed.map((check) => check.accountId),
        });
      }
    }
    const totalPrice = descriptor.unitPrice * receivers.length;
    const payload = {
      offerId: descriptor.offerId,
      currency: GIFT_CURRENCY,
      currencySubType: descriptor.currencySubType,
      expectedTotalPrice: totalPrice,
      gameContext: GIFT_GAME_CONTEXT,
      receiverAccountIds: receivers,
      giftWrapTemplateId: options.giftWrapTemplateId ?? '',
      personalMessage: options.message ?? '',
    };
    let response: MCPResponse;
    try {
      response = await this.session.mcpOperation('GiftCatalogEntry', {
        profileId: 'common_core',
        payload,
        ...(options.signal ? { signal: options.signal } : {}),
      });
    } catch (error) {
      throw toShopError(error, { offerId: descriptor.offerId, accountIds: receivers });
    }
    return {
      offerId: descriptor.offerId,
      receiverAccountIds: receivers,
      currencySubType: descriptor.currencySubType,
      totalPrice,
      response,
    };
  }

  private async resolveTargets(target: GiftTarget, signal?: AbortSignal): Promise<string[]> {
    const list = Array.isArray(target) ? target : [target];
    if (list.length === 0) {
      throw new ValidationError('A gift needs at least one receiver', 'target');
    }
    const seen = new Set<string>();
    const receivers: string[] = [];
    for (const value of list) {
      if (typeof value !== 'string' || value.trim().length === 0) {
        throw new ValidationError(
          'Each gift target must be a non-empty accountId or display name',
          'target',
        );
      }
      const accountId = await this.resolveAccountId(value.trim(), signal);
      if (!seen.has(accountId)) {
        seen.add(accountId);
        receivers.push(accountId);
      }
    }
    return receivers;
  }

  private async resolveAccountId(value: string, signal?: AbortSignal): Promise<string> {
    if (ACCOUNT_ID_PATTERN.test(value)) return value;
    const account = await this.session.accountByDisplayName(
      value,
      signal ? { signal } : undefined,
    );
    return account.id;
  }
}

export class Shop {
  private readonly giftingHelper: Gifting;
  private rawValue: StorefrontCatalog;
  private entriesValue: ShopEntry[];

  constructor(
    private readonly session: EpicAuthSession,
    raw: StorefrontCatalog,
  ) {
    this.giftingHelper = new Gifting(session);
    this.rawValue = raw;
    this.entriesValue = buildEntries(this.giftingHelper, raw);
  }

  get raw(): StorefrontCatalog {
    return this.rawValue;
  }

  get entries(): ShopEntry[] {
    return this.entriesValue;
  }

  get giftable(): ShopEntry[] {
    return this.entriesValue.filter((entry) => entry.giftable);
  }

  get gifting(): Gifting {
    return this.giftingHelper;
  }

  get expiration(): string | null {
    return typeof this.rawValue.expiration === 'string' ? this.rawValue.expiration : null;
  }

  byOfferId(offerId: string): ShopEntry | null {
    return this.entriesValue.find((entry) => entry.offerId === offerId) ?? null;
  }

  filter(predicate: (entry: ShopEntry) => boolean): ShopEntry[] {
    return this.entriesValue.filter(predicate);
  }

  find(nameOrOffer: string): ShopEntry | null {
    if (typeof nameOrOffer !== 'string' || nameOrOffer.length === 0) return null;
    const needle = nameOrOffer.toLowerCase();
    return (
      this.entriesValue.find((entry) => entry.offerId === nameOrOffer) ??
      this.entriesValue.find((entry) => entry.devName.toLowerCase() === needle) ??
      this.entriesValue.find((entry) => (entry.displayName ?? '').toLowerCase() === needle) ??
      this.entriesValue.find((entry) => entry.devName.toLowerCase().includes(needle)) ??
      this.entriesValue.find((entry) => (entry.displayName ?? '').toLowerCase().includes(needle)) ??
      null
    );
  }

  search(query: string): ShopEntry[] {
    if (typeof query !== 'string' || query.length === 0) return [];
    const needle = query.toLowerCase();
    return this.entriesValue.filter(
      (entry) =>
        entry.devName.toLowerCase().includes(needle) ||
        (entry.displayName ?? '').toLowerCase().includes(needle),
    );
  }

  purchase(entry: ShopEntry | string, options: PurchaseOptions = {}): Promise<PurchaseResult> {
    const resolved = entry instanceof ShopEntry ? entry : this.find(entry);
    if (!resolved) {
      throw new ValidationError(`No shop entry matches "${String(entry)}"`, 'entry');
    }
    return this.giftingHelper.purchaseEntry(resolved, options);
  }

  gift(
    entries: ShopEntry | ShopEntry[] | string | string[],
    target: GiftTarget,
    options: GiftOptions = {},
  ): Promise<GiftResult[]> {
    const list = Array.isArray(entries) ? entries : [entries];
    if (list.length === 0) {
      throw new ValidationError('"entries" must contain at least one shop entry', 'entries');
    }
    const resolved = list.map((item) => {
      if (item instanceof ShopEntry) return item;
      const found = this.find(item);
      if (!found) {
        throw new ValidationError(`No shop entry matches "${item}"`, 'entries');
      }
      return found;
    });
    return this.giftingHelper.giftEntries(resolved, target, options);
  }

  async refresh(options: ShopFetchOptions = {}): Promise<this> {
    this.rawValue = await this.session.storefrontCatalog<StorefrontCatalog>(options);
    this.entriesValue = buildEntries(this.giftingHelper, this.rawValue);
    return this;
  }
}
