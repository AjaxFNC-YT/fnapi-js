import { ValidationError } from '../core/errors.js';
import type { QueryParams, RequestCacheOptions } from '../core/types.js';
import type { EpicRestClient } from './rest.js';

export const HABANERO_BASE_URL = 'https://fn-service-habanero-live-public.ogs.live.on.epicgames.com';

export const HABANERO_NAMESPACE = 'fortnite';

export const HABANERO_MAX_BULK_ACCOUNTS = 25;

export const RankingType = {
  BattleRoyaleBuild: 'ranked-br',
  BattleRoyaleCombined: 'ranked-br-combined',
  ZeroBuild: 'ranked-zb',
  RocketRacing: 'delmar-competitive',
  ReloadBuild: 'ranked_blastberry_build',
  ReloadZeroBuild: 'ranked_blastberry_nobuild',
  ReloadCombined: 'ranked-blastberry-combined',
  Ballistic: 'ranked-feral',
  OgBuild: 'ranked-figment-build',
  OgZeroBuild: 'ranked-figment-nobuild',
  Getaway: 'ranked-bling',
  GetawayZeroBuild: 'ranked-bling-nobuild',
  FallGuysCrownJam: 'ranked-pimlico',
  Arenas: 'ranked-squareclub',
} as const;

export type RankingType = (typeof RankingType)[keyof typeof RankingType];

export const RANKING_TYPES = Object.values(RankingType);

export function isRankingType(value: unknown): value is RankingType {
  return typeof value === 'string' && (RANKING_TYPES as string[]).includes(value);
}

export interface HabaneroTrack {
  gameId: string;
  trackguid: string;
  rankingType: string;
  beginTime: string;
  endTime: string;
  divisionCount: number;
  leaderboardTrackingEventId: string;
  metadata?: Record<string, unknown>;
}

export interface HabaneroProgress {
  gameId: string;
  trackguid: string;
  accountId: string;
  rankingType: string;
  lastUpdated: string;
  currentDivision: number;
  highestDivision: number;
  promotionProgress: number;
  currentPlayerRanking?: number;
  rankingRating?: number;
  highestRating?: number;
  startDivision?: number;
}

export interface HabaneroBaseOptions {
  namespace?: string;
  signal?: AbortSignal;
}

export interface HabaneroTracksOptions extends HabaneroBaseOptions {
  endsAfter?: string;
  rankingType?: RankingType | (string & {});
  cache?: boolean | RequestCacheOptions;
}

export interface HabaneroProgressOptions extends HabaneroBaseOptions {
  endsAfter?: string;
}

export interface HabaneroRankingTypeOptions extends HabaneroBaseOptions {
  endsAfter?: string;
}

function requireString(value: unknown, parameter: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`"${parameter}" is required and must be a non-empty string`, parameter);
  }
  return value;
}

function requireAccountIds(accountIds: unknown): string[] {
  if (!Array.isArray(accountIds) || accountIds.length === 0) {
    throw new ValidationError('"accountIds" must be a non-empty array', 'accountIds');
  }
  if (accountIds.length > HABANERO_MAX_BULK_ACCOUNTS) {
    throw new ValidationError(
      `"accountIds" accepts at most ${HABANERO_MAX_BULK_ACCOUNTS} ids per request`,
      'accountIds',
    );
  }
  return accountIds as string[];
}

export class HabaneroManager {
  private readonly namespace: string;

  constructor(
    private readonly rest: EpicRestClient,
    options?: { namespace?: string },
  ) {
    this.namespace = options?.namespace ?? HABANERO_NAMESPACE;
  }

  private base(namespace?: string): string {
    return `/api/v1/games/${encodeURIComponent(namespace ?? this.namespace)}`;
  }

  async tracks(accessToken: string, options?: HabaneroTracksOptions): Promise<HabaneroTrack[]> {
    requireString(accessToken, 'accessToken');
    const query: QueryParams = {};
    if (options?.endsAfter) query['endsAfter'] = options.endsAfter;
    if (options?.rankingType) query['rankingType'] = options.rankingType;
    const response = await this.rest.request<HabaneroTrack[]>(
      'GET',
      `${this.base(options?.namespace)}/tracks/query`,
      {
        bearer: accessToken,
        query,
        ...(options?.cache !== undefined ? { cache: options.cache } : {}),
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data;
  }

  async trackByGuid(
    accessToken: string,
    trackguid: string,
    options?: HabaneroBaseOptions,
  ): Promise<HabaneroTrack> {
    requireString(accessToken, 'accessToken');
    requireString(trackguid, 'trackguid');
    const response = await this.rest.request<HabaneroTrack>(
      'GET',
      `${this.base(options?.namespace)}/tracks/byGUID/${encodeURIComponent(trackguid)}`,
      {
        bearer: accessToken,
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data;
  }

  async activeTracks(
    accessToken: string,
    startDate: string,
    options?: HabaneroBaseOptions,
  ): Promise<HabaneroTrack[]> {
    requireString(accessToken, 'accessToken');
    requireString(startDate, 'startDate');
    const response = await this.rest.request<HabaneroTrack[]>(
      'GET',
      `${this.base(options?.namespace)}/tracks/activeBy/${encodeURIComponent(startDate)}`,
      {
        bearer: accessToken,
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data;
  }

  async progress(
    accessToken: string,
    accountId: string,
    trackguid: string,
    options?: HabaneroBaseOptions,
  ): Promise<HabaneroProgress> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    requireString(trackguid, 'trackguid');
    const response = await this.rest.request<HabaneroProgress>(
      'GET',
      `${this.base(options?.namespace)}/trackprogress/${encodeURIComponent(accountId)}/byTrack/${encodeURIComponent(trackguid)}`,
      {
        bearer: accessToken,
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data;
  }

  async allProgress(
    accessToken: string,
    accountId: string,
    options?: HabaneroProgressOptions,
  ): Promise<HabaneroProgress[]> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    const query: QueryParams = {};
    if (options?.endsAfter) query['endsAfter'] = options.endsAfter;
    const response = await this.rest.request<HabaneroProgress[]>(
      'GET',
      `${this.base(options?.namespace)}/trackprogress/${encodeURIComponent(accountId)}`,
      {
        bearer: accessToken,
        query,
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data;
  }

  async bulkProgress(
    accessToken: string,
    trackguid: string,
    accountIds: string[],
    options?: HabaneroBaseOptions,
  ): Promise<HabaneroProgress[]> {
    requireString(accessToken, 'accessToken');
    requireString(trackguid, 'trackguid');
    const ids = requireAccountIds(accountIds);
    const response = await this.rest.request<HabaneroProgress[]>(
      'POST',
      `${this.base(options?.namespace)}/trackprogress/byAccountIds/${encodeURIComponent(trackguid)}`,
      {
        bearer: accessToken,
        json: { accountIds: ids },
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data;
  }

  async bulkProgressByRankingType(
    accessToken: string,
    rankingType: RankingType | (string & {}),
    accountIds: string[],
    options?: HabaneroRankingTypeOptions,
  ): Promise<HabaneroProgress[]> {
    requireString(accessToken, 'accessToken');
    requireString(rankingType, 'rankingType');
    const ids = requireAccountIds(accountIds);
    const query: QueryParams = { rankingType };
    if (options?.endsAfter) query['endsAfter'] = options.endsAfter;
    const response = await this.rest.request<HabaneroProgress[]>(
      'POST',
      `${this.base(options?.namespace)}/trackprogress/bulkByRankingType`,
      {
        bearer: accessToken,
        query,
        json: { accountIds: ids },
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data;
  }
}
