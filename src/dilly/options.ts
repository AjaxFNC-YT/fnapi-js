import type { CacheOptions, FetchLike, QueryParams, RetryOptions } from '../core/types.js';

export interface DillyAPIOptions {
  baseUrl?: string;
  timeout?: number;
  headers?: Record<string, string>;
  query?: QueryParams;
  retry?: number | RetryOptions | false;
  cache?: boolean | CacheOptions;
  fetch?: FetchLike;
  userAgent?: string;
}

export interface DillyBaseOptions {
  signal?: AbortSignal;
  timeout?: number;
  cache?: boolean;
  headers?: Record<string, string>;
}

export interface DillyVersionOptions extends DillyBaseOptions {
  version?: string;
}

export interface DillyPakOptions extends DillyVersionOptions {}

export interface DillyHotfixOptions extends DillyBaseOptions {
  lang?: string;
}

export interface DillyCosmeticsOptions extends DillyBaseOptions {
  type?: string;
}

export interface DillyBundlesFromOptions extends DillyBaseOptions {
  from: string;
}

export interface DillyExportOptions extends DillyVersionOptions {
  path: string;
  raw?: boolean;
}

export interface DillyExportPathOptions extends DillyVersionOptions {
  path: string;
}

export interface DillySearchOptions extends DillyBaseOptions {
  query: string;
  new?: boolean;
}
