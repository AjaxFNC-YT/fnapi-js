import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AbortError,
  NetworkError,
  ParseError,
  TimeoutError,
  AuthenticationError,
  BadRequestError,
  ForbiddenError,
  GoneError,
  HttpError,
  NotFoundError,
  RateLimitError,
  ServerError,
} from '../../src/core/errors.js';
import { RestClient } from '../../src/fortnite/rest.js';
import { ApiResponse } from '../../src/core/response.js';
import { MemoryCache } from '../../src/core/cache.js';
import { DEFAULT_BASE_URL } from '../../src/fortnite/routes.js';
import { USER_AGENT } from '../../src/core/version.js';
import { createMockFetch, envelope, errorEnvelope, networkError } from '../helpers/mockFetch.js';
const FAST_RETRY = { attempts: 3, minDelay: 1, maxDelay: 5 };

async function captureError(promise: Promise<unknown>): Promise<Error> {
  try {
    await promise;
  } catch (error) {
    return error as Error;
  }

  throw new Error('Expected the request to reject');
}

describe('RestClient.buildUrl', () => {
  it('uses the default base url', () => {
    const mock = createMockFetch();
    const client = new RestClient({ fetch: mock.fetch });

    expect(client.baseUrl).toBe(DEFAULT_BASE_URL);
    expect(client.buildUrl('/v2/aes')).toBe(`${DEFAULT_BASE_URL}/v2/aes`);
  });

  it('strips trailing slashes from the base url', () => {
    const mock = createMockFetch();
    const client = new RestClient({ fetch: mock.fetch, baseUrl: 'https://example.com/api///' });

    expect(client.baseUrl).toBe('https://example.com/api');
    expect(client.buildUrl('/v2/aes')).toBe('https://example.com/api/v2/aes');
  });

  it('accepts paths with and without a leading slash', () => {
    const mock = createMockFetch();
    const client = new RestClient({ fetch: mock.fetch, baseUrl: 'https://example.com' });

    expect(client.buildUrl('/v2/aes')).toBe('https://example.com/v2/aes');
    expect(client.buildUrl('v2/aes')).toBe('https://example.com/v2/aes');
  });

  it('omits the query string when there are no usable parameters', () => {
    const mock = createMockFetch();
    const client = new RestClient({ fetch: mock.fetch });

    expect(client.buildUrl('/v2/aes')).toBe(`${DEFAULT_BASE_URL}/v2/aes`);
    expect(client.buildUrl('/v2/aes', { language: null, keyFormat: undefined })).toBe(
      `${DEFAULT_BASE_URL}/v2/aes`,
    );
  });

  it('serializes arrays, booleans and numbers and skips nullish values', () => {
    const mock = createMockFetch();
    const client = new RestClient({ fetch: mock.fetch });

    const params = new URL(
      client.buildUrl('/v2/cosmetics/br/search/ids', {
        id: ['first', 'second'],
        hasSeries: true,
        hasSet: false,
        responseFlags: 7,
        language: null,
        matchMethod: undefined,
      }),
    ).searchParams;

    expect(params.getAll('id')).toEqual(['first', 'second']);
    expect(params.get('hasSeries')).toBe('true');
    expect(params.get('hasSet')).toBe('false');
    expect(params.get('responseFlags')).toBe('7');
    expect(params.has('language')).toBe(false);
    expect(params.has('matchMethod')).toBe(false);
  });

  it('merges the client default query with the per-request query', () => {
    const mock = createMockFetch();
    const client = new RestClient({
      fetch: mock.fetch,
      query: { language: 'en', responseFlags: 1 },
    });

    const params = new URL(
      client.buildUrl('/v2/cosmetics', { language: 'de', name: 'Renegade' }),
    ).searchParams;

    expect(params.get('language')).toBe('de');
    expect(params.get('responseFlags')).toBe('1');
    expect(params.get('name')).toBe('Renegade');
  });

  it('applies the default query to outgoing requests', async () => {
    const mock = createMockFetch({ body: envelope(null) });
    const client = new RestClient({ fetch: mock.fetch, query: { language: 'en' } });

    await client.get('/v2/aes', { query: { keyFormat: 'hex' } });

    const request = mock.lastRequest();
    expect(request.path).toBe('/v2/aes');
    expect(request.query.get('language')).toBe('en');
    expect(request.query.get('keyFormat')).toBe('hex');
  });
});

