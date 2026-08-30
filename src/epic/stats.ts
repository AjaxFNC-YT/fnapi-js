import { ValidationError } from '../core/errors.js';
import type { QueryParams } from '../core/types.js';
import type { EpicRestClient } from './rest.js';

export const STATS_PROXY_BASE_URL = 'https://statsproxy-public-service-live.ol.epicgames.com';

export const STATS_APP_ID = 'Fortnite';

export const STATS_MAX_TIMESTAMP = 9223372036854774784;

export const StatsCategory = {
  Fish: 'collection_fish',
  Character: 'collection_character',
} as const;

export type StatsCategory = (typeof StatsCategory)[keyof typeof StatsCategory];

export interface UserStats {
  startTime: number;
  endTime: number;
  stats: Record<string, number>;
  accountId: string;
}

export interface LeaderboardEntry {
  account: string;
  value: number;
}

export interface Leaderboard {
  entries: LeaderboardEntry[];
  maxSize: number;
}

export interface UserStatsOptions {
  startTime?: number;
  endTime?: number;
  signal?: AbortSignal;
}

export interface StatsQueryOptions {
  appId?: string;
  startDate?: number;
  endDate?: number;
  stats?: string[];
  category?: StatsCategory | (string & {});
  signal?: AbortSignal;
}

export interface LeaderboardOptions {
  signal?: AbortSignal;
}

function requireString(value: unknown, parameter: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`"${parameter}" is required and must be a non-empty string`, parameter);
  }
  return value;
}

function requireStringList(value: unknown, parameter: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ValidationError(`"${parameter}" must be a non-empty array`, parameter);
  }
  return value as string[];
}

export class StatsProxyManager {
  constructor(private readonly rest: EpicRestClient) {}

  async userStats(
    accessToken: string,
    accountId: string,
    options?: UserStatsOptions,
  ): Promise<UserStats | null> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    const query: QueryParams = {};
    if (options?.startTime !== undefined) query['startTime'] = options.startTime;
    if (options?.endTime !== undefined) query['endTime'] = options.endTime;
    const response = await this.rest.request<UserStats | null>(
      'GET',
      `/statsproxy/api/statsv2/account/${encodeURIComponent(accountId)}`,
      {
        bearer: accessToken,
        query,
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data;
  }

  async userStatsBulk(
    accessToken: string,
    accountIds: string[],
    options?: StatsQueryOptions,
  ): Promise<UserStats[]> {
    requireString(accessToken, 'accessToken');
    const owners = requireStringList(accountIds, 'accountIds');
    const stats = options?.stats ?? [];
    if (options?.category === undefined && stats.length === 0) {
      throw new ValidationError(
        '"stats" must be a non-empty array unless a "category" is provided',
        'stats',
      );
    }
    const query: QueryParams = {};
    if (options?.category !== undefined) query['category'] = options.category;
    const response = await this.rest.request<UserStats[]>(
      'POST',
      '/statsproxy/api/statsv2/query',
      {
        bearer: accessToken,
        query,
        json: {
          appId: options?.appId ?? STATS_APP_ID,
          startDate: options?.startDate ?? 0,
          endDate: options?.endDate ?? STATS_MAX_TIMESTAMP,
          owners,
          stats,
        },
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data;
  }

  async leaderboard(
    accessToken: string,
    leaderboardName: string,
    options?: LeaderboardOptions,
  ): Promise<Leaderboard> {
    requireString(accessToken, 'accessToken');
    requireString(leaderboardName, 'leaderboardName');
    const response = await this.rest.request<Leaderboard>(
      'GET',
      `/statsproxy/api/statsv2/leaderboards/${encodeURIComponent(leaderboardName)}`,
      {
        bearer: accessToken,
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data;
  }
}
