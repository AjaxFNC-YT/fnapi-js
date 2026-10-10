import { AbortError, ValidationError } from '../core/errors.js';
import type { QueryParams } from '../core/types.js';
import { sleep } from '../core/utils.js';
import { EpicAuthError } from './errors.js';
import type { AuthClient } from './clients.js';
import type { EpicRestClient } from './rest.js';
import type {
  DeviceAuthCredentials,
  DeviceCode,
  ExchangeCode,
  GrantType,
  KillType,
  OAuthToken,
  TokenType,
  VerifyResponse,
} from './types.js';

const TOKEN_PATH = '/account/api/oauth/token';
const VERIFY_PATH = '/account/api/oauth/verify';
const EXCHANGE_PATH = '/account/api/oauth/exchange';
const DEVICE_AUTHORIZATION_PATH = '/account/api/oauth/deviceAuthorization';
const KILL_SESSION_PATH = '/account/api/oauth/sessions/kill';

const EG1_DEFAULT_GRANTS = new Set<GrantType>([
  'device_auth',
  'authorization_code',
  'exchange_code',
  'refresh_token',
  'device_code',
  'continuation_token',
  'token_to_token',
  'external_auth',
  'otp',
  'password',
]);

export interface TokenRequestOptions {
  tokenType?: TokenType;
  includePerms?: boolean;
  deploymentId?: string;
  deviceId?: string;
  scope?: string | string[];
  signal?: AbortSignal;
  timeout?: number;
}

export interface ExchangeCodeOptions {
  consumingClientId?: string;
  codeChallenge?: string;
  codeChallengeMethod?: 'S256' | 'plain';
  signal?: AbortSignal;
  timeout?: number;
}

export interface DeviceCodePendingInfo {
  attempt: number;
  intervalMs: number;
  expiresInMs: number;
}

export interface DeviceCodePollOptions {
  signal?: AbortSignal;
  intervalMs?: number;
  maxAttempts?: number;
  expiresAt?: Date;
  onPending?: (info: DeviceCodePendingInfo) => void;
  onCanceled?: (error: EpicAuthError) => void;
}

function requireString(value: unknown, parameter: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`"${parameter}" is required and must be a non-empty string`, parameter);
  }
  return value;
}

function isPendingError(error: unknown): 'pending' | 'slow_down' | null {
  if (!(error instanceof EpicAuthError)) return null;
  const code = error.errorCode ?? '';
  if (code.includes('authorization_pending')) return 'pending';
  if (code.includes('slow_down')) return 'slow_down';
  return null;
}

const REPLAYABLE_GRANTS = new Set<GrantType>(['device_auth', 'client_credentials']);

export class AuthManager {
  constructor(private readonly rest: EpicRestClient) {}

  async token(
    client: AuthClient,
    grantType: GrantType,
    fields: Record<string, string | undefined>,
    options: TokenRequestOptions = {},
  ): Promise<OAuthToken> {
    const form: Record<string, string | undefined> = {
      grant_type: grantType,
      ...fields,
    };

    if (options.tokenType) form['token_type'] = options.tokenType;
    else if (EG1_DEFAULT_GRANTS.has(grantType)) form['token_type'] = 'eg1';
    if (options.includePerms !== undefined) form['includePerms'] = String(options.includePerms);
    if (options.deploymentId) form['deployment_id'] = options.deploymentId;
    if (options.scope) {
      form['scope'] = Array.isArray(options.scope) ? options.scope.join(' ') : options.scope;
    }

    const requestOptions = {
      form,
      basic: client,
      idempotent: REPLAYABLE_GRANTS.has(grantType),
      ...(options.deviceId ? { deviceId: options.deviceId } : {}),
      ...(options.signal ? { signal: options.signal } : {}),
      ...(options.timeout !== undefined ? { timeout: options.timeout } : {}),
    };

    const response = await this.rest.request<OAuthToken>('POST', TOKEN_PATH, requestOptions);
    return response.data;
  }

  clientCredentials(client: AuthClient, options?: TokenRequestOptions): Promise<OAuthToken> {
    return this.token(client, 'client_credentials', {}, options);
  }