describe('RestClient headers', () => {
  it('sends default accept and user-agent headers', async () => {
    const mock = createMockFetch({ body: envelope(null) });
    const client = new RestClient({ fetch: mock.fetch });

    await client.get('/v2/aes');

    const headers = mock.lastRequest().headers;
    expect(headers['accept']).toBe('application/json');
    expect(headers['user-agent']).toBe(USER_AGENT);
  });

  it('omits the authorization header without an api key', async () => {
    const mock = createMockFetch({ body: envelope(null) });
    const client = new RestClient({ fetch: mock.fetch });

    await client.get('/v2/aes');

    expect(client.hasApiKey()).toBe(false);
    expect(mock.lastRequest().headers['authorization']).toBeUndefined();
  });

  it('sends the authorization header when an api key is set', async () => {
    const mock = createMockFetch({ body: envelope(null) });
    const client = new RestClient({ fetch: mock.fetch, apiKey: 'test-key' });

    await client.get('/v2/aes');

    expect(client.hasApiKey()).toBe(true);
    expect(mock.lastRequest().headers['authorization']).toBe('test-key');
  });

  it('uses a custom user agent when provided', async () => {
    const mock = createMockFetch({ body: envelope(null) });
    const client = new RestClient({ fetch: mock.fetch, userAgent: 'custom-agent/1.0' });

    await client.get('/v2/aes');

    expect(mock.lastRequest().headers['user-agent']).toBe('custom-agent/1.0');
  });

  it('supports setHeader and removeHeader', async () => {
    const mock = createMockFetch({ body: envelope(null) });
    const client = new RestClient({ fetch: mock.fetch });

    expect(client.setHeader('X-Trace-Id', 'trace-1')).toBe(client);
    await client.get('/v2/aes');
    expect(mock.lastRequest().headers['x-trace-id']).toBe('trace-1');

    expect(client.removeHeader('X-Trace-Id')).toBe(client);
    await client.get('/v2/aes');
    expect(mock.lastRequest().headers['x-trace-id']).toBeUndefined();
  });

  it('lets per-request headers override the defaults', async () => {
    const mock = createMockFetch({ body: envelope(null) });
    const client = new RestClient({ fetch: mock.fetch, userAgent: 'client-agent/1.0' });

    await client.get('/v2/aes', { headers: { 'User-Agent': 'request-agent/1.0', Accept: 'text/plain' } });

    const headers = mock.lastRequest().headers;
    expect(headers['user-agent']).toBe('request-agent/1.0');
    expect(headers['accept']).toBe('text/plain');
  });

  it('adds a json content type for requests with a body', async () => {
    const mock = createMockFetch({ body: envelope(null) });
    const client = new RestClient({ fetch: mock.fetch });

    await client.post('/v2/aes', { body: { name: 'value' } });

    const request = mock.lastRequest();
    expect(request.method).toBe('POST');
    expect(request.headers['content-type']).toBe('application/json');
    expect(request.body).toBe('{"name":"value"}');
  });
});

describe('RestClient responses', () => {
  it('returns an ApiResponse for a successful GET', async () => {
    const payload = envelope({ aes: 'key' });
    const mock = createMockFetch({
      status: 200,
      body: payload,
      headers: { 'X-Request-Id': 'req-1' },
    });
    const client = new RestClient({ fetch: mock.fetch });

    const response = await client.get('/v2/aes');

    expect(response).toBeInstanceOf(ApiResponse);
    expect(response.ok).toBe(true);
    expect(response.failed).toBe(false);
    expect(response.status).toBe(200);
    expect(response.method).toBe('GET');
    expect(response.url).toBe(`${DEFAULT_BASE_URL}/v2/aes`);
    expect(response.cached).toBe(false);
    expect(response.body).toEqual(payload);
  });

  it('lowercases the header record and resolves headers case-insensitively', async () => {
    const mock = createMockFetch({
      status: 200,
      body: envelope(null),
      headers: { 'X-Request-Id': 'req-2' },
    });
    const client = new RestClient({ fetch: mock.fetch });

    const response = await client.get('/v2/aes');

    expect(Object.keys(response.headers)).toEqual(
      Object.keys(response.headers).map((key) => key.toLowerCase()),
    );
    expect(response.headers['x-request-id']).toBe('req-2');
    expect(response.header('X-Request-Id')).toBe('req-2');
    expect(response.header('Content-Type')).toBe('application/json; charset=utf-8');
    expect(response.header('content-type')).toBe(response.header('CONTENT-TYPE'));
  });
});

