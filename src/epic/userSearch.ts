import { ValidationError } from '../core/errors.js';
import type { QueryParams } from '../core/types.js';
import type { AccountManager } from './account.js';
import type { EpicRestClient } from './rest.js';
import type { EpicAccount } from './types.js';

export const USER_SEARCH_BASE_URL = 'https://user-search-service-prod.ol.epicgames.com';

export const UserSearchPlatform = {
  Epic: 'epic',
  PlayStation: 'psn',
  Xbox: 'xbl',
  Steam: 'steam',
  Nintendo: 'nsw',
} as const;

export type UserSearchPlatform = (typeof UserSearchPlatform)[keyof typeof UserSearchPlatform];

export const USER_SEARCH_PLATFORM_LIST = Object.values(UserSearchPlatform);

export function isUserSearchPlatform(value: unknown): value is UserSearchPlatform {
  return typeof value === 'string' && (USER_SEARCH_PLATFORM_LIST as string[]).includes(value);
}

export type UserSearchMatchType = 'exact' | 'prefix';

export interface UserSearchMatch {
  value: string;
  platform: UserSearchPlatform | (string & {});
}

export interface UserSearchResult {
  accountId: string;
  matches: UserSearchMatch[];
  matchType: UserSearchMatchType | (string & {});
  epicMutuals: number;
  sortPosition: number;
}

export interface ResolvedUserSearchResult extends UserSearchResult {
  displayName?: string;
  account?: EpicAccount;
}

export interface UserSearchOptions {
  platform?: UserSearchPlatform | (string & {});
  signal?: AbortSignal;
}

function requireString(value: unknown, parameter: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`"${parameter}" is required and must be a non-empty string`, parameter);
  }
  return value;
}

export class UserSearchManager {
  constructor(
    private readonly rest: EpicRestClient,
    private readonly accounts: AccountManager,
  ) {}

  async search(
    accessToken: string,
    accountId: string,
    prefix: string,
    options?: UserSearchOptions,
  ): Promise<UserSearchResult[]> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    requireString(prefix, 'prefix');
    const query: QueryParams = {
      prefix,
      platform: options?.platform ?? UserSearchPlatform.Epic,
    };
    const response = await this.rest.request<UserSearchResult[]>(
      'GET',
      `/api/v1/search/${encodeURIComponent(accountId)}`,
      {
        bearer: accessToken,
        query,
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data ?? [];
  }

  async searchResolved(
    accessToken: string,
    accountId: string,
    prefix: string,
    options?: UserSearchOptions,
  ): Promise<ResolvedUserSearchResult[]> {
    const results = await this.search(accessToken, accountId, prefix, options);
    if (results.length === 0) return [];
    const accounts = await this.accounts.resolveAccounts(
      accessToken,
      results.map((result) => result.accountId),
      options?.signal ? { signal: options.signal } : undefined,
    );
    return results.map((result) => {
      const account = accounts.get(result.accountId);
      return {
        ...result,
        ...(account ? { account, displayName: account.displayName } : {}),
      };
    });
  }
}
