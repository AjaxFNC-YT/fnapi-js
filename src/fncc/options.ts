import type { CacheOptions, FetchLike, QueryParams, RetryOptions } from '../core/types.js';

export interface FnccAPIOptions {
  baseUrl?: string;
  timeout?: number;
  headers?: Record<string, string>;
  query?: QueryParams;
  retry?: number | RetryOptions | false;
  cache?: boolean | CacheOptions;
  fetch?: FetchLike;
  userAgent?: string;
}

export interface FnccBaseOptions {
  signal?: AbortSignal;
  timeout?: number;
  cache?: boolean;
  headers?: Record<string, string>;
}

export interface FnccAssetsListOptions extends FnccBaseOptions {
  prefix?: string;
  extension?: string;
  offset?: number;
  limit?: number;
}

export interface FnccPageOptions extends FnccBaseOptions {
  offset?: number;
  limit?: number;
}

export interface FnccContentSearchOptions extends FnccBaseOptions {
  prefix?: string;
  extension?: string;
  limit?: number;
  maxFiles?: number;
  timeBudgetMs?: number;
  ignoreCase?: boolean;
}

export interface FnccSpritesOptions extends FnccBaseOptions {
  enabled?: boolean;
  library?: string;
}

export interface FnccCosmeticSearchOptions extends FnccBaseOptions {
  name?: string;
  description?: string;
  id?: string;
  artist?: string;
  album?: string;
  type?: string;
  rarity?: string;
  series?: string;
  set?: string;
  introduction?: string;
  matchMethod?: string;
  limit?: number;
  offset?: number;
}

export interface FnccImageOptions extends FnccBaseOptions {
  path: string;
  name?: string;
  format?: string;
  maxSize?: number;
}

export interface FnccFishOptions extends FnccBaseOptions {
  search?: string;
  rarity?: string;
  enabled?: boolean;
  needsProFishingRod?: boolean;
}

export interface FnccWeaponsOptions extends FnccBaseOptions {
  search?: string;
  category?: string;
  rarity?: string;
  ammo?: string;
  trigger?: string;
  type?: string;
  tag?: string;
  ranged?: boolean;
  melee?: boolean;
  hasIcon?: boolean;
  hasStats?: boolean;
  sort?: string;
  order?: string;
  limit?: number;
  offset?: number;
}

export interface FnccWeaponOptions extends FnccBaseOptions {
  includeRaw?: boolean;
}

export interface FnccPlaylistsOptions extends FnccBaseOptions {
  gameType?: string;
  tag?: string;
  tournament?: boolean;
  ranked?: boolean;
  limitedTime?: boolean;
  default?: boolean;
  fetchImages?: boolean;
}

export interface FnccPlaylistOptions extends FnccBaseOptions {
  fetchImages?: boolean;
}

export interface FnccItemShopOptions extends FnccBaseOptions {
  section?: string;
}

export interface FnccLookupOptions extends FnccBaseOptions {
  accountId?: string;
  name?: string;
  platform?: string;
  search?: string;
}

export interface FnccMnemonicListOptions extends FnccBaseOptions {
  type?: string;
}

export interface FnccMnemonicOptions extends FnccBaseOptions {
  related?: boolean;
}