describe('RestClient error mapping', () => {
  const cases = [
    { status: 400, ctor: BadRequestError, name: 'BadRequestError' },
    { status: 401, ctor: AuthenticationError, name: 'AuthenticationError' },
    { status: 403, ctor: ForbiddenError, name: 'ForbiddenError' },
    { status: 404, ctor: NotFoundError, name: 'NotFoundError' },
    { status: 410, ctor: GoneError, name: 'GoneError' },
    { status: 429, ctor: RateLimitError, name: 'RateLimitError' },
    { status: 500, ctor: ServerError, name: 'ServerError' },
  ] as const;

  for (const testCase of cases) {
    it(`maps ${testCase.status} to ${testCase.name}`, async () => {
      const message = `failure ${testCase.status}`;
      const mock = createMockFetch({
        status: testCase.status,
        body: errorEnvelope(testCase.status, message),
      });
      const client = new RestClient({ fetch: mock.fetch, retry: false });

      const error = (await captureError(client.get('/v2/aes'))) as HttpError;

      expect(error).toBeInstanceOf(testCase.ctor);
      expect(error.name).toBe(testCase.name);
      expect(error.message).toBe(message);
      expect(error.status).toBe(testCase.status);
      expect(error.method).toBe('GET');
      expect(error.url).toBe(`${DEFAULT_BASE_URL}/v2/aes`);
    });
  }

  it('parses retryAfter from the retry-after header on 429', async () => {
    const mock = createMockFetch({
      status: 429,
      body: errorEnvelope(429, 'rate limited'),
      headers: { 'retry-after': '2' },
    });
    const client = new RestClient({ fetch: mock.fetch, retry: false });

    const error = (await captureError(client.get('/v2/aes'))) as RateLimitError;

    expect(error).toBeInstanceOf(RateLimitError);
    expect(error.retryAfter).toBe(2000);
    expect(error.headers['retry-after']).toBe('2');
  });
});

describe('RestClient retries', () => {
  it('retries a retryable status and then succeeds', async () => {
    const mock = createMockFetch(
      { status: 500, body: errorEnvelope(500, 'server error') },
      { status: 200, body: envelope({ recovered: true }) },
    );
    const client = new RestClient({ fetch: mock.fetch, retry: FAST_RETRY });

    const response = await client.get('/v2/aes');

    expect(mock.calls).toBe(2);
    expect(response.ok).toBe(true);
    expect(response.body).toEqual(envelope({ recovered: true }));
  });

  it('does not retry a 404', async () => {
    const mock = createMockFetch({ status: 404, body: errorEnvelope(404, 'not found') });
    const client = new RestClient({ fetch: mock.fetch, retry: FAST_RETRY });

    const error = await captureError(client.get('/v2/aes'));

    expect(error).toBeInstanceOf(NotFoundError);
    expect(mock.calls).toBe(1);
  });

  it('retries a thrown network error and then succeeds', async () => {
    const mock = createMockFetch(
      { throws: networkError() },
      { status: 200, body: envelope({ recovered: true }) },
    );
    const client = new RestClient({ fetch: mock.fetch, retry: FAST_RETRY });

    const response = await client.get('/v2/aes');

    expect(mock.calls).toBe(2);
    expect(response.ok).toBe(true);
  });

  it('throws a NetworkError once the attempts are exhausted', async () => {
    const mock = createMockFetch({ throws: networkError('ETIMEDOUT') });
    const client = new RestClient({
      fetch: mock.fetch,
      retry: { attempts: 2, minDelay: 1, maxDelay: 5 },
    });

    const error = (await captureError(client.get('/v2/aes'))) as NetworkError;

    expect(error).toBeInstanceOf(NetworkError);
    expect(error.url).toBe(`${DEFAULT_BASE_URL}/v2/aes`);
    expect(error.message).toBe('fetch failed: ETIMEDOUT');
    expect(mock.calls).toBe(2);
  });

  it('performs a single call when retry is false', async () => {
    const mock = createMockFetch({ status: 500, body: errorEnvelope(500, 'server error') });
    const client = new RestClient({ fetch: mock.fetch, retry: false });

    const error = await captureError(client.get('/v2/aes'));

    expect(error).toBeInstanceOf(ServerError);
    expect(mock.calls).toBe(1);
  });

  it('performs a single call when attempts is one', async () => {
    const mock = createMockFetch({ status: 500, body: errorEnvelope(500, 'server error') });
    const client = new RestClient({
      fetch: mock.fetch,
      retry: { attempts: 1, minDelay: 1, maxDelay: 5 },
    });

    await captureError(client.get('/v2/aes'));

    expect(mock.calls).toBe(1);
  });

  it('lets a per-request retry override disable retries', async () => {
    const mock = createMockFetch({ status: 500, body: errorEnvelope(500, 'server error') });
    const client = new RestClient({
      fetch: mock.fetch,
      retry: { attempts: 4, minDelay: 1, maxDelay: 5 },
    });

    await captureError(client.get('/v2/aes', { retry: false }));

    expect(mock.calls).toBe(1);
  });
});