  authorizationCode(
    client: AuthClient,
    code: string,
    options?: TokenRequestOptions & { codeVerifier?: string },
  ): Promise<OAuthToken> {
    requireString(code, 'code');
    return this.token(
      client,
      'authorization_code',
      { code, code_verifier: options?.codeVerifier },
      options,
    );
  }

  exchangeCode(
    client: AuthClient,
    code: string,
    options?: TokenRequestOptions & { codeVerifier?: string },
  ): Promise<OAuthToken> {
    requireString(code, 'code');
    return this.token(
      client,
      'exchange_code',
      { exchange_code: code, code_verifier: options?.codeVerifier },
      options,
    );
  }

  deviceAuth(
    client: AuthClient,
    credentials: DeviceAuthCredentials,
    options?: TokenRequestOptions,
  ): Promise<OAuthToken> {
    requireString(credentials?.accountId, 'accountId');
    requireString(credentials?.deviceId, 'deviceId');
    requireString(credentials?.secret, 'secret');
    return this.token(
      client,
      'device_auth',
      {
        account_id: credentials.accountId,
        device_id: credentials.deviceId,
        secret: credentials.secret,
      },
      options,
    );
  }

  deviceCode(client: AuthClient, deviceCode: string, options?: TokenRequestOptions): Promise<OAuthToken> {
    requireString(deviceCode, 'deviceCode');
    return this.token(client, 'device_code', { device_code: deviceCode }, options);
  }

  async pollDeviceCode(
    client: AuthClient,
    deviceCode: string,
    options: DeviceCodePollOptions = {},
  ): Promise<OAuthToken> {
    requireString(deviceCode, 'deviceCode');

    let intervalMs = Math.max(1, options.intervalMs ?? 10_000);
    const deadline = options.expiresAt?.getTime();
    const maxAttempts = options.maxAttempts ?? Number.POSITIVE_INFINITY;
    let attempt = 0;

    const fail = (error: unknown): never => {
      if (error instanceof EpicAuthError) options.onCanceled?.(error);
      throw error;
    };

    for (;;) {
      if (options.signal?.aborted) {
        throw new AbortError('Device code polling was aborted', { url: this.tokenUrl() });
      }
      if (deadline !== undefined && Date.now() >= deadline) {
        fail(this.deviceCodeError('Device code expired before it was authorized', 'device_code_expired'));
      }

      attempt += 1;

      try {
        return await this.deviceCode(
          client,
          deviceCode,
          options.signal ? { signal: options.signal } : undefined,
        );
      } catch (error) {
        const pending = isPendingError(error);
        if (!pending) fail(error);

        if (pending === 'slow_down') intervalMs += 5_000;
        if (attempt >= maxAttempts) fail(error);

        options.onPending?.({
          attempt,
          intervalMs,
          expiresInMs: deadline === undefined ? Number.POSITIVE_INFINITY : deadline - Date.now(),
        });

        try {
          await sleep(intervalMs, options.signal);
        } catch {
          throw new AbortError('Device code polling was aborted', { url: this.tokenUrl() });
        }
      }
    }
  }

  private tokenUrl(): string {
    return this.rest.buildUrl(TOKEN_PATH);
  }

  private deviceCodeError(message: string, code: string): EpicAuthError {
    return new EpicAuthError(message, {
      status: 400,
      method: 'POST',
      url: this.tokenUrl(),
      body: {
        errorCode: `errors.com.epicgames.account.oauth.${code}`,
        errorMessage: message,
      },
    });
  }

  refreshToken(
    client: AuthClient,
    refreshToken: string,
    options?: TokenRequestOptions,
  ): Promise<OAuthToken> {
    requireString(refreshToken, 'refreshToken');
    return this.token(client, 'refresh_token', { refresh_token: refreshToken }, options);
  }

  continuationToken(
    client: AuthClient,
    continuationToken: string,
    options?: TokenRequestOptions,
  ): Promise<OAuthToken> {
    requireString(continuationToken, 'continuationToken');
    return this.token(client, 'continuation_token', { continuation_token: continuationToken }, options);
  }

  password(
    client: AuthClient,
    username: string,
    passwordValue: string,
    options?: TokenRequestOptions,
  ): Promise<OAuthToken> {
    requireString(username, 'username');
    requireString(passwordValue, 'password');
    return this.token(client, 'password', { username, password: passwordValue }, options);
  }

