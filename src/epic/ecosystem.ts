import { NotFoundError, ValidationError } from '../core/errors.js';
import type { QueryParams, RequestOptions } from '../core/types.js';
import type { RestClient } from '../fortnite/rest.js';

export const ECOSYSTEM_BASE_URL = 'https://api.fortnite.com/ecosystem/v1';

export const EcosystemRoutes = {
  islands: () => '/islands',
  island: (code: string) => `/islands/${encodeURIComponent(code)}`,
  islandMetrics: (code: string) => `/islands/${encodeURIComponent(code)}/metrics`,
  islandMetricsByInterval: (code: string, interval: string) =>
    `/islands/${encodeURIComponent(code)}/metrics/${encodeURIComponent(interval)}`,
  islandPeakCcu: (code: string, interval: string) =>
    `/islands/${encodeURIComponent(code)}/metrics/${encodeURIComponent(interval)}/peak-ccu`,
  islandFavorites: (code: string, interval: string) =>
    `/islands/${encodeURIComponent(code)}/metrics/${encodeURIComponent(interval)}/favorites`,
  islandMinutesPlayed: (code: string, interval: string) =>
    `/islands/${encodeURIComponent(code)}/metrics/${encodeURIComponent(interval)}/minutes-played`,
  islandAverageMinutesPerPlayer: (code: string, interval: string) =>
    `/islands/${encodeURIComponent(code)}/metrics/${encodeURIComponent(interval)}/average-minutes-per-player`,
  islandRecommendations: (code: string, interval: string) =>
    `/islands/${encodeURIComponent(code)}/metrics/${encodeURIComponent(interval)}/recommendations`,
  islandUniquePlayers: (code: string, interval: string) =>
    `/islands/${encodeURIComponent(code)}/metrics/${encodeURIComponent(interval)}/unique-players`,
  islandPlays: (code: string, interval: string) =>
    `/islands/${encodeURIComponent(code)}/metrics/${encodeURIComponent(interval)}/plays`,
  islandRetention: (code: string, interval: string) =>
    `/islands/${encodeURIComponent(code)}/metrics/${encodeURIComponent(interval)}/retention`,
  islandRankings: (code: string) => `/islands/${encodeURIComponent(code)}/rankings`,
  genres: () => '/genres',
  genreRankings: (slug: string) => `/genres/${encodeURIComponent(slug)}/rankings`,
  metrics: (interval: string) => `/metrics/${encodeURIComponent(interval)}`,
  inClientPeakCcu: (interval: string) =>
    `/metrics/${encodeURIComponent(interval)}/in-client-peak-ccu`,
  inMatchPeakCcu: (interval: string) =>
    `/metrics/${encodeURIComponent(interval)}/in-match-peak-ccu`,
} as const;

export const EcosystemInterval = {
  Day: 'day',
  Hour: 'hour',
  Minute: 'minute',
} as const;

export type EcosystemInterval = (typeof EcosystemInterval)[keyof typeof EcosystemInterval];

export const ECOSYSTEM_INTERVALS = Object.values(EcosystemInterval) as EcosystemInterval[];

export function isEcosystemInterval(value: unknown): value is EcosystemInterval {
  return typeof value === 'string' && (ECOSYSTEM_INTERVALS as string[]).includes(value);
}

export const IslandMetric = {
  AverageMinutesPerPlayer: 'averageMinutesPerPlayer',
  PeakCCU: 'peakCCU',
  Favorites: 'favorites',
  MinutesPlayed: 'minutesPlayed',
  Recommendations: 'recommendations',
  Plays: 'plays',
  UniquePlayers: 'uniquePlayers',
  Retention: 'retention',
} as const;

export type IslandMetric = (typeof IslandMetric)[keyof typeof IslandMetric];

export const ISLAND_METRICS = Object.values(IslandMetric) as IslandMetric[];

export function isIslandMetric(value: unknown): value is IslandMetric {
  return typeof value === 'string' && (ISLAND_METRICS as string[]).includes(value);
}

export const EcosystemMetric = {
  InMatchPeakCCU: 'inMatchPeakCCU',
  InClientPeakCCU: 'inClientPeakCCU',
} as const;

export type EcosystemMetric = (typeof EcosystemMetric)[keyof typeof EcosystemMetric];

export const ECOSYSTEM_METRICS = Object.values(EcosystemMetric) as EcosystemMetric[];

export function isEcosystemMetric(value: unknown): value is EcosystemMetric {
  return typeof value === 'string' && (ECOSYSTEM_METRICS as string[]).includes(value);
}