describe('RestClient timeout and abort', () => {
  it('throws a TimeoutError when the response is slower than the timeout', async () => {
    const mock = createMockFetch({ status: 200, body: envelope(null), delay: 60 });
    const client = new RestClient({ fetch: mock.fetch, timeout: 20, retry: false });

    const error = (await captureError(client.get('/v2/aes'))) as TimeoutError;

    expect(error).toBeInstanceOf(TimeoutError);
    expect(error.timeout).toBe(20);
    expect(error.url).toBe(`${DEFAULT_BASE_URL}/v2/aes`);
  });

  it('honours a per-request timeout', async () => {
    const mock = createMockFetch({ status: 200, body: envelope(null), delay: 60 });
    const client = new RestClient({ fetch: mock.fetch, timeout: 5_000, retry: false });

    const error = (await captureError(client.get('/v2/aes', { timeout: 20 }))) as TimeoutError;

    expect(error).toBeInstanceOf(TimeoutError);
    expect(error.timeout).toBe(20);
  });

  it('throws an AbortError for an already aborted signal without retrying', async () => {
    const mock = createMockFetch({ status: 200, body: envelope(null), delay: 5 });
    const client = new RestClient({ fetch: mock.fetch, retry: FAST_RETRY });
    const controller = new AbortController();
    controller.abort();

    const error = (await captureError(
      client.get('/v2/aes', { signal: controller.signal }),
    )) as AbortError;

    expect(error).toBeInstanceOf(AbortError);
    expect(error.url).toBe(`${DEFAULT_BASE_URL}/v2/aes`);
    expect(mock.calls).toBe(1);
  });
});

describe('RestClient caching', () => {
  it('serves a repeated GET from the cache', async () => {
    const mock = createMockFetch({ status: 200, body: envelope({ id: 'aes' }) });
    const client = new RestClient({ fetch: mock.fetch, cache: { enabled: true, ttl: 1000 } });

    const first = await client.get('/v2/aes');
    const second = await client.get('/v2/aes');

    expect(mock.calls).toBe(1);
    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
    expect(second.body).toEqual(first.body);
    expect(second.status).toBe(first.status);
    expect(second.url).toBe(first.url);
  });

  it('treats different query strings as different cache keys', async () => {
    const mock = createMockFetch({ status: 200, body: envelope(null) });
    const client = new RestClient({ fetch: mock.fetch, cache: { enabled: true, ttl: 1000 } });

    await client.get('/v2/cosmetics', { query: { language: 'en' } });
    await client.get('/v2/cosmetics', { query: { language: 'de' } });
    await client.get('/v2/cosmetics', { query: { language: 'en' } });

    expect(mock.calls).toBe(2);
    expect(client.cache.size).toBe(2);
  });

  it('refetches after the cache is cleared', async () => {
    const mock = createMockFetch({ status: 200, body: envelope(null) });
    const client = new RestClient({ fetch: mock.fetch, cache: { enabled: true, ttl: 1000 } });

    await client.get('/v2/aes');
    client.cache.clear();
    const response = await client.get('/v2/aes');

    expect(mock.calls).toBe(2);
    expect(client.cache.size).toBe(1);
    expect(response.cached).toBe(false);
  });

  it('bypasses the cache for a per-request cache override', async () => {
    const mock = createMockFetch({ status: 200, body: envelope(null) });
    const client = new RestClient({ fetch: mock.fetch, cache: { enabled: true, ttl: 1000 } });

    await client.get('/v2/aes');
    const second = await client.get('/v2/aes', { cache: false });

    expect(mock.calls).toBe(2);
    expect(second.cached).toBe(false);
  });

  it('does not cache when caching is disabled', async () => {
    const mock = createMockFetch({ status: 200, body: envelope(null) });
    const client = new RestClient({ fetch: mock.fetch });

    await client.get('/v2/aes');
    await client.get('/v2/aes');

    expect(mock.calls).toBe(2);
    expect(client.cache.size).toBe(0);
  });
});

