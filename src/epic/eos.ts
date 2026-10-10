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
  resolvedEquippedItemId?: string;
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
  namespace?: string;
  creationTime?: string;
  updatedTime?: string;
  loadouts: Record<string, LockerSchemaLoadout>;
  shuffleType?: string;
  equippedPresetId?: string;
  equippedPresetItemId?: string;
}

export interface LockerLoadoutGroupPreset {
  accountId: string;
  athenaItemId: string;
  deploymentId: string;
  namespace?: string;
  presetId: string;
  displayName: string;
  presetFavoriteStatus?: string;
  loadouts: Record<string, LockerSchemaLoadout>;
  creationTime?: string;
  updatedTime?: string;
}

export interface LockerLoadoutPreset {
  accountId: string;
  athenaItemId: string;
  deploymentId: string;
  namespace?: string;
  presetId: string;
  presetIndex: number;
  displayName?: string;
  loadoutType: string;
  loadoutSlots: LockerLoadoutSlot[];
  creationTime?: string;
  updatedTime?: string;
}

export interface LockerItemsResponse {
  activeLoadoutGroup?: LockerActiveLoadoutGroup;
  loadoutGroupPresets?: LockerLoadoutGroupPreset[];
  loadoutPresets?: LockerLoadoutPreset[];
}

export interface LockerVariantTag {
  variantTag: string;
  additionalData?: string;
}

export interface LockerCosmeticData {
  templateId: string;
  cosmeticItemId: string;
  athenaItemId: string;
  activeVariants: Record<string, LockerVariantTag>;
  ownedVariants?: Record<string, LockerVariantTag[]>;
  itemSeenStatus?: string;
  favoriteStatus?: string;
  lockedIn?: boolean;
  creationTime?: string;
  updatedTime?: string;
}

export interface LockerCosmeticDataPage {
  cosmeticItems: LockerCosmeticData[];
  cosmeticItemAccessTokens: unknown[];
  requestTime?: string;
  nextToken?: string;
}

export interface LockerCosmeticDataOptions extends EosTokenOptions {
  limit?: number;
  nextToken?: string;
}

export interface LockerGroupPresetInput {
  displayName: string;
  loadouts: Record<string, LockerSchemaLoadout>;
  athenaItemId?: string;
  creationTime?: string;
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

  items(eosAccessToken: string, accountId: string, options: EosTokenOptions = {}): Promise<LockerItemsResponse> {
    return this.call<LockerItemsResponse>('GET', eosAccessToken, accountId, 'items', options);
  }

  cosmeticData(
    eosAccessToken: string,
    accountId: string,
    options: LockerCosmeticDataOptions = {},
  ): Promise<LockerCosmeticDataPage> {
    if (options.limit !== undefined && (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > 100)) {
      throw new ValidationError('"limit" must be an integer between 1 and 100', 'limit');
    }
    return this.call<LockerCosmeticDataPage>('GET', eosAccessToken, accountId, 'cosmetic-data', options, {
      query: { limit: options.limit, nextToken: options.nextToken },
    });
  }

  async allCosmeticData(
    eosAccessToken: string,
    accountId: string,
    options: EosTokenOptions = {},
  ): Promise<LockerCosmeticData[]> {
    const items: LockerCosmeticData[] = [];
    let nextToken: string | undefined;
    do {
      const page = await this.cosmeticData(eosAccessToken, accountId, { ...options, ...(nextToken ? { nextToken } : {}) });
      items.push(...page.cosmeticItems);
      nextToken = page.nextToken || undefined;
    } while (nextToken);
    return items;
  }

  setActiveLoadoutGroup(
    eosAccessToken: string,
    accountId: string,
    group: Pick<LockerActiveLoadoutGroup, 'loadouts' | 'equippedPresetId' | 'equippedPresetItemId'>,
    options: EosTokenOptions = {},
  ): Promise<LockerActiveLoadoutGroup> {
    if (!group || typeof group.loadouts !== 'object' || group.loadouts === null) {
      throw new ValidationError('"loadouts" is required', 'loadouts');
    }
    return this.call<LockerActiveLoadoutGroup>('PUT', eosAccessToken, accountId, 'active-loadout-group', options, {
      json: group,
    });
  }

