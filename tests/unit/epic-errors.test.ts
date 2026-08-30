import { describe, expect, it } from 'vitest';
import {
  createEpicError,
  EpicApiError,
  EpicAuthError,
  EpicPermissionError,
  EpicNotFoundError,
  EpicRateLimitError,
} from '../../src/epic/errors.js';
import { EPIC_ERROR_DESCRIPTIONS, describeEpicError } from '../../src/epic/errorCodes.js';

describe('epic error descriptions', () => {
  it('maps a known error code to its documented description', () => {
    const description = describeEpicError('errors.com.epicgames.common.missing_permission');
    expect(typeof description).toBe('string');
    expect(description).toBe(
      EPIC_ERROR_DESCRIPTIONS['errors.com.epicgames.common.missing_permission'],
    );
  });

  it('returns null for unknown or empty codes', () => {
    expect(describeEpicError('errors.com.epicgames.not.a.real.code')).toBeNull();
    expect(describeEpicError(null)).toBeNull();
    expect(describeEpicError(undefined)).toBeNull();
    expect(describeEpicError('')).toBeNull();
  });

  it('attaches the documented description to a thrown error', () => {
    const error = createEpicError({
      status: 403,
      method: 'POST',
      url: 'https://account-public-service-prod.ol.epicgames.com/account/api/public/account/x/deviceAuth',
      body: {
        errorCode: 'errors.com.epicgames.common.missing_permission',
        errorMessage: "Sorry your login does not posses the permissions 'account:public:account:deviceAuths CREATE'",
        numericErrorCode: 1023,
        messageVars: ['account:public:account:deviceAuths', 'CREATE'],
      },
    });

    expect(error).toBeInstanceOf(EpicApiError);
    expect(error.errorCode).toBe('errors.com.epicgames.common.missing_permission');
    expect(error.numericErrorCode).toBe(1023);
    expect(error.description).toBe(
      EPIC_ERROR_DESCRIPTIONS['errors.com.epicgames.common.missing_permission'],
    );
    expect(error.description).toContain('permissions');
  });

  it('leaves description null when the code is not documented', () => {
    const error = createEpicError({
      status: 400,
      method: 'POST',
      url: 'https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token',
      body: { errorCode: 'errors.com.epicgames.account.oauth.some_new_code', errorMessage: 'nope' },
    });

    expect(error).toBeInstanceOf(EpicAuthError);
    expect(error.description).toBeNull();
  });

  it('classifies a permission failure as EpicPermissionError', () => {
    const error = createEpicError({
      status: 403,
      method: 'GET',
      url: 'https://account-public-service-prod.ol.epicgames.com/account/api/public/account/x/deviceAuth',
      body: {
        errorCode: 'errors.com.epicgames.common.missing_permission',
        errorMessage: "Sorry your login does not posses the permissions 'account:public:account:deviceAuths READ'",
      },
    });

    expect(error).toBeInstanceOf(EpicPermissionError);
    expect(error).toBeInstanceOf(EpicApiError);
    expect(error.name).toBe('EpicPermissionError');
  });

  it('classifies an EOS policy failure as EpicPermissionError even on a 400', () => {
    const error = createEpicError({
      status: 400,
      method: 'GET',
      url: 'https://api.epicgames.dev/user/v1/product-users',
      body: { errorCode: 'errors.com.epicgames.eos.connect.policy_missing_action', errorMessage: 'blocked' },
    });

    expect(error).toBeInstanceOf(EpicPermissionError);
  });

  it('classifies a 404 as EpicNotFoundError', () => {
    const error = createEpicError({
      status: 404,
      method: 'GET',
      url: 'https://account-public-service-prod.ol.epicgames.com/account/api/public/account/missing',
      body: { errorCode: 'errors.com.epicgames.account.account_not_found', errorMessage: 'no such account' },
    });

    expect(error).toBeInstanceOf(EpicNotFoundError);
    expect(error).toBeInstanceOf(EpicApiError);
  });

  it('classifies a 429 as EpicRateLimitError and parses retry-after', () => {
    const error = createEpicError({
      status: 429,
      method: 'GET',
      url: 'https://account-public-service-prod.ol.epicgames.com/account/api/public/account',
      body: { errorCode: 'errors.com.epicgames.common.throttled', errorMessage: 'slow down' },
      headers: { 'retry-after': '12' },
    });

    expect(error).toBeInstanceOf(EpicRateLimitError);
    expect((error as EpicRateLimitError).retryAfterSeconds).toBe(12);
  });

  it('keeps an oauth failure as EpicAuthError even with a 403 status', () => {
    const error = createEpicError({
      status: 403,
      method: 'POST',
      url: 'https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token',
      body: { errorCode: 'errors.com.epicgames.account.oauth.unauthorized_client', errorMessage: 'nope' },
    });

    expect(error).toBeInstanceOf(EpicAuthError);
    expect(error).not.toBeInstanceOf(EpicPermissionError);
  });

  it('exposes only account-service scoped codes', () => {
    const codes = Object.keys(EPIC_ERROR_DESCRIPTIONS);
    expect(codes.length).toBeGreaterThan(100);
    for (const code of codes) {
      expect(code).toMatch(/^errors\.com\.epicgames\.(account|common|oauth|accountportal)\./);
    }
  });
});
