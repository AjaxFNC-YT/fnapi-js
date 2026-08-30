import { describe, expect, it } from 'vitest';
import {
  AbortError,
  NetworkError,
  ParseError,
  TimeoutError,
  ValidationError,
  createHttpError,
  parseRetryAfter,
  FortniteApiError,
  AuthenticationError,
  BadRequestError,
  ForbiddenError,
  GoneError,
  HttpError,
  NotFoundError,
  RateLimitError,
  ServerError,
} from '../../src/core/errors.js';
const URL_UNDER_TEST = 'https://fortnite-api.com/v2/aes';
const CONTEXT = { status: 500, method: 'GET', url: URL_UNDER_TEST };

const httpInstances: Array<[string, HttpError]> = [
  ['HttpError', new HttpError('boom', CONTEXT)],
  ['BadRequestError', new BadRequestError('boom', CONTEXT)],
  ['AuthenticationError', new AuthenticationError('boom', CONTEXT)],
  ['ForbiddenError', new ForbiddenError('boom', CONTEXT)],
  ['NotFoundError', new NotFoundError('boom', CONTEXT)],
  ['GoneError', new GoneError('boom', CONTEXT)],
  ['RateLimitError', new RateLimitError('boom', CONTEXT)],
  ['ServerError', new ServerError('boom', CONTEXT)],
];

const clientInstances: Array<[string, FortniteApiError]> = [
  ['FortniteApiError', new FortniteApiError('boom')],
  ['ValidationError', new ValidationError('boom')],
  ['TimeoutError', new TimeoutError('boom', { timeout: 100, url: URL_UNDER_TEST })],
  ['AbortError', new AbortError('boom', { url: URL_UNDER_TEST })],
  ['NetworkError', new NetworkError('boom', { url: URL_UNDER_TEST })],
  ['ParseError', new ParseError('boom', { url: URL_UNDER_TEST, raw: 'raw' })],
];

describe('error hierarchy', () => {
  for (const [name, error] of [...httpInstances, ...clientInstances]) {
    it(`${name} extends FortniteApiError and Error`, () => {
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(FortniteApiError);
      expect(error.name).toBe(name);
      expect(error.message).toBe('boom');
      expect(typeof error.stack).toBe('string');
    });
  }

  for (const [name, error] of httpInstances) {
    it(`${name} extends HttpError and carries the request context`, () => {
      expect(error).toBeInstanceOf(HttpError);
      expect(error.status).toBe(500);
      expect(error.method).toBe('GET');
      expect(error.url).toBe(URL_UNDER_TEST);
      expect(error.headers).toEqual({});
    });
  }

  it('does not treat client errors as HttpError', () => {
    for (const [, error] of clientInstances) {
      expect(error).not.toBeInstanceOf(HttpError);
    }
  });
});

