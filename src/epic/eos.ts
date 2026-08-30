import { ValidationError } from '../core/errors.js';
import type { AuthClient } from './clients.js';
import type { EpicRestClient } from './rest.js';

export const EOS_AUTH_BASE_URL = 'https://api.epicgames.dev';
export const LOCKER_BASE_URL = 'https://fngw-svc-gc-livefn.ol.epicgames.com';
export const FN_LIVE_DEPLOYMENT_ID = '62a9473a2dca46b29ccf17577fcf42d7';

const EOS_TOKEN_PATH = '/auth/v1/oauth/token';
const EAS_TOKEN_PATH = '/epic/oauth/v2/token';
const NONCE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export interface EosToken {
  access_token: string;
  token_type: string;
  expires_at: string;
  expires_in: number;
  account_id?: string;
  organization_user_id?: string;
  product_user_id?: string;
  deployment_id: string;
  id_token?: string;
  features?: string[];
  [key: string]: unknown;
}

export interface LockerItemCustomization {
  channelTag?: string;
  variantTag?: string;
  additionalData?: string;
}

export interface LockerLoadoutSlot {
  slotTemplate: string;
  equippedItemId?: string;
  itemCustomizations?: LockerItemCustomization[];
}

export interface LockerSchemaLoadout {
  loadoutSlots: LockerLoadoutSlot[];
  shuffleType?: string;
}

export interface LockerActiveLoadoutGroup {
  deploymentId?: string;
  accountId?: string;
  athenaItemId?: string;
  creationTime?: string;
  updatedTime?: string;
  loadouts: Record<string, LockerSchemaLoadout>;
  shuffleType?: string;
}

export interface LockerItemsResponse {
  activeLoadoutGroup?: LockerActiveLoadoutGroup;
  loadoutGroupPresets?: unknown[];
  loadoutPresets?: unknown[];
}

export interface EosTokenOptions {
  deploymentId?: string;
  signal?: AbortSignal;
}

export interface EasToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at?: string;
  refresh_token?: string;
  refresh_expires?: number;
  refresh_expires_at?: string;
  account_id?: string;
  scope?: string;
  client_id?: string;
  application_id?: string;
  [key: string]: unknown;
}

export interface EasRefreshGrantOptions {
  deploymentId?: string;
  scope?: string;
  signal?: AbortSignal;
}

export const EAS_DEFAULT_SCOPE = 'basic_profile friends_list presence openid';

export interface EosIdAccount {
  accountId: string;
  displayName: string;
  preferredLanguage?: string;
  linkedAccounts?: Record<string, string>;
  cabinedMode?: boolean;
  [key: string]: unknown;
}

export interface EosProductUserMapping {
  productUserId: string;
  accountId?: string;
  accountIdType?: string;
  [key: string]: unknown;
}

function requireString(value: unknown, parameter: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`"${parameter}" is required and must be a non-empty string`, parameter);
  }
  return value;
}

function requireIdList(ids: unknown, parameter: string): string[] {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new ValidationError(`"${parameter}" must be a non-empty array`, parameter);
  }
  if (ids.length > 100) {
    throw new ValidationError(`"${parameter}" accepts at most 100 ids per request`, parameter);
  }
  return ids as string[];
}

function randomNonce(length = 22): string {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  let out = '';
  for (const byte of bytes) out += NONCE_ALPHABET[byte % NONCE_ALPHABET.length];
  return out;
}

export class EosConnectManager {
  constructor(private readonly rest: EpicRestClient) {}

  async token(client: AuthClient, epicAccessToken: string, options: EosTokenOptions = {}): Promise<EosToken> {
    if (typeof epicAccessToken !== 'string' || epicAccessToken.length === 0) {
      throw new ValidationError('"epicAccessToken" is required to exchange for an EOS token', 'epicAccessToken');
    }
    const response = await this.rest.request<EosToken>('POST', EOS_TOKEN_PATH, {
      basic: client,
      form: {
        grant_type: 'external_auth',
        external_auth_type: 'epicgames_access_token',
        external_auth_token: epicAccessToken,
        deployment_id: options.deploymentId ?? FN_LIVE_DEPLOYMENT_ID,
        nonce: randomNonce(),
      },
      ...(options.signal ? { signal: options.signal } : {}),
    });
    return response.data;
  }

  async easToken(client: AuthClient, options: { signal?: AbortSignal } = {}): Promise<EasToken> {
    const response = await this.rest.request<EasToken>('POST', EAS_TOKEN_PATH, {
      basic: client,
      form: { grant_type: 'client_credentials' },
      ...(options.signal ? { signal: options.signal } : {}),
    });
    return response.data;
  }

  async easRefreshGrant(
    client: AuthClient,
    refreshToken: string,
    options: EasRefreshGrantOptions = {},
  ): Promise<EasToken> {
    requireString(refreshToken, 'refreshToken');
    const response = await this.rest.request<EasToken>('POST', EAS_TOKEN_PATH, {
      basic: client,
      form: {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        scope: options.scope ?? EAS_DEFAULT_SCOPE,
        deployment_id: options.deploymentId ?? FN_LIVE_DEPLOYMENT_ID,
      },
      ...(options.signal ? { signal: options.signal } : {}),
    });
    return response.data;
  }

  async queryAccounts(
    easAccessToken: string,
    accountIds: string[],
    options: { signal?: AbortSignal } = {},
  ): Promise<EosIdAccount[]> {
    requireString(easAccessToken, 'easAccessToken');
    const ids = requireIdList(accountIds, 'accountIds');
    const response = await this.rest.request<EosIdAccount[]>('GET', '/epic/id/v2/accounts', {
      bearer: easAccessToken,
      query: { accountId: ids },
      ...(options.signal ? { signal: options.signal } : {}),
    });
    return response.data;
  }

  async queryProductUsers(
    eosAccessToken: string,
    productUserIds: string[],
    options: { signal?: AbortSignal } = {},
  ): Promise<EosProductUserMapping[]> {
    requireString(eosAccessToken, 'eosAccessToken');
    const ids = requireIdList(productUserIds, 'productUserIds');
    const response = await this.rest.request<EosProductUserMapping[]>('GET', '/user/v1/product-users', {
      bearer: eosAccessToken,
      query: { productUserId: ids },
      ...(options.signal ? { signal: options.signal } : {}),
    });
    return response.data;
  }
}

export class LockerService {
  constructor(private readonly rest: EpicRestClient) {}

  async items(eosAccessToken: string, accountId: string, options: EosTokenOptions = {}): Promise<LockerItemsResponse> {
    if (typeof eosAccessToken !== 'string' || eosAccessToken.length === 0) {
      throw new ValidationError('"eosAccessToken" is required', 'eosAccessToken');
    }
    if (typeof accountId !== 'string' || accountId.length === 0) {
      throw new ValidationError('"accountId" is required', 'accountId');
    }
    const deploymentId = options.deploymentId ?? FN_LIVE_DEPLOYMENT_ID;
    const path = `/api/locker/v4/${encodeURIComponent(deploymentId)}/account/${encodeURIComponent(accountId)}/items`;
    const response = await this.rest.request<LockerItemsResponse>('GET', path, {
      bearer: eosAccessToken,
      ...(options.signal ? { signal: options.signal } : {}),
    });
    return response.data;
  }
}