  putLoadoutGroupPreset(
    eosAccessToken: string,
    accountId: string,
    presetId: string,
    preset: LockerGroupPresetInput,
    options: EosTokenOptions = {},
  ): Promise<LockerLoadoutGroupPreset> {
    requireString(presetId, 'presetId');
    requireString(preset?.displayName, 'displayName');
    return this.call<LockerLoadoutGroupPreset>('PUT', eosAccessToken, accountId, groupPresetPath(presetId), options, {
      json: preset,
    });
  }

  updateLoadoutGroupPreset(
    eosAccessToken: string,
    accountId: string,
    presetId: string,
    preset: Pick<LockerGroupPresetInput, 'displayName' | 'loadouts'>,
    options: EosTokenOptions = {},
  ): Promise<LockerLoadoutGroupPreset> {
    requireString(presetId, 'presetId');
    requireString(preset?.displayName, 'displayName');
    return this.call<LockerLoadoutGroupPreset>('PATCH', eosAccessToken, accountId, groupPresetPath(presetId), options, {
      json: { displayName: preset.displayName, loadouts: preset.loadouts },
    });
  }

  deleteLoadoutGroupPreset(
    eosAccessToken: string,
    accountId: string,
    presetId: string,
    options: EosTokenOptions = {},
  ): Promise<LockerLoadoutGroupPreset> {
    requireString(presetId, 'presetId');
    return this.call<LockerLoadoutGroupPreset>('DELETE', eosAccessToken, accountId, groupPresetPath(presetId), options);
  }

  async setCompanionName(
    eosAccessToken: string,
    accountId: string,
    cosmeticItemId: string,
    companionName: string,
    options: EosTokenOptions = {},
  ): Promise<void> {
    requireString(cosmeticItemId, 'cosmeticItemId');
    requireString(companionName, 'companionName');
    await this.call<unknown>('PATCH', eosAccessToken, accountId, 'companion-name', options, {
      json: { cosmeticItemId, companionName },
    });
  }

  async lockInImmutableItem(
    eosAccessToken: string,
    accountId: string,
    itemIdentifier: string,
    variants: Record<string, LockerVariantTag>,
    options: EosTokenOptions = {},
  ): Promise<void> {
    requireString(itemIdentifier, 'itemIdentifier');
    const path = `lock-in-immutable-item/${encodeURIComponent(itemIdentifier)}`;
    await this.call<unknown>('POST', eosAccessToken, accountId, path, options, { json: { variants } });
  }

  private async call<T>(
    method: 'GET' | 'PUT' | 'PATCH' | 'POST' | 'DELETE',
    eosAccessToken: string,
    accountId: string,
    path: string,
    options: EosTokenOptions,
    extra: { json?: unknown; query?: Record<string, string | number | undefined> } = {},
  ): Promise<T> {
    requireString(eosAccessToken, 'eosAccessToken');
    requireString(accountId, 'accountId');
    const deploymentId = options.deploymentId ?? FN_LIVE_DEPLOYMENT_ID;
    const url = `/api/locker/v4/${encodeURIComponent(deploymentId)}/account/${encodeURIComponent(accountId)}/${path}`;
    const response = await this.rest.request<T>(method, url, {
      bearer: eosAccessToken,
      ...(extra.json !== undefined ? { json: extra.json } : {}),
      ...(extra.query ? { query: extra.query } : {}),
      ...(options.signal ? { signal: options.signal } : {}),
    });
    return response.data;
  }
}

function groupPresetPath(presetId: string): string {
  return `loadout-group-preset/id/${encodeURIComponent(presetId)}`;
}