describe('createHttpError', () => {
  const base = { method: 'GET', url: URL_UNDER_TEST };

  const cases = [
    { status: 400, ctor: BadRequestError, name: 'BadRequestError' },
    { status: 401, ctor: AuthenticationError, name: 'AuthenticationError' },
    { status: 403, ctor: ForbiddenError, name: 'ForbiddenError' },
    { status: 404, ctor: NotFoundError, name: 'NotFoundError' },
    { status: 410, ctor: GoneError, name: 'GoneError' },
    { status: 429, ctor: RateLimitError, name: 'RateLimitError' },
    { status: 500, ctor: ServerError, name: 'ServerError' },
    { status: 503, ctor: ServerError, name: 'ServerError' },
  ] as const;

  for (const testCase of cases) {
    it(`returns ${testCase.name} for status ${testCase.status}`, () => {
      const error = createHttpError({
        ...base,
        status: testCase.status,
        body: { error: 'something broke' },
      });

      expect(error).toBeInstanceOf(testCase.ctor);
      expect(error.name).toBe(testCase.name);
      expect(error.status).toBe(testCase.status);
      expect(error.method).toBe('GET');
      expect(error.url).toBe(URL_UNDER_TEST);
      expect(error.message).toBe('something broke');
    });
  }

  it('falls back to the base HttpError for other statuses', () => {
    const error = createHttpError({ ...base, status: 418, body: { error: 'teapot' } });

    expect(error).toBeInstanceOf(HttpError);
    expect(error).not.toBeInstanceOf(ServerError);
    expect(error.name).toBe('HttpError');
    expect(error.status).toBe(418);
  });

  it('extracts the message from an error field', () => {
    const error = createHttpError({ ...base, status: 400, body: { error: 'from error' } });

    expect(error.message).toBe('from error');
  });

  it('extracts the message from a message field', () => {
    const error = createHttpError({ ...base, status: 400, body: { message: 'from message' } });

    expect(error.message).toBe('from message');
  });

  it('extracts the message from an errorMessage field', () => {
    const error = createHttpError({
      ...base,
      status: 400,
      body: { errorMessage: 'from errorMessage' },
    });

    expect(error.message).toBe('from errorMessage');
  });

  it('prefers the error field over the message field', () => {
    const error = createHttpError({
      ...base,
      status: 400,
      body: { error: 'from error', message: 'from message' },
    });

    expect(error.message).toBe('from error');
  });

  it('extracts the message from a plain string body', () => {
    const error = createHttpError({ ...base, status: 400, body: '  plain failure  ' });

    expect(error.message).toBe('plain failure');
  });

  const unusableBodies: Array<[string, unknown]> = [
    ['null', null],
    ['undefined', undefined],
    ['an empty string', ''],
    ['a blank string', '   '],
    ['an empty object', {}],
    ['a number', 42],
    ['an object without message fields', { data: { id: 1 } }],
  ];

  for (const [label, body] of unusableBodies) {
    it(`falls back to a status message for ${label}`, () => {
      const error = createHttpError({ ...base, status: 502, body });

      expect(error.message).toBe('Request failed with status 502');
      expect(error.body).toBe(body);
    });
  }

  it('stores the response headers', () => {
    const error = createHttpError({
      ...base,
      status: 500,
      headers: { 'x-request-id': 'req-1' },
    });

    expect(error.headers).toEqual({ 'x-request-id': 'req-1' });
  });

  it('parses retryAfter for a rate limited response', () => {
    const error = createHttpError({
      ...base,
      status: 429,
      body: { error: 'rate limited' },
      headers: { 'retry-after': '3' },
    }) as RateLimitError;

    expect(error).toBeInstanceOf(RateLimitError);
    expect(error.retryAfter).toBe(3000);
  });

  it('leaves retryAfter null without a retry-after header', () => {
    const error = createHttpError({ ...base, status: 429, body: { error: 'rate limited' } }) as RateLimitError;

    expect(error.retryAfter).toBeNull();
  });
});

describe('parseRetryAfter', () => {
  it('converts numeric seconds to milliseconds', () => {
    expect(parseRetryAfter('1')).toBe(1000);
    expect(parseRetryAfter('30')).toBe(30_000);
    expect(parseRetryAfter('1.5')).toBe(1500);
  });

  it('clamps negative seconds to zero', () => {
    expect(parseRetryAfter('-5')).toBe(0);
  });

  it('converts an http date to the remaining milliseconds', () => {
    const value = parseRetryAfter(new Date(Date.now() + 5_000).toUTCString());

    expect(value).not.toBeNull();
    expect(value as number).toBeGreaterThanOrEqual(3_900);
    expect(value as number).toBeLessThanOrEqual(5_100);
  });

  it('returns zero for an http date in the past', () => {
    expect(parseRetryAfter(new Date(Date.now() - 60_000).toUTCString())).toBe(0);
  });

  it('returns null for missing or unparsable values', () => {
    expect(parseRetryAfter(null)).toBeNull();
    expect(parseRetryAfter(undefined)).toBeNull();
    expect(parseRetryAfter('')).toBeNull();
    expect(parseRetryAfter('not-a-date')).toBeNull();
    expect(parseRetryAfter('soon')).toBeNull();
  });
});

describe('client error details', () => {
  it('exposes the offending parameter on ValidationError', () => {
    expect(new ValidationError('invalid name', 'name').parameter).toBe('name');
    expect(new ValidationError('invalid request').parameter).toBeNull();
  });

  it('exposes the timeout and url on TimeoutError', () => {
    const error = new TimeoutError('timed out', { timeout: 250, url: URL_UNDER_TEST });

    expect(error.timeout).toBe(250);
    expect(error.url).toBe(URL_UNDER_TEST);
  });

  it('exposes the url on AbortError', () => {
    expect(new AbortError('aborted', { url: URL_UNDER_TEST }).url).toBe(URL_UNDER_TEST);
  });

  it('exposes the cause on NetworkError', () => {
    const cause = new Error('ECONNRESET');
    const error = new NetworkError('request failed', { url: URL_UNDER_TEST, cause });

    expect(error.cause).toBe(cause);
    expect(error.url).toBe(URL_UNDER_TEST);
    expect(new NetworkError('request failed', { url: URL_UNDER_TEST }).cause).toBeUndefined();
  });

  it('exposes the raw payload on ParseError', () => {
    const cause = new SyntaxError('Unexpected end of JSON input');
    const error = new ParseError('failed to parse', {
      url: URL_UNDER_TEST,
      raw: '{"data": ',
      cause,
    });

    expect(error.raw).toBe('{"data": ');
    expect(error.url).toBe(URL_UNDER_TEST);
    expect(error.cause).toBe(cause);
  });
});