export type EcosystemDate = string | number | Date;

export interface EcosystemBaseOptions {
  signal?: AbortSignal;
  timeout?: number;
  cache?: boolean;
  headers?: Record<string, string>;
}

export interface EcosystemPageOptions extends EcosystemBaseOptions {
  after?: string;
  before?: string;
  size?: number;
}

export interface EcosystemRangeOptions extends EcosystemBaseOptions {
  from?: EcosystemDate;
  to?: EcosystemDate;
}

export interface EcosystemIslandMetricsOptions extends EcosystemRangeOptions {
  metrics?: IslandMetric[];
}

export interface EcosystemMetricsOptions extends EcosystemRangeOptions {
  metrics?: EcosystemMetric[];
}

export interface EcosystemGenreRankingOptions extends EcosystemPageOptions {
  at?: EcosystemDate;
}

export interface EcosystemIslandSummary {
  code: string;
  creatorCode?: string;
  displayName?: string;
  title: string;
  category?: string;
  createdIn?: string;
  tags: string[];
}

export interface EcosystemCursorMeta {
  meta: {
    page: {
      cursor: string;
    };
  };
}

export type EcosystemPaginatedIsland = EcosystemIslandSummary & EcosystemCursorMeta;

export interface EcosystemPaginationLinks {
  prev: string | null;
  next: string | null;
}

export interface EcosystemPageCursors {
  prevCursor: string | null;
  nextCursor: string | null;
}

export interface EcosystemPaginationMeta {
  count: number;
  page: EcosystemPageCursors;
}

export interface EcosystemIslandsResponse {
  links: EcosystemPaginationLinks;
  meta: EcosystemPaginationMeta;
  data: EcosystemPaginatedIsland[];
}

export interface EcosystemMetricValue {
  value: number | null;
  timestamp: string;
}

export type EcosystemMetricSeries = EcosystemMetricValue[];

export interface EcosystemMetricResponse {
  intervals?: EcosystemMetricValue[];
}

export interface EcosystemRetentionValue {
  d1: number | null;
  d7: number | null;
  timestamp: string;
}

export interface EcosystemRetentionResponse {
  intervals?: EcosystemRetentionValue[];
}

export interface EcosystemIslandMetricsResponse {
  averageMinutesPerPlayer: EcosystemMetricSeries;
  peakCCU: EcosystemMetricSeries;
  favorites: EcosystemMetricSeries;
  minutesPlayed: EcosystemMetricSeries;
  recommendations: EcosystemMetricSeries;
  retention?: EcosystemRetentionValue[];
  plays: EcosystemMetricSeries;
  uniquePlayers: EcosystemMetricSeries;
}

export interface EcosystemFilterableIslandMetricsResponse {
  averageMinutesPerPlayer?: EcosystemMetricSeries;
  peakCCU?: EcosystemMetricSeries;
  favorites?: EcosystemMetricSeries;
  minutesPlayed?: EcosystemMetricSeries;
  recommendations?: EcosystemMetricSeries;
  retention?: EcosystemRetentionValue[];
  plays?: EcosystemMetricSeries;
  uniquePlayers?: EcosystemMetricSeries;
}

export interface EcosystemMetricsResponse {
  inMatchPeakCCU: EcosystemMetricSeries;
  inClientPeakCCU: EcosystemMetricSeries;
}

export interface EcosystemFilterableMetricsResponse {
  inMatchPeakCCU?: EcosystemMetricSeries;
  inClientPeakCCU?: EcosystemMetricSeries;
}

export interface EcosystemGenre {
  slug: string;
  displayName: string;
}

export interface EcosystemGenreListResponse {
  data: EcosystemGenre[];
}

export interface EcosystemGenreRankingMeta {
  count: number;
  total: number;
  snapshotAvailable: boolean;
  snapshot: string | null;
  page: EcosystemPageCursors;
}

export type EcosystemGenreRankingItem = {
  islandCode: string;
  rank: number;
} & EcosystemCursorMeta;

export interface EcosystemGenreRankingResponse {
  links: EcosystemPaginationLinks;
  meta: EcosystemGenreRankingMeta;
  data: EcosystemGenreRankingItem[];
}

export interface EcosystemIslandRankingGenre {
  genreSlug: string;
  genre: string;
  rank: number;
}

export interface EcosystemIslandRankingSnapshot {
  timestamp: string;
  genres: EcosystemIslandRankingGenre[];
}

export interface EcosystemIslandRankingResponse {
  data: EcosystemIslandRankingSnapshot[];
}

