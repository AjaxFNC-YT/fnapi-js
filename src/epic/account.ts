import { ValidationError } from '../core/errors.js';
import type { QueryParams } from '../core/types.js';
import type { EpicRestClient } from './rest.js';
import type {
  AccountMetadata,
  DeviceAuth,
  EpicAccount,
  ExternalAuth,
  ExternalAuthAccountMatch,
  ExternalDisplayNameLookup,
  ExternalIdLookup,
} from './types.js';

function requireString(value: unknown, parameter: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`"${parameter}" is required and must be a non-empty string`, parameter);
  }
  return value;
}

function requireStringList(value: unknown, parameter: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ValidationError(`"${parameter}" must be a non-empty array`, parameter);
  }
  if (value.length > 100) {
    throw new ValidationError(`"${parameter}" accepts at most 100 values per request`, parameter);
  }
  return value as string[];
}

function accountPath(accountId: string): string {
  return `/account/api/public/account/${encodeURIComponent(accountId)}`;
}

export class DeviceAuthManager {
  constructor(private readonly rest: EpicRestClient) {}

  async create(accessToken: string, accountId: string, options?: { signal?: AbortSignal }): Promise<DeviceAuth> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    const response = await this.rest.request<DeviceAuth>('POST', `${accountPath(accountId)}/deviceAuth`, {
      bearer: accessToken,
      json: {},
      ...(options?.signal ? { signal: options.signal } : {}),
    });
    return response.data;
  }

  async list(accessToken: string, accountId: string, options?: { signal?: AbortSignal }): Promise<DeviceAuth[]> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    const response = await this.rest.request<DeviceAuth[]>('GET', `${accountPath(accountId)}/deviceAuth`, {
      bearer: accessToken,
      ...(options?.signal ? { signal: options.signal } : {}),
    });
    return response.data;
  }

  async get(
    accessToken: string,
    accountId: string,
    deviceId: string,
    options?: { signal?: AbortSignal },
  ): Promise<DeviceAuth> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    requireString(deviceId, 'deviceId');
    const response = await this.rest.request<DeviceAuth>(
      'GET',
      `${accountPath(accountId)}/deviceAuth/${encodeURIComponent(deviceId)}`,
      {
        bearer: accessToken,
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data;
  }

  async delete(
    accessToken: string,
    accountId: string,
    deviceId: string,
    options?: { signal?: AbortSignal },
  ): Promise<void> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    requireString(deviceId, 'deviceId');
    await this.rest.request<null>(
      'DELETE',
      `${accountPath(accountId)}/deviceAuth/${encodeURIComponent(deviceId)}`,
      {
        bearer: accessToken,
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
  }
}

export class AccountManager {
  constructor(private readonly rest: EpicRestClient) {}

  async byId(accessToken: string, accountId: string, options?: { signal?: AbortSignal }): Promise<EpicAccount> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    const response = await this.rest.request<EpicAccount>('GET', accountPath(accountId), {
      bearer: accessToken,
      ...(options?.signal ? { signal: options.signal } : {}),
    });
    return response.data;
  }

  async byIds(accessToken: string, accountIds: string[], options?: { signal?: AbortSignal }): Promise<EpicAccount[]> {
    requireString(accessToken, 'accessToken');
    if (!Array.isArray(accountIds) || accountIds.length === 0) {
      throw new ValidationError('"accountIds" must be a non-empty array', 'accountIds');
    }
    if (accountIds.length > 100) {
      throw new ValidationError('"accountIds" accepts at most 100 ids per request', 'accountIds');
    }

    const query: QueryParams = { accountId: accountIds };
    const response = await this.rest.request<EpicAccount[]>('GET', '/account/api/public/account', {
      bearer: accessToken,
      query,
      ...(options?.signal ? { signal: options.signal } : {}),
    });
    return response.data;
  }

  async resolveAccounts(
    accessToken: string,
    accountIds: string[],
    options?: { signal?: AbortSignal },
  ): Promise<Map<string, EpicAccount>> {
    requireString(accessToken, 'accessToken');
    if (!Array.isArray(accountIds)) {
      throw new ValidationError('"accountIds" must be an array', 'accountIds');
    }
    const unique = [...new Set(accountIds.filter((id) => typeof id === 'string' && id.trim().length > 0))];
    const resolved = new Map<string, EpicAccount>();
    for (let index = 0; index < unique.length; index += 100) {
      const chunk = unique.slice(index, index + 100);
      const accounts = await this.byIds(accessToken, chunk, options);
      for (const account of accounts) resolved.set(account.id, account);
    }
    return resolved;
  }

  async resolveNames(
    accessToken: string,
    accountIds: string[],
    options?: { signal?: AbortSignal },
  ): Promise<Map<string, string>> {
    const accounts = await this.resolveAccounts(accessToken, accountIds, options);
    const names = new Map<string, string>();
    for (const [id, account] of accounts) names.set(id, account.displayName);
    return names;
  }

  async byDisplayName(
    accessToken: string,
    displayName: string,
    options?: { signal?: AbortSignal },
  ): Promise<EpicAccount> {
    requireString(accessToken, 'accessToken');
    requireString(displayName, 'displayName');
    const response = await this.rest.request<EpicAccount>(
      'GET',
      `/account/api/public/account/displayName/${encodeURIComponent(displayName)}`,
      {
        bearer: accessToken,
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data;
  }

  async byEmail(accessToken: string, email: string, options?: { signal?: AbortSignal }): Promise<EpicAccount> {
    requireString(accessToken, 'accessToken');
    requireString(email, 'email');
    const response = await this.rest.request<EpicAccount>(
      'GET',
      `/account/api/public/account/email/${encodeURIComponent(email)}`,
      {
        bearer: accessToken,
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data;
  }

  async externalAuths(
    accessToken: string,
    accountId: string,
    options?: { signal?: AbortSignal },
  ): Promise<ExternalAuth[]> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    const response = await this.rest.request<ExternalAuth[]>(
      'GET',
      `${accountPath(accountId)}/externalAuths`,
      {
        bearer: accessToken,
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data;
  }

  async externalAuth(
    accessToken: string,
    accountId: string,
    externalAuthType: string,
    options?: { signal?: AbortSignal },
  ): Promise<ExternalAuth> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    requireString(externalAuthType, 'externalAuthType');
    const response = await this.rest.request<ExternalAuth>(
      'GET',
      `${accountPath(accountId)}/externalAuths/${encodeURIComponent(externalAuthType)}`,
      {
        bearer: accessToken,
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data;
  }

  async byExternalDisplayName(
    accessToken: string,
    externalAuthType: string,
    displayName: string,
    options?: { caseInsensitive?: boolean; signal?: AbortSignal },
  ): Promise<ExternalAuthAccountMatch[]> {
    requireString(accessToken, 'accessToken');
    requireString(externalAuthType, 'externalAuthType');
    requireString(displayName, 'displayName');
    const query: QueryParams = {};
    if (options?.caseInsensitive !== undefined) {
      query['caseInsensitive'] = String(options.caseInsensitive);
    }
    const response = await this.rest.request<ExternalAuthAccountMatch[]>(
      'GET',
      `/account/api/public/account/lookup/externalAuth/${encodeURIComponent(externalAuthType)}/displayName/${encodeURIComponent(displayName)}`,
      {
        bearer: accessToken,
        query,
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data;
  }

  async byExternalDisplayNames(
    accessToken: string,
    authType: string,
    displayNames: string[],
    options?: { signal?: AbortSignal },
  ): Promise<ExternalDisplayNameLookup> {
    requireString(accessToken, 'accessToken');
    requireString(authType, 'authType');
    const names = requireStringList(displayNames, 'displayNames');
    const response = await this.rest.request<ExternalDisplayNameLookup>(
      'POST',
      '/account/api/public/account/lookup/externalDisplayName',
      {
        bearer: accessToken,
        json: { authType, displayNames: names },
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data;
  }

  async byExternalIds(
    accessToken: string,
    authType: string,
    ids: string[],
    options?: { signal?: AbortSignal },
  ): Promise<ExternalIdLookup> {
    requireString(accessToken, 'accessToken');
    requireString(authType, 'authType');
    const externalIds = requireStringList(ids, 'ids');
    const response = await this.rest.request<ExternalIdLookup>(
      'POST',
      '/account/api/public/account/lookup/externalId',
      {
        bearer: accessToken,
        json: { authType, ids: externalIds },
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data;
  }

  async metadata(
    accessToken: string,
    accountId: string,
    options?: { signal?: AbortSignal },
  ): Promise<AccountMetadata> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    const response = await this.rest.request<AccountMetadata>(
      'GET',
      `/account/api/accounts/${encodeURIComponent(accountId)}/metadata`,
      {
        bearer: accessToken,
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data;
  }
}