describe('RestClient body parsing', () => {
  it('returns a non-json body as a string', async () => {
    const mock = createMockFetch({ status: 200, body: 'plain text payload' });
    const client = new RestClient({ fetch: mock.fetch });

    const response = await client.get('/v2/aes');

    expect(response.body).toBe('plain text payload');
  });

  it('keeps a text/plain body that starts with a bracket as text', async () => {
    const ini = '[/Script/FortniteGame.FortGameData]\nKey=Value';
    const mock = createMockFetch({ status: 200, body: ini, headers: { 'content-type': 'text/plain; charset=utf-8' } });
    const client = new RestClient({ fetch: mock.fetch });

    const response = await client.get('/v1/cloudstorage/DefaultGame.ini');

    expect(response.body).toBe(ini);
  });

  it('returns null for an empty body', async () => {
    const mock = createMockFetch({ status: 200 });
    const client = new RestClient({ fetch: mock.fetch });

    const response = await client.get('/v2/aes');

    expect(response.body).toBeNull();
  });

  it('throws a ParseError for malformed json', async () => {
    const mock = createMockFetch({
      status: 200,
      body: '{"data": ',
      headers: { 'content-type': 'application/json' },
    });
    const client = new RestClient({ fetch: mock.fetch, retry: FAST_RETRY });

    const error = (await captureError(client.get('/v2/aes'))) as ParseError;

    expect(error).toBeInstanceOf(ParseError);
    expect(error.raw).toBe('{"data": ');
    expect(error.url).toBe(`${DEFAULT_BASE_URL}/v2/aes`);
    expect(mock.calls).toBe(1);
  });
});

