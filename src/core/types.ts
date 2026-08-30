export type QueryPrimitive = string | number | boolean;

export type QueryValue =
  | QueryPrimitive
  | Array<QueryPrimitive | null | undefined>
  | null
  | undefined;

export type QueryParams = Record<string, QueryValue>;

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface RetryOptions {
  attempts?: number;
  minDelay?: number;
  maxDelay?: number;
  statusCodes?: number[];
}

export interface ResolvedRetryOptions {
  attempts: number;
  minDelay: number;
  maxDelay: number;
  statusCodes: number[];
}

export interface CacheOptions {
  enabled?: boolean;
  ttl?: number;
  maxEntries?: number;
}

export interface RequestOptions {
  query?: QueryParams;
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
  timeout?: number;
  cache?: boolean;
  retry?: number | false;
}
