import type {
  AccountType,
  BackendRarity,
  CosmeticSeries,
  CosmeticType,
  KeyFormat,
  Language,
  MatchMethod,
  Rarity,
  StatsImage,
  TimeWindow,
} from './enums.js';
import type { CacheOptions, FetchLike, QueryParams, RequestCacheOptions, RetryOptions } from '../core/types.js';

export interface FortniteAPIOptions {
  apiKey?: string;
  language?: Language;
  baseUrl?: string;
  timeout?: number;
  headers?: Record<string, string>;
  query?: QueryParams;
  responseFlags?: number | string;
  retry?: number | RetryOptions | false;
  cache?: boolean | CacheOptions;
  fetch?: FetchLike;
  userAgent?: string;
}

export interface BaseOptions {
  signal?: AbortSignal;
  timeout?: number;
  cache?: boolean | RequestCacheOptions;
  headers?: Record<string, string>;
}

export interface LanguageOptions extends BaseOptions {
  language?: Language;
}

export interface FlagOptions extends LanguageOptions {
  responseFlags?: number | string;
}

export interface AesOptions extends BaseOptions {
  keyFormat?: KeyFormat;
}

export interface StatsLookupOptions extends BaseOptions {
  accountType?: AccountType;
  timeWindow?: TimeWindow;
  image?: StatsImage;
}

export interface StatsByIdOptions extends BaseOptions {
  timeWindow?: TimeWindow;
  image?: StatsImage;
}

export interface CosmeticSearchParams {
  language?: Language;
  searchLanguage?: Language;
  matchMethod?: MatchMethod;
  id?: string;
  name?: string;
  description?: string;
  type?: CosmeticType | (string & {});
  displayType?: string;
  backendType?: string;
  rarity?: Rarity | (string & {});
  displayRarity?: string;
  backendRarity?: BackendRarity | (string & {});
  hasSeries?: boolean;
  series?: string;
  backendSeries?: CosmeticSeries | (string & {});
  hasSet?: boolean;
  set?: string;
  setText?: string;
  backendSet?: string;
  hasIntroduction?: boolean;
  backendIntroduction?: number;
  introductionChapter?: string | number;
  introductionSeason?: string | number;
  hasFeaturedImage?: boolean;
  hasVariants?: boolean;
  hasGameplayTags?: boolean;
  gameplayTag?: string;
  hasMetaTags?: boolean;
  metaTag?: string;
  hasDynamicPakId?: boolean;
  dynamicPakId?: string;
  added?: number | string | Date;
  addedSince?: number | string | Date;
  unseenFor?: number;
  lastAppearance?: number | string | Date;
}

export type CosmeticSearchOptions = FlagOptions;
