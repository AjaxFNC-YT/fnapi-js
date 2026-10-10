import { ValidationError } from '../core/errors.js';
import type { MCPClient } from './mcp.js';
import type { EpicRestClient } from './rest.js';

export interface TimelineChannelState {
  validFrom: string;
  activeEvents: Array<Record<string, unknown>>;
  state: Record<string, unknown>;
}

export interface TimelineChannel {
  states: TimelineChannelState[];
  cacheExpire: string;
}

export interface Timeline {
  channels: Record<string, TimelineChannel>;
  eventsTimeOffsetHrs: number;
  cacheIntervalMins: number;
  currentTime: string;
}

export interface BrInventory {
  stash: Record<string, number>;
}

export interface Receipt {
  appStore: string;
  appStoreId: string;
  receiptId: string;
  receiptInfo: string;
}

export const MTX_CURRENCY_PREFIX = 'Currency:Mtx';

export const MtxPlatform = {
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

export type MtxPlatform = (typeof MtxPlatform)[keyof typeof MtxPlatform];

export const MTX_PLATFORM_LIST = Object.values(MtxPlatform);

const MTX_PLATFORM_SET = new Set<string>(MTX_PLATFORM_LIST);

export function isMtxPlatform(value: unknown): value is MtxPlatform {
  return typeof value === 'string' && MTX_PLATFORM_SET.has(value);
}

const MTX_CATEGORY: Record<string, string> = {
  'Currency:MtxComplimentary': 'Epic Games & Refunds',
  'Currency:MtxGiveaway': 'Battlepass & Challenges',
  'Currency:MtxPurchased': 'Purchased',
  'Currency:MtxSubscription': 'Crew',
};

export interface CommonCoreItem {
  templateId: string;
  attributes: Record<string, unknown> & { platform?: string };
  quantity: number;
}

export interface CommonCoreProfile {
  _id?: string;
  profileId?: string;
  items: Record<string, CommonCoreItem>;
  stats: { attributes: Record<string, unknown> & { current_mtx_platform?: string; mtx_affiliate?: string } };
  [key: string]: unknown;
}

export interface VbucksEntry {
  templateId: string;
  category: string;
  platform?: string;
  amount: number;
}

export interface VbucksBalance {
  total: number;
  platform: string;
  entries: VbucksEntry[];
}

interface ProfileChange {
  changeType?: string;
  profile?: CommonCoreProfile;
}

function requireString(value: unknown, parameter: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`"${parameter}" is required and must be a non-empty string`, parameter);
  }
  return value;
}

export interface FortniteVersion {
  app: string;
  serverDate: string;
  overridePropertiesVersion: string;
  cln: string;
  build: string;
  moduleName: string;
  buildDate: string;
  version: string;
  branch: string;
  modules: Record<string, unknown>;
}

export interface GiftEligibilityResponse {
  price?: {
    currencyType?: string;
    currencySubType?: string;
    regularPrice?: number;
    dynamicRegularPrice?: number;
    finalPrice?: number;
    basePrice?: number;
    saleExpiration?: string;
  };
  items?: Array<{ templateId?: string; quantity?: number }>;
  ownership?: unknown[];
}

export class FortniteGameManager {
  constructor(
    private readonly rest: EpicRestClient,
    private readonly mcp: MCPClient,
  ) {}

  async giftEligibility(
    accessToken: string,
    recipientId: string,
    offerId: string,
    options?: { signal?: AbortSignal },
  ): Promise<GiftEligibilityResponse> {
    requireString(accessToken, 'accessToken');
    requireString(recipientId, 'recipientId');
    requireString(offerId, 'offerId');
    const path =
      `/fortnite/api/storefront/v2/gift/check_eligibility/recipient/${encodeURIComponent(recipientId)}` +
      `/offer/${encodeURIComponent(offerId)}`;
    const response = await this.rest.request<GiftEligibilityResponse>('GET', path, {
      bearer: accessToken,
      ...(options?.signal ? { signal: options.signal } : {}),
    });
    return response.data;
  }