export interface EcosystemErrorResponse {
  errorCode: string;
  errorMessage: string;
  uuid: string;
}

function toDateTime(value: EcosystemDate): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number') return new Date(value).toISOString();
  return value;
}

export class EcosystemEndpoint {
  protected readonly rest: RestClient;

  constructor(rest: RestClient) {
    this.rest = rest;
  }

  async islands(options?: EcosystemPageOptions): Promise<EcosystemIslandsResponse> {
    return this.fetchRaw<EcosystemIslandsResponse>(
      EcosystemRoutes.islands(),
      options,
      this.pageQuery(options),
    );
  }

  async island(code: string, options?: EcosystemBaseOptions): Promise<EcosystemIslandSummary> {
    this.requireString(code, 'code');
    return this.fetchRaw<EcosystemIslandSummary>(EcosystemRoutes.island(code), options, {});
  }

  async findIsland(
    code: string,
    options?: EcosystemBaseOptions,
  ): Promise<EcosystemIslandSummary | null> {
    try {
      return await this.island(code, options);
    } catch (error) {
      if (error instanceof NotFoundError) return null;
      throw error;
    }
  }

  async islandMetrics(
    code: string,
    options?: EcosystemRangeOptions,
  ): Promise<EcosystemIslandMetricsResponse> {
    this.requireString(code, 'code');
    return this.fetchRaw<EcosystemIslandMetricsResponse>(
      EcosystemRoutes.islandMetrics(code),
      options,
      this.rangeQuery(options),
    );
  }

  async islandMetricsByInterval(
    code: string,
    interval: EcosystemInterval,
    options?: EcosystemIslandMetricsOptions,
  ): Promise<EcosystemFilterableIslandMetricsResponse> {
    this.requireString(code, 'code');
    this.requireInterval(interval);
    const query = this.rangeQuery(options);
    if (options?.metrics && options.metrics.length > 0) query['metrics'] = options.metrics;
    return this.fetchRaw<EcosystemFilterableIslandMetricsResponse>(
      EcosystemRoutes.islandMetricsByInterval(code, interval),
      options,
      query,
    );
  }

  islandPeakCcu(
    code: string,
    interval: EcosystemInterval,
    options?: EcosystemRangeOptions,
  ): Promise<EcosystemMetricResponse> {
    return this.islandMetric(EcosystemRoutes.islandPeakCcu, code, interval, options);
  }

  islandFavorites(
    code: string,
    interval: EcosystemInterval,
    options?: EcosystemRangeOptions,
  ): Promise<EcosystemMetricResponse> {
    return this.islandMetric(EcosystemRoutes.islandFavorites, code, interval, options);
  }

  islandMinutesPlayed(
    code: string,
    interval: EcosystemInterval,
    options?: EcosystemRangeOptions,
  ): Promise<EcosystemMetricResponse> {
    return this.islandMetric(EcosystemRoutes.islandMinutesPlayed, code, interval, options);
  }

  islandAverageMinutesPerPlayer(
    code: string,
    interval: EcosystemInterval,
    options?: EcosystemRangeOptions,
  ): Promise<EcosystemMetricResponse> {
    return this.islandMetric(EcosystemRoutes.islandAverageMinutesPerPlayer, code, interval, options);
  }

  islandRecommendations(
    code: string,
    interval: EcosystemInterval,
    options?: EcosystemRangeOptions,
  ): Promise<EcosystemMetricResponse> {
    return this.islandMetric(EcosystemRoutes.islandRecommendations, code, interval, options);
  }

  islandUniquePlayers(
    code: string,
    interval: EcosystemInterval,
    options?: EcosystemRangeOptions,
  ): Promise<EcosystemMetricResponse> {
    return this.islandMetric(EcosystemRoutes.islandUniquePlayers, code, interval, options);
  }

  islandPlays(
    code: string,
    interval: EcosystemInterval,
    options?: EcosystemRangeOptions,
  ): Promise<EcosystemMetricResponse> {
    return this.islandMetric(EcosystemRoutes.islandPlays, code, interval, options);
  }

  async islandRetention(
    code: string,
    interval: EcosystemInterval,
    options?: EcosystemRangeOptions,
  ): Promise<EcosystemRetentionResponse> {
    this.requireString(code, 'code');
    this.requireInterval(interval);
    return this.fetchRaw<EcosystemRetentionResponse>(
      EcosystemRoutes.islandRetention(code, interval),
      options,
      this.rangeQuery(options),
    );
  }

