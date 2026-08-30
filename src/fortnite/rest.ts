import { DEFAULT_BASE_URL } from './routes.js';
import { USER_AGENT } from '../core/version.js';
import {
  AbortError,
  createHttpError,
  HttpError,
  NetworkError,
  ParseError,
  parseRetryAfter,
  RateLimitError,
  TimeoutError,
} from '../core/errors.js';
import type {
  CacheOptions,
  FetchLike,
  HttpMethod,
  QueryParams,
  RequestOptions,
  ResolvedRetryOptions,
  RetryOptions,
} from '../core/types.js';
import type { FortniteAPIOptions } from './options.js';
import { backoffDelay, buildQuery, linkSignals, mergeQuery, sleep } from '../core/utils.js';
import { ApiResponse } from '../core/response.js';
import { MemoryCache } from '../core/cache.js';

const DEFAULT_RETRY: ResolvedRetryOptions = {
  attempts: 3,
  minDelay: 500,
  maxDelay: 8_000,
  statusCodes: [408, 425, 429, 500, 502, 503, 504],
};

function resolveRetry(retry: number | RetryOptions | false | undefined): ResolvedRetryOptions {
  if (retry === false) {
    return { ...DEFAULT_RETRY, attempts: 1 };
  }

  if (typeof retry === 'number') {
    return { ...DEFAULT_RETRY, attempts: Math.max(1, retry) };
  }

  if (retry && typeof retry === 'object') {
    return {
      attempts: Math.max(1, retry.attempts ?? DEFAULT_RETRY.attempts),
      minDelay: retry.minDelay ?? DEFAULT_RETRY.minDelay,
      maxDelay: retry.maxDelay ?? DEFAULT_RETRY.maxDelay,
      statusCodes: retry.statusCodes ?? DEFAULT_RETRY.statusCodes,
    };
  }

  return { ...DEFAULT_RETRY };
}

function resolveCache(cache: boolean | CacheOptions | undefined): {
  enabled: boolean;
  instance: MemoryCache<ApiResponse<unknown>>;
} {
  if (cache === true) {
    return { enabled: true, instance: new MemoryCache<ApiResponse<unknown>>() };
  }

  if (cache && typeof cache === 'object') {
    return {
      enabled: cache.enabled ?? true,
      instance: new MemoryCache<ApiResponse<unknown>>({
        ttl: cache.ttl,
        maxEntries: cache.maxEntries,
      }),
    };
  }

  return { enabled: false, instance: new MemoryCache<ApiResponse<unknown>>() };
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key.toLowerCase()] = value;
  });
  return record;
}

