import { FortniteApiError } from '../core/errors.js';
import { describeEpicError } from './errorCodes.js';
import type { EpicErrorBody } from './types.js';

export interface EpicApiErrorContext {
  status: number;
  method: string;
  url: string;
  body: EpicErrorBody | string | null;
  headers?: Record<string, string>;
}

export class EpicApiError extends FortniteApiError {
  public override readonly name: string = 'EpicApiError';
  public readonly status: number;
  public readonly method: string;
  public readonly url: string;
  public readonly body: EpicErrorBody | string | null;
  public readonly headers: Record<string, string>;
  public readonly errorCode: string | null;
  public readonly numericErrorCode: number | null;
  public readonly messageVars: string[];
  public readonly description: string | null;

  constructor(message: string, context: EpicApiErrorContext) {
    super(message);
    this.status = context.status;
    this.method = context.method;
    this.url = context.url;
    this.body = context.body;
    this.headers = context.headers ?? {};

    const body = typeof context.body === 'object' && context.body !== null ? context.body : {};
    this.errorCode = body.errorCode ?? null;
    this.numericErrorCode = body.numericErrorCode ?? null;
    this.messageVars = Array.isArray(body.messageVars) ? body.messageVars : [];
    this.description = describeEpicError(this.errorCode);
  }
}

export class EpicAuthError extends EpicApiError {
  public override readonly name: string = 'EpicAuthError';
}

export class EpicPermissionError extends EpicApiError {
  public override readonly name: string = 'EpicPermissionError';
}

export class EpicNotFoundError extends EpicApiError {
  public override readonly name: string = 'EpicNotFoundError';
}

export class EpicRateLimitError extends EpicApiError {
  public override readonly name: string = 'EpicRateLimitError';
  public readonly retryAfterSeconds: number | null;

  constructor(message: string, context: EpicApiErrorContext) {
    super(message, context);
    const header = context.headers?.['retry-after'];
    const parsed = header !== undefined ? Number(header) : Number.NaN;
    this.retryAfterSeconds = Number.isFinite(parsed) ? parsed : null;
  }
}

const PERMISSION_ERROR_CODES = [
  'missing_permission',
  'policy_missing_action',
  'deployment_product_access_forbidden',
];

export function createEpicError(context: EpicApiErrorContext): EpicApiError {
  const body = context.body;
  let message = `Epic request failed with status ${context.status}`;

  if (typeof body === 'string' && body.trim().length > 0) {
    message = body.trim();
  } else if (body && typeof body === 'object') {
    message = body.errorMessage ?? body.error_description ?? body.error ?? message;
  }

  const errorCode = typeof body === 'object' && body !== null ? body.errorCode ?? '' : '';

  if (context.url.includes('/oauth/') || errorCode.includes('.oauth.')) {
    return new EpicAuthError(message, context);
  }
  if (context.status === 403 || PERMISSION_ERROR_CODES.some((code) => errorCode.includes(code))) {
    return new EpicPermissionError(message, context);
  }
  if (context.status === 404) {
    return new EpicNotFoundError(message, context);
  }
  if (context.status === 429) {
    return new EpicRateLimitError(message, context);
  }
  return new EpicApiError(message, context);
}
