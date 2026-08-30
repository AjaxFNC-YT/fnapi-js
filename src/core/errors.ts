export class FortniteApiError extends Error {
  public override readonly name: string = 'FortniteApiError';

  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    if (options?.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
    Object.setPrototypeOf(this, new.target.prototype);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, new.target);
    }
  }
}

export interface HttpErrorContext {
  status: number;
  method: string;
  url: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export class HttpError extends FortniteApiError {
  public override readonly name: string = 'HttpError';
  public readonly status: number;
  public readonly method: string;
  public readonly url: string;
  public readonly body: unknown;
  public readonly headers: Record<string, string>;

  constructor(message: string, context: HttpErrorContext) {
    super(message);
    this.status = context.status;
    this.method = context.method;
    this.url = context.url;
    this.body = context.body;
    this.headers = context.headers ?? {};
  }
}

export class BadRequestError extends HttpError {
  public override readonly name: string = 'BadRequestError';
}

export class AuthenticationError extends HttpError {
  public override readonly name: string = 'AuthenticationError';
}

export class ForbiddenError extends HttpError {
  public override readonly name: string = 'ForbiddenError';
}

export class NotFoundError extends HttpError {
  public override readonly name: string = 'NotFoundError';
}

export class GoneError extends HttpError {
  public override readonly name: string = 'GoneError';
}

export class ConflictError extends HttpError {
  public override readonly name: string = 'ConflictError';
}

export class RateLimitError extends HttpError {
  public override readonly name: string = 'RateLimitError';
  public readonly retryAfter: number | null;

  constructor(message: string, context: HttpErrorContext & { retryAfter?: number | null }) {
    super(message, context);
    this.retryAfter = context.retryAfter ?? null;
  }
}

export class ServerError extends HttpError {
  public override readonly name: string = 'ServerError';
}

export class ValidationError extends FortniteApiError {
  public override readonly name: string = 'ValidationError';
  public readonly parameter: string | null;

  constructor(message: string, parameter?: string) {
    super(message);
    this.parameter = parameter ?? null;
  }
}

export class ConfigurationError extends FortniteApiError {
  public override readonly name: string = 'ConfigurationError';
  public readonly option: string | null;

  constructor(message: string, option?: string) {
    super(message);
    this.option = option ?? null;
  }
}

export class TimeoutError extends FortniteApiError {
  public override readonly name: string = 'TimeoutError';
  public readonly timeout: number;
  public readonly url: string;

  constructor(message: string, context: { timeout: number; url: string }) {
    super(message);
    this.timeout = context.timeout;
    this.url = context.url;
  }
}

export class AbortError extends FortniteApiError {
  public override readonly name: string = 'AbortError';
  public readonly url: string;

  constructor(message: string, context: { url: string }) {
    super(message);
    this.url = context.url;
  }
}

export class NetworkError extends FortniteApiError {
  public override readonly name: string = 'NetworkError';
  public readonly url: string;

  constructor(message: string, context: { url: string; cause?: unknown }) {
    super(message, { cause: context.cause });
    this.url = context.url;
  }
}

export class ParseError extends FortniteApiError {
  public override readonly name: string = 'ParseError';
  public readonly url: string;
  public readonly raw: string;

  constructor(message: string, context: { url: string; raw: string; cause?: unknown }) {
    super(message, { cause: context.cause });
    this.url = context.url;
    this.raw = context.raw;
  }
}

function extractMessage(status: number, body: unknown): string {
  if (typeof body === 'string' && body.trim().length > 0) {
    return body.trim();
  }

  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    const candidate = record['error'] ?? record['message'] ?? record['errorMessage'];
    if (typeof candidate === 'string' && candidate.length > 0) {
      return candidate;
    }
  }

  return `Request failed with status ${status}`;
}

export function parseRetryAfter(value: string | undefined | null): number | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (trimmed.length === 0) return null;

  const seconds = Number(trimmed);
  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1000);
  }

  const date = Date.parse(trimmed);
  return Number.isNaN(date) ? null : Math.max(0, date - Date.now());
}

export function createHttpError(context: HttpErrorContext): HttpError {
  const message = extractMessage(context.status, context.body);

  switch (context.status) {
    case 400:
      return new BadRequestError(message, context);
    case 401:
      return new AuthenticationError(message, context);
    case 403:
      return new ForbiddenError(message, context);
    case 404:
      return new NotFoundError(message, context);
    case 409:
      return new ConflictError(message, context);
    case 410:
      return new GoneError(message, context);
    case 429:
      return new RateLimitError(message, {
        ...context,
        retryAfter: parseRetryAfter(context.headers?.['retry-after']),
      });
    default:
      break;
  }

  if (context.status >= 500) {
    return new ServerError(message, context);
  }

  return new HttpError(message, context);
}