describe('RestClient construction', () => {
  it('throws a TypeError when no fetch implementation is available', () => {
    vi.stubGlobal('fetch', undefined);

    try {
      expect(() => new RestClient()).toThrow(TypeError);
      expect(() => new RestClient()).toThrow(/No fetch implementation available/);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('accepts an injected fetch implementation', () => {
    const mock = createMockFetch();

    expect(() => new RestClient({ fetch: mock.fetch })).not.toThrow();
  });
});

describe('MemoryCache', () => {
  let cache: MemoryCache<string>;

  beforeEach(() => {
    cache = new MemoryCache<string>({ ttl: 1000, maxEntries: 3 });
  });

  it('stores and reads values', () => {
    expect(cache.get('missing')).toBeUndefined();
    expect(cache.has('missing')).toBe(false);
    expect(cache.size).toBe(0);

    cache.set('key', 'value');

    expect(cache.get('key')).toBe('value');
    expect(cache.has('key')).toBe(true);
    expect(cache.size).toBe(1);
  });

  it('overwrites an existing key without growing', () => {
    cache.set('key', 'first');
    cache.set('key', 'second');

    expect(cache.get('key')).toBe('second');
    expect(cache.size).toBe(1);
  });

  it('deletes and clears entries', () => {
    cache.set('a', '1');
    cache.set('b', '2');

    expect(cache.delete('a')).toBe(true);
    expect(cache.delete('a')).toBe(false);
    expect(cache.size).toBe(1);

    cache.clear();

    expect(cache.size).toBe(0);
    expect(cache.get('b')).toBeUndefined();
  });

  it('expires entries once the ttl has elapsed', () => {
    vi.useFakeTimers();

    try {
      cache.set('key', 'value');

      vi.advanceTimersByTime(999);
      expect(cache.get('key')).toBe('value');

      vi.advanceTimersByTime(2);
      expect(cache.get('key')).toBeUndefined();
      expect(cache.size).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('supports a per-entry ttl override', () => {
    vi.useFakeTimers();

    try {
      cache.set('short', 'value', 50);

      vi.advanceTimersByTime(100);
      expect(cache.has('short')).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('evicts the oldest entry once maxEntries is reached', () => {
    cache.set('a', '1');
    cache.set('b', '2');
    cache.set('c', '3');
    cache.set('d', '4');

    expect(cache.size).toBe(3);
    expect(cache.has('a')).toBe(false);
    expect(cache.has('b')).toBe(true);
    expect(cache.has('c')).toBe(true);
    expect(cache.has('d')).toBe(true);
  });

  it('keeps recently read entries when evicting', () => {
    cache.set('a', '1');
    cache.set('b', '2');
    cache.set('c', '3');

    expect(cache.get('a')).toBe('1');

    cache.set('d', '4');

    expect(cache.has('a')).toBe(true);
    expect(cache.has('b')).toBe(false);
  });

  it('drops expired entries on prune', () => {
    vi.useFakeTimers();

    try {
      cache.set('short', '1', 100);
      cache.set('long', '2', 5_000);

      vi.advanceTimersByTime(200);
      expect(cache.size).toBe(2);

      cache.prune();

      expect(cache.size).toBe(1);
      expect(cache.get('long')).toBe('2');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('RestClient hardening', () => {
  it('lowercases constructor headers so later overrides replace rather than duplicate them', async () => {
    const mock = createMockFetch({ body: envelope(null) });
    const client = new RestClient({
      fetch: mock.fetch,
      retry: false,
      headers: { 'X-Custom': 'one', 'User-Agent': 'ua-from-headers' },
    });

    client.setHeader('X-Custom', 'two');
    await client.get('/anything');

    const headers = mock.lastRequest().headers;
    expect(headers['x-custom']).toBe('two');
    expect(headers['X-Custom']).toBeUndefined();
    expect(headers['user-agent']).toBe('ua-from-headers');
    expect(headers['User-Agent']).toBeUndefined();
  });

  it('normalizes an abort that lands during retry backoff into an AbortError', async () => {
    const mock = createMockFetch({ throws: networkError() });
    const controller = new AbortController();
    const client = new RestClient({
      fetch: mock.fetch,
      retry: { attempts: 3, minDelay: 200, maxDelay: 200 },
    });

    setTimeout(() => controller.abort(), 10);

    const error = await captureError(client.get('/anything', { signal: controller.signal }));

    expect(error).toBeInstanceOf(AbortError);
    expect(error).not.toBeInstanceOf(ParseError);
  });

  it('keeps the http error when an error response carries malformed json', async () => {
    const mock = createMockFetch({
      status: 500,
      body: '{"status":500,',
      headers: { 'content-type': 'application/json' },
    });
    const client = new RestClient({ fetch: mock.fetch, retry: false });

    const error = await captureError(client.get('/anything'));

    expect(error).toBeInstanceOf(ServerError);
    expect(error).not.toBeInstanceOf(ParseError);
    expect((error as ServerError).status).toBe(500);
  });

  it('still retries a retryable status whose body is malformed json', async () => {
    const mock = createMockFetch(
      { status: 503, body: 'not json at all {', headers: { 'content-type': 'application/json' } },
      { body: envelope({ ok: true }) },
    );
    const client = new RestClient({ fetch: mock.fetch, retry: FAST_RETRY });

    const response = await client.get<{ status: number; data: { ok: boolean } }>('/anything');

    expect(response.ok).toBe(true);
    expect(response.body.data.ok).toBe(true);
    expect(mock.calls).toBe(2);
  });

  it('isolates cached bodies so a caller cannot mutate the cache', async () => {
    const mock = createMockFetch({ body: envelope({ items: ['a'] }) });
    const client = new RestClient({
      fetch: mock.fetch,
      retry: false,
      cache: { enabled: true, ttl: 5_000 },
    });

    type Payload = { status: number; data: { items: string[] } };

    const first = await client.get<Payload>('/anything');
    first.body.data.items.push('mutated');

    const second = await client.get<Payload>('/anything');

    expect(second.cached).toBe(true);
    expect(second.body.data.items).toEqual(['a']);
    expect(mock.calls).toBe(1);
  });

  it('isolates successive cache hits from each other', async () => {
    const mock = createMockFetch({ body: envelope({ items: ['a'] }) });
    const client = new RestClient({
      fetch: mock.fetch,
      retry: false,
      cache: { enabled: true, ttl: 5_000 },
    });

    type Payload = { status: number; data: { items: string[] } };

    await client.get<Payload>('/anything');
    const hitOne = await client.get<Payload>('/anything');
    hitOne.body.data.items.push('mutated');

    const hitTwo = await client.get<Payload>('/anything');

    expect(hitTwo.body.data.items).toEqual(['a']);
    expect(hitOne.headers).not.toBe(hitTwo.headers);
  });
});