  async version(options?: { signal?: AbortSignal }): Promise<FortniteVersion> {
    const response = await this.rest.request<FortniteVersion>('GET', '/fortnite/api/version', {
      ...(options?.signal ? { signal: options.signal } : {}),
    });
    return response.data;
  }

  async timeline(accessToken: string, options?: { signal?: AbortSignal }): Promise<Timeline> {
    requireString(accessToken, 'accessToken');
    const response = await this.rest.request<Timeline>('GET', '/fortnite/api/calendar/v1/timeline', {
      bearer: accessToken,
      ...(options?.signal ? { signal: options.signal } : {}),
    });
    return response.data;
  }

  async brInventory(
    accessToken: string,
    accountId: string,
    options?: { signal?: AbortSignal },
  ): Promise<BrInventory> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    const response = await this.rest.request<BrInventory>(
      'GET',
      `/fortnite/api/game/v2/br-inventory/account/${encodeURIComponent(accountId)}`,
      {
        bearer: accessToken,
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data;
  }

  async commonCore(
    accessToken: string,
    accountId: string,
    options?: { signal?: AbortSignal },
  ): Promise<CommonCoreProfile> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    const response = await this.mcp.queryProfile<ProfileChange>(
      accessToken,
      accountId,
      'common_core',
      options?.signal ? { signal: options.signal } : {},
    );
    const profile = response.profileChanges?.[0]?.profile;
    if (!profile) {
      throw new ValidationError('common_core profile was not returned by MCP', 'accountId');
    }
    return profile;
  }

  async vbucksBalance(
    accessToken: string,
    accountId: string,
    options?: { signal?: AbortSignal },
  ): Promise<VbucksBalance> {
    const profile = await this.commonCore(accessToken, accountId, options);
    const entries: VbucksEntry[] = [];
    for (const item of Object.values(profile.items ?? {})) {
      if (typeof item?.templateId !== 'string' || !item.templateId.startsWith(MTX_CURRENCY_PREFIX)) continue;
      const platform = typeof item.attributes?.platform === 'string' ? item.attributes.platform : undefined;
      entries.push({
        templateId: item.templateId,
        category:
          MTX_CATEGORY[item.templateId] ?? (item.templateId.slice(MTX_CURRENCY_PREFIX.length) || 'Unknown'),
        ...(platform ? { platform } : {}),
        amount: typeof item.quantity === 'number' ? item.quantity : 0,
      });
    }
    const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
    const current = profile.stats?.attributes?.current_mtx_platform;
    return { total, platform: typeof current === 'string' ? current : 'Unknown', entries };
  }

  async vbucks(
    accessToken: string,
    accountId: string,
    options?: { signal?: AbortSignal },
  ): Promise<number> {
    return (await this.vbucksBalance(accessToken, accountId, options)).total;
  }

  async mtxPlatform(
    accessToken: string,
    accountId: string,
    options?: { signal?: AbortSignal },
  ): Promise<string> {
    const profile = await this.commonCore(accessToken, accountId, options);
    const current = profile.stats?.attributes?.current_mtx_platform;
    return typeof current === 'string' ? current : 'Unknown';
  }

  async setMtxPlatform(
    accessToken: string,
    accountId: string,
    platform: MtxPlatform | (string & {}),
    options?: { signal?: AbortSignal },
  ): Promise<CommonCoreProfile | null> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    requireString(platform, 'platform');
    const response = await this.mcp.operation<ProfileChange>(accessToken, accountId, 'SetMtxPlatform', {
      profileId: 'common_core',
      payload: { newPlatform: platform },
      ...(options?.signal ? { signal: options.signal } : {}),
    });
    return response.profileChanges?.[0]?.profile ?? null;
  }

  async receipts(
    accessToken: string,
    accountId: string,
    options?: { signal?: AbortSignal },
  ): Promise<Receipt[]> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    const response = await this.rest.request<Receipt[]>(
      'GET',
      `/fortnite/api/game/v2/receipts/${encodeURIComponent(accountId)}`,
      {
        bearer: accessToken,
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data;
  }
}
