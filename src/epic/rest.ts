import { USER_AGENT } from '../core/version.js';
import { AbortError, NetworkError, ParseError, TimeoutError } from '../core/errors.js';
import type { FetchLike, HttpMethod, QueryParams } from '../core/types.js';
import { backoffDelay, buildQuery, linkSignals, sleep } from '../core/utils.js';
import { createEpicError } from './errors.js';
import type { AuthClient } from './clients.js';
import type { EpicErrorBody } from './types.js';

export const EPIC_ACCOUNT_SERVICE = 'https://account-public-service-prod.ol.epicgames.com';

export interface EpicRestOptions {
  baseUrl?: string;
  timeout?: number;
  retry?: number;
  userAgent?: string;
  fetch?: FetchLike;
  headers?: Record<string, string>;
}

export interface EpicRequestOptions {
  query?: QueryParams;
  form?: Record<string, string | undefined>;
  json?: unknown;
  text?: string;
  body?: string | Uint8Array;
  contentType?: string;
  responseType?: 'json' | 'text' | 'binary';
  basic?: AuthClient;
  bearer?: string;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeout?: number;
  deviceId?: string;
}

export interface EpicResponse<T> {
  status: number;
  headers: Record<string, string>;
  data: T;
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function toBase64(value: string): string {
  if (typeof globalThis.btoa === 'function') {
    return globalThis.btoa(value);
  }
  return Buffer.from(value, 'utf8').toString('base64');
}

export function basicAuthHeader(client: AuthClient): string {
  return `Basic ${toBase64(`${client.clientId}:${client.clientSecret ?? ''}`)}`;
}

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key.toLowerCase()] = value;
  });
  return record;
}

function encodeForm(form: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(form)) {
    if (value !== undefined) params.append(key, value);
  }
  return params.toString();
}

export class EpicRestClient {
  public baseUrl: string;
  public timeout: number;

  private readonly retry: number;
  private readonly fetchImpl: FetchLike;
  private readonly defaultHeaders: Record<string, string>;

  constructor(options: EpicRestOptions = {}) {
    this.baseUrl = (options.baseUrl ?? EPIC_ACCOUNT_SERVICE).replace(/\/+$/, '');
    this.timeout = options.timeout ?? 30_000;
    this.retry = Math.max(1, options.retry ?? 3);

    this.defaultHeaders = {};
    for (const [key, value] of Object.entries(options.headers ?? {})) {
      this.defaultHeaders[key.toLowerCase()] = value;
    }
    this.defaultHeaders['accept'] = this.defaultHeaders['accept'] ?? 'application/json';
    this.defaultHeaders['user-agent'] = options.userAgent ?? this.defaultHeaders['user-agent'] ?? USER_AGENT;

    const fetchImpl = options.fetch ?? (globalThis.fetch as FetchLike | undefined);
    if (typeof fetchImpl !== 'function') {
      throw new TypeError(
        'No fetch implementation available. Use Node 18+ or pass a custom `fetch` option.',
      );
    }
    this.fetchImpl = fetchImpl;
  }

  buildUrl(path: string, query?: QueryParams): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}${normalizedPath}${buildQuery(query)}`;
  }

  async request<T>(
    method: HttpMethod,
    path: string,
    options: EpicRequestOptions = {},
  ): Promise<EpicResponse<T>> {
    const url = this.buildUrl(path, options.query);
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.retry; attempt += 1) {
      const link = linkSignals(options.signal, options.timeout ?? this.timeout);

      try {
        const response = await this.fetchImpl(url, {
          method,
          headers: this.composeHeaders(options),
          body: this.composeBody(options) as RequestInit['body'],
          signal: link.signal,
        });

        const headers = headersToRecord(response.headers);

        if (response.ok && options.responseType === 'binary') {
          const buffer = await response.arrayBuffer();
          return { status: response.status, headers, data: new Uint8Array(buffer) as unknown as T };
        }

        const text = await response.text();
        const data = parseBody(text, headers['content-type'], url, response.ok);

        if (!response.ok) {
          const error = createEpicError({
            status: response.status,
            method,
            url,
            body: data as EpicErrorBody | string | null,
            headers,
          });

          if (attempt < this.retry && RETRYABLE_STATUS.has(response.status)) {
            lastError = error;
            await sleep(backoffDelay(attempt, 500, 8_000), options.signal);
            continue;
          }

          throw error;
        }

        return { status: response.status, headers, data: data as T };
      } catch (error) {
        if (error instanceof ParseError) throw error;
        if (isEpicError(error)) throw error;

        const normalized = this.normalizeError(error, url, link.timedOut(), options);
        if (normalized instanceof AbortError) throw normalized;

        lastError = normalized;
        if (attempt >= this.retry) throw normalized;

        try {
          await sleep(backoffDelay(attempt, 500, 8_000), options.signal);
        } catch (interrupted) {
          throw this.normalizeError(interrupted, url, link.timedOut(), options);
        }
      } finally {
        link.dispose();
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new NetworkError('Epic request failed after all retry attempts', { url });
  }

  private composeHeaders(options: EpicRequestOptions): Record<string, string> {
    const headers: Record<string, string> = { ...this.defaultHeaders };

    if (options.basic) {
      headers['authorization'] = basicAuthHeader(options.basic);
    } else if (options.bearer) {
      headers['authorization'] = `Bearer ${options.bearer}`;
    }

    if (options.form !== undefined) {
      headers['content-type'] = 'application/x-www-form-urlencoded';
    } else if (options.json !== undefined) {
      headers['content-type'] = 'application/json';
    } else if (options.text !== undefined) {
      headers['content-type'] = 'text/plain';
    } else if (options.body !== undefined) {
      headers['content-type'] = options.contentType ?? 'application/octet-stream';
    }

    if (options.deviceId) {
      headers['x-epic-device-id'] = options.deviceId;
    }

    for (const [key, value] of Object.entries(options.headers ?? {})) {
      headers[key.toLowerCase()] = value;
    }

    return headers;
  }

  private composeBody(options: EpicRequestOptions): string | Uint8Array | undefined {
    if (options.form !== undefined) return encodeForm(options.form);
    if (options.json !== undefined) return JSON.stringify(options.json);
    if (options.text !== undefined) return options.text;
    if (options.body !== undefined) return options.body;
    return undefined;
  }

  private normalizeError(
    error: unknown,
    url: string,
    timedOut: boolean,
    options: EpicRequestOptions,
  ): Error {
    const isAbort =
      error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');

    if (timedOut && isAbort) {
      const timeout = options.timeout ?? this.timeout;
      return new TimeoutError(`Epic request to ${url} timed out after ${timeout}ms`, {
        timeout,
        url,
      });
    }

    if (isAbort || options.signal?.aborted === true) {
      return new AbortError(`Epic request to ${url} was aborted`, { url });
    }

    return new NetworkError(
      error instanceof Error ? error.message : `Network request to ${url} failed`,
      { url, cause: error },
    );
  }
}

function isEpicError(error: unknown): boolean {
  return error instanceof Error && error.name.startsWith('Epic');
}

function parseBody(
  text: string,
  contentType: string | undefined,
  url: string,
  ok: boolean,
): unknown {
  if (text.length === 0) return null;

  const looksJson =
    contentType?.includes('json') === true || /^\s*[[{]/.test(text) || /^\s*"/.test(text);

  if (!looksJson) return text;

  try {
    return JSON.parse(text) as unknown;
  } catch (cause) {
    if (!ok) return text;
    throw new ParseError('Failed to parse Epic response body as JSON', { url, raw: text, cause });
  }
}