  async islandRankings(
    code: string,
    options?: EcosystemRangeOptions,
  ): Promise<EcosystemIslandRankingResponse> {
    this.requireString(code, 'code');
    return this.fetchRaw<EcosystemIslandRankingResponse>(
      EcosystemRoutes.islandRankings(code),
      options,
      this.rangeQuery(options),
    );
  }

  async genres(options?: EcosystemBaseOptions): Promise<EcosystemGenreListResponse> {
    return this.fetchRaw<EcosystemGenreListResponse>(EcosystemRoutes.genres(), options, {});
  }

  async genreRankings(
    slug: string,
    options?: EcosystemGenreRankingOptions,
  ): Promise<EcosystemGenreRankingResponse> {
    this.requireString(slug, 'slug');
    const query = this.pageQuery(options);
    if (options?.at !== undefined) query['at'] = toDateTime(options.at);
    return this.fetchRaw<EcosystemGenreRankingResponse>(
      EcosystemRoutes.genreRankings(slug),
      options,
      query,
    );
  }

  async metrics(
    interval: EcosystemInterval,
    options?: EcosystemMetricsOptions,
  ): Promise<EcosystemFilterableMetricsResponse> {
    this.requireInterval(interval);
    const query = this.rangeQuery(options);
    if (options?.metrics && options.metrics.length > 0) query['metrics'] = options.metrics;
    return this.fetchRaw<EcosystemFilterableMetricsResponse>(
      EcosystemRoutes.metrics(interval),
      options,
      query,
    );
  }

  async inClientPeakCcu(
    interval: EcosystemInterval,
    options?: EcosystemRangeOptions,
  ): Promise<EcosystemMetricResponse> {
    this.requireInterval(interval);
    return this.fetchRaw<EcosystemMetricResponse>(
      EcosystemRoutes.inClientPeakCcu(interval),
      options,
      this.rangeQuery(options),
    );
  }

  async inMatchPeakCcu(
    interval: EcosystemInterval,
    options?: EcosystemRangeOptions,
  ): Promise<EcosystemMetricResponse> {
    this.requireInterval(interval);
    return this.fetchRaw<EcosystemMetricResponse>(
      EcosystemRoutes.inMatchPeakCcu(interval),
      options,
      this.rangeQuery(options),
    );
  }

  private async islandMetric(
    route: (code: string, interval: string) => string,
    code: string,
    interval: EcosystemInterval,
    options?: EcosystemRangeOptions,
  ): Promise<EcosystemMetricResponse> {
    this.requireString(code, 'code');
    this.requireInterval(interval);
    return this.fetchRaw<EcosystemMetricResponse>(
      route(code, interval),
      options,
      this.rangeQuery(options),
    );
  }

  private async fetchRaw<T>(
    path: string,
    options: EcosystemBaseOptions | undefined,
    query: QueryParams,
  ): Promise<T> {
    const response = await this.rest.get<T>(path, this.requestOptions(options, query));
    return response.body;
  }

  private requestOptions(
    options: EcosystemBaseOptions | undefined,
    query: QueryParams,
  ): RequestOptions {
    const requestOptions: RequestOptions = { query };

    if (options?.signal !== undefined) requestOptions.signal = options.signal;
    if (options?.timeout !== undefined) requestOptions.timeout = options.timeout;
    if (options?.cache !== undefined) requestOptions.cache = options.cache;
    if (options?.headers !== undefined) requestOptions.headers = options.headers;

    return requestOptions;
  }

  private pageQuery(options: EcosystemPageOptions | undefined): QueryParams {
    const query: QueryParams = {};
    if (options?.after !== undefined) query['after'] = options.after;
    if (options?.before !== undefined) query['before'] = options.before;
    if (options?.size !== undefined) query['size'] = options.size;
    return query;
  }

  private rangeQuery(options: EcosystemRangeOptions | undefined): QueryParams {
    const query: QueryParams = {};
    if (options?.from !== undefined) query['from'] = toDateTime(options.from);
    if (options?.to !== undefined) query['to'] = toDateTime(options.to);
    return query;
  }

  private requireString(value: unknown, parameter: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new ValidationError(
        `"${parameter}" is required and must be a non-empty string`,
        parameter,
      );
    }
    return value;
  }

  private requireInterval(value: string): EcosystemInterval {
    if (!isEcosystemInterval(value)) {
      throw new ValidationError(
        `"interval" must be one of ${ECOSYSTEM_INTERVALS.join(', ')}`,
        'interval',
      );
    }
    return value;
  }
}
