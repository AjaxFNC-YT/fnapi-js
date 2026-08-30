import { ValidationError } from '../core/errors.js';
import type { MCPResponse } from './mcp.js';
import type { EpicAuthSession } from './session.js';

export const GIFT_CURRENCY = 'MtxCurrency';
export const GIFT_GAME_CONTEXT = 'Frontend.CatabaScreen';
export const GIFT_DEFAULT_CURRENCY_SUBTYPE = 'Currency';

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
  signal?: AbortSignal;
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
    const response = await this.session.mcpOperation('GiftCatalogEntry', {
      profileId: 'common_core',
      payload,
      ...(options.signal ? { signal: options.signal } : {}),
    });
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