function looksLikeJson(text: string, contentType: string | undefined): boolean {
  return contentType?.includes('json') === true || /^\s*[[{]/.test(text) || /^\s*"/.test(text);
}

function parseBody(text: string, contentType: string | undefined, url: string): unknown {
  if (text.length === 0) return null;
  if (!looksLikeJson(text, contentType)) return text;

  try {
    return JSON.parse(text) as unknown;
  } catch (cause) {
    throw new ParseError('Failed to parse response body as JSON', { url, raw: text, cause });
  }
}

function parseErrorBody(text: string, contentType: string | undefined): unknown {
  if (text.length === 0) return null;
  if (!looksLikeJson(text, contentType)) return text;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function snapshot<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;

  try {
    return structuredClone(value);
  } catch {
    return value;
  }
}

export class RestClient {
  public baseUrl: string;
  public timeout: number;
  public readonly cache: MemoryCache<ApiResponse<unknown>>;

  private readonly defaultHeaders: Record<string, string>;
  private readonly defaultQuery: QueryParams;
  private readonly retry: ResolvedRetryOptions;
  private readonly cacheEnabled: boolean;
  private readonly fetchImpl: FetchLike;
  private apiKeyValue: string | null;

  constructor(options: FortniteAPIOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? DEFAULT_BASE_URL);
    this.timeout = options.timeout ?? 30_000;
    this.defaultHeaders = {};

    for (const [key, value] of Object.entries(options.headers ?? {})) {
      this.defaultHeaders[key.toLowerCase()] = value;
    }

    this.defaultQuery = { ...options.query };
    this.retry = resolveRetry(options.retry);
    this.apiKeyValue = options.apiKey ?? null;

    const cache = resolveCache(options.cache);
    this.cache = cache.instance;
    this.cacheEnabled = cache.enabled;

    const fetchImpl = options.fetch ?? (globalThis.fetch as FetchLike | undefined);
    if (typeof fetchImpl !== 'function') {
      throw new TypeError(
        'No fetch implementation available. Use Node 18+ or pass a custom `fetch` option.',
      );
    }
    this.fetchImpl = fetchImpl;

    this.defaultHeaders['accept'] = this.defaultHeaders['accept'] ?? 'application/json';
    this.defaultHeaders['user-agent'] =
      options.userAgent ?? this.defaultHeaders['user-agent'] ?? USER_AGENT;
  }

  get apiKey(): string | null {
    return this.apiKeyValue;
  }

  set apiKey(value: string | null) {
    this.apiKeyValue = value;
  }

  hasApiKey(): boolean {
    return typeof this.apiKeyValue === 'string' && this.apiKeyValue.length > 0;
  }

  setHeader(name: string, value: string): this {
    this.defaultHeaders[name.toLowerCase()] = value;
    return this;
  }

  removeHeader(name: string): this {
    delete this.defaultHeaders[name.toLowerCase()];
    return this;
  }

  buildUrl(path: string, query?: QueryParams): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}${normalizedPath}${buildQuery(mergeQuery(this.defaultQuery, query))}`;
  }

  get<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>('GET', path, options);
  }

  post<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, options);
  }

  async request<T>(
    method: HttpMethod,
    path: string,
    options: RequestOptions = {},
  ): Promise<ApiResponse<T>> {
    const url = this.buildUrl(path, options.query);
    const useCache = method === 'GET' && (options.cache ?? this.cacheEnabled);
    const cacheKey = `${method} ${url}`;

    if (useCache) {
      const hit = this.cache.get(cacheKey);
      if (hit) {
        return new ApiResponse<T>({
          status: hit.status,
          headers: { ...hit.headers },
          body: snapshot(hit.body) as T,
          url: hit.url,
          method: hit.method,
          cached: true,
        });
      }
    }

    const attempts =
      options.retry === false ? 1 : Math.max(1, options.retry ?? this.retry.attempts);

    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const link = linkSignals(options.signal, options.timeout ?? this.timeout);

      try {
        const response = await this.fetchImpl(url, {
          method,
          headers: this.composeHeaders(options.headers, options.body !== undefined),
          body: options.body === undefined ? undefined : JSON.stringify(options.body),
          signal: link.signal,
        });

        const text = await response.text();
        const headers = headersToRecord(response.headers);

        if (!response.ok) {
          const error = createHttpError({
            status: response.status,
            method,
            url,
            body: parseErrorBody(text, headers['content-type']),
            headers,
          });

          if (attempt < attempts && this.retry.statusCodes.includes(response.status)) {
            lastError = error;
            await sleep(this.retryDelay(attempt, error), options.signal);
            continue;
          }

          throw error;
        }

        const body = parseBody(text, headers['content-type'], url);

        if (useCache) {
          this.cache.set(
            cacheKey,
            new ApiResponse<unknown>({
              status: response.status,
              headers: { ...headers },
              body: snapshot(body),
              url,
              method,
            }),
          );
        }

        return new ApiResponse<T>({
          status: response.status,
          headers,
          body: body as T,
          url,
          method,
        });
      } catch (error) {
        if (error instanceof HttpError || error instanceof ParseError) throw error;

        const normalized = this.normalizeTransportError(error, url, link.timedOut(), options);
        if (normalized instanceof AbortError) throw normalized;

        lastError = normalized;
        if (attempt >= attempts) throw normalized;

        try {
          await sleep(
            backoffDelay(attempt, this.retry.minDelay, this.retry.maxDelay),
            options.signal,
          );
        } catch (interrupted) {
          throw this.normalizeTransportError(interrupted, url, link.timedOut(), options);
        }
      } finally {
        link.dispose();
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new NetworkError('Request failed after all retry attempts', { url });
  }

  private retryDelay(attempt: number, error: unknown): number {
    if (error instanceof RateLimitError && error.retryAfter !== null) {
      return Math.min(this.retry.maxDelay, error.retryAfter);
    }

    const header = error instanceof HttpError ? error.headers['retry-after'] : undefined;
    const retryAfter = parseRetryAfter(header);
    if (retryAfter !== null) {
      return Math.min(this.retry.maxDelay, retryAfter);
    }

    return backoffDelay(attempt, this.retry.minDelay, this.retry.maxDelay);
  }

  private normalizeTransportError(
    error: unknown,
    url: string,
    timedOut: boolean,
    options: RequestOptions,
  ): Error {
    const isAbort =
      error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');

    if (timedOut && isAbort) {
      const timeout = options.timeout ?? this.timeout;
      return new TimeoutError(`Request to ${url} timed out after ${timeout}ms`, { timeout, url });
    }

    if (isAbort || options.signal?.aborted === true) {
      return new AbortError(`Request to ${url} was aborted`, { url });
    }

    return new NetworkError(
      error instanceof Error ? error.message : `Network request to ${url} failed`,
      { url, cause: error },
    );
  }

  private composeHeaders(
    extra: Record<string, string> | undefined,
    hasBody: boolean,
  ): Record<string, string> {
    const headers: Record<string, string> = { ...this.defaultHeaders };

    if (this.hasApiKey()) {
      headers['authorization'] = this.apiKeyValue as string;
    }

    if (hasBody) {
      headers['content-type'] = headers['content-type'] ?? 'application/json';
    }

    for (const [key, value] of Object.entries(extra ?? {})) {
      headers[key.toLowerCase()] = value;
    }

    return headers;
  }
}