  otp(
    client: AuthClient,
    otp: string,
    challenge: string,
    options?: TokenRequestOptions,
  ): Promise<OAuthToken> {
    requireString(otp, 'otp');
    requireString(challenge, 'challenge');
    return this.token(client, 'otp', { otp, challenge }, options);
  }

  externalAuth(
    client: AuthClient,
    externalAuthType: string,
    externalAuthToken: string,
    options?: TokenRequestOptions,
  ): Promise<OAuthToken> {
    requireString(externalAuthType, 'externalAuthType');
    requireString(externalAuthToken, 'externalAuthToken');
    return this.token(
      client,
      'external_auth',
      { external_auth_type: externalAuthType, external_auth_token: externalAuthToken },
      options,
    );
  }

  tokenToToken(client: AuthClient, accessToken: string, options?: TokenRequestOptions): Promise<OAuthToken> {
    requireString(accessToken, 'accessToken');
    return this.token(client, 'token_to_token', { access_token: accessToken }, options);
  }

  async verify(accessToken: string, options?: { includePerms?: boolean; signal?: AbortSignal }): Promise<VerifyResponse> {
    requireString(accessToken, 'accessToken');
    const query: QueryParams = {};
    if (options?.includePerms !== undefined) query['includePerms'] = options.includePerms;

    const response = await this.rest.request<VerifyResponse>('GET', VERIFY_PATH, {
      bearer: accessToken,
      query,
      ...(options?.signal ? { signal: options.signal } : {}),
    });
    return response.data;
  }

  async createExchangeCode(accessToken: string, options: ExchangeCodeOptions = {}): Promise<ExchangeCode> {
    requireString(accessToken, 'accessToken');
    const query: QueryParams = {};
    if (options.consumingClientId) query['consumingClientId'] = options.consumingClientId;
    if (options.codeChallenge) query['codeChallenge'] = options.codeChallenge;
    if (options.codeChallengeMethod) query['codeChallengeMethod'] = options.codeChallengeMethod;

    const response = await this.rest.request<ExchangeCode>('GET', EXCHANGE_PATH, {
      bearer: accessToken,
      query,
      ...(options.signal ? { signal: options.signal } : {}),
    });
    return response.data;
  }

  async createDeviceCode(clientAccessToken: string, options?: { signal?: AbortSignal }): Promise<DeviceCode> {
    requireString(clientAccessToken, 'clientAccessToken');
    const response = await this.rest.request<DeviceCode>('POST', DEVICE_AUTHORIZATION_PATH, {
      bearer: clientAccessToken,
      form: { prompt: 'login' },
      ...(options?.signal ? { signal: options.signal } : {}),
    });
    return response.data;
  }

  async deleteDeviceCode(clientAccessToken: string, userCode: string, options?: { signal?: AbortSignal }): Promise<void> {
    requireString(clientAccessToken, 'clientAccessToken');
    requireString(userCode, 'userCode');
    await this.rest.request<null>(
      'DELETE',
      `${DEVICE_AUTHORIZATION_PATH}/${encodeURIComponent(userCode)}`,
      {
        bearer: clientAccessToken,
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
  }

  async killSession(
    accessToken: string,
    options?: { killAllWithSameSource?: boolean; signal?: AbortSignal },
  ): Promise<void> {
    requireString(accessToken, 'accessToken');
    const query: QueryParams = {};
    if (options?.killAllWithSameSource !== undefined) {
      query['killAllWithSameSource'] = options.killAllWithSameSource;
    }

    await this.rest.request<null>(
      'DELETE',
      `${KILL_SESSION_PATH}/${encodeURIComponent(accessToken)}`,
      {
        bearer: accessToken,
        query,
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
  }

  async killSessions(
    accessToken: string,
    killType: KillType,
    options?: { signal?: AbortSignal },
  ): Promise<void> {
    requireString(accessToken, 'accessToken');
    await this.rest.request<null>('DELETE', KILL_SESSION_PATH, {
      bearer: accessToken,
      query: { killType },
      ...(options?.signal ? { signal: options.signal } : {}),
    });
  }
}
