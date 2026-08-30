import { ValidationError } from '../core/errors.js';
import type { QueryParams } from '../core/types.js';
import type { EpicResponse, EpicRestClient } from './rest.js';

export const LIBRARY_BASE_URL = 'https://library-service.live.use1a.on.epicgames.com';

export const LAUNCHER_LIBRARY_BASE_URL = 'https://launcher-public-service-prod06.ol.epicgames.com';

export interface LibraryRecord {
  namespace: string;
  catalogItemId: string;
  appName?: string;
  productId?: string;
  sandboxName?: string;
  sandboxType?: string;
  recordType?: string;
  acquisitionDate?: string;
  dependencies?: string[];
}

export interface LibraryResponseMetadata {
  nextCursor?: string;
  stateToken?: string;
}

export interface LibraryItemsResponse {
  responseMetadata: LibraryResponseMetadata;
  records: LibraryRecord[];
}

export interface LibraryItemsOptions {
  includeMetadata?: boolean;
  cursor?: string;
  excludeNs?: string | string[];
  includeNs?: string | string[];
  limit?: number;
  platform?: string;
  includeCategories?: string;
  signal?: AbortSignal;
}

export interface LibraryAllItemsOptions {
  excludeNs?: string | string[];
  includeNs?: string | string[];
  platform?: string;
  includeCategories?: string;
  pageSize?: number;
  signal?: AbortSignal;
}

export interface LibraryCollection {
  collectionId: string;
  name: string;
  libraryItemContentVersion: number;
}

export interface LibraryCollectionItem {
  sandbox: string;
  catalogId: string;
  artifactId: string;
}

export interface LibraryCollectionItemsResponse {
  responseMetadata: LibraryResponseMetadata;
  records: LibraryCollectionItem[];
}

export interface LibraryStateTokenStatus {
  valid: boolean;
}

export interface LauncherLibraryRecord {
  namespace: string;
  catalogItemId: string;
  appName?: string;
}

export interface LauncherLibraryResponse {
  records: LauncherLibraryRecord[];
  responseMetadata: { nextCursor?: string };
}

export interface LauncherLibraryItemsOptions {
  excludeNs?: string | string[];
  limit?: number;
  platform?: string;
  nextCursor?: string;
  signal?: AbortSignal;
}

export interface LibraryRequestOptions {
  signal?: AbortSignal;
}

function requireString(value: unknown, parameter: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`"${parameter}" is required and must be a non-empty string`, parameter);
  }
  return value;
}

function toBase64(value: string): string {
  if (typeof globalThis.btoa === 'function') {
    return globalThis.btoa(value);
  }
  return Buffer.from(value, 'utf8').toString('base64');
}

export function buildLibraryCursor(offset: number): string {
  if (typeof offset !== 'number' || !Number.isFinite(offset) || offset < 0) {
    throw new ValidationError('"offset" must be a non-negative, finite number', 'offset');
  }
  return toBase64(JSON.stringify({ offset: Math.floor(offset) }));
}

function normalizeMetadata(
  response: EpicResponse<{ responseMetadata?: LibraryResponseMetadata }>,
): LibraryResponseMetadata {
  const body = response.data?.responseMetadata;
  if (body && (body.nextCursor !== undefined || body.stateToken !== undefined)) {
    return body;
  }
  const header = response.headers['x-epic-metadata'];
  if (!header) return {};
  try {
    return JSON.parse(header) as LibraryResponseMetadata;
  } catch {
    return {};
  }
}

export class LibraryManager {
  constructor(
    private readonly rest: EpicRestClient,
    private readonly launcherRest: EpicRestClient,
  ) {}

  async items(accessToken: string, options: LibraryItemsOptions = {}): Promise<LibraryItemsResponse> {
    requireString(accessToken, 'accessToken');
    const query: QueryParams = {};
    if (options.includeMetadata !== undefined) query.includeMetadata = options.includeMetadata;
    if (options.cursor !== undefined) query.cursor = options.cursor;
    if (options.excludeNs !== undefined) query.excludeNs = options.excludeNs;
    if (options.includeNs !== undefined) query.includeNs = options.includeNs;
    if (options.limit !== undefined) query.limit = options.limit;
    if (options.platform !== undefined) query.platform = options.platform;
    if (options.includeCategories !== undefined) query.includeCategories = options.includeCategories;
    const response = await this.rest.request<{
      responseMetadata?: LibraryResponseMetadata;
      records: LibraryRecord[];
    }>('GET', '/library/api/public/items', {
      bearer: accessToken,
      query,
      ...(options.signal ? { signal: options.signal } : {}),
    });
    return {
      responseMetadata: normalizeMetadata(response),
      records: response.data.records ?? [],
    };
  }

  async allItems(accessToken: string, options: LibraryAllItemsOptions = {}): Promise<LibraryRecord[]> {
    requireString(accessToken, 'accessToken');
    const records: LibraryRecord[] = [];
    let cursor: string | undefined;
    do {
      const page = await this.items(accessToken, {
        includeMetadata: true,
        ...(cursor ? { cursor } : {}),
        ...(options.excludeNs !== undefined ? { excludeNs: options.excludeNs } : {}),
        ...(options.includeNs !== undefined ? { includeNs: options.includeNs } : {}),
        ...(options.platform !== undefined ? { platform: options.platform } : {}),
        ...(options.includeCategories !== undefined ? { includeCategories: options.includeCategories } : {}),
        ...(options.pageSize !== undefined ? { limit: options.pageSize } : {}),
        ...(options.signal ? { signal: options.signal } : {}),
      });
      records.push(...page.records);
      cursor = page.responseMetadata.nextCursor;
      if (page.records.length === 0) break;
    } while (cursor);
    return records;
  }

  async stateTokenStatus(
    accessToken: string,
    stateToken: string,
    options: LibraryRequestOptions = {},
  ): Promise<boolean> {
    requireString(accessToken, 'accessToken');
    requireString(stateToken, 'stateToken');
    const response = await this.rest.request<LibraryStateTokenStatus>(
      'GET',
      `/library/api/public/stateToken/${encodeURIComponent(stateToken)}/status`,
      {
        bearer: accessToken,
        ...(options.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data.valid === true;
  }

  async collections(
    accessToken: string,
    accountId: string,
    options: LibraryRequestOptions = {},
  ): Promise<LibraryCollection[]> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    const response = await this.rest.request<{ collections: LibraryCollection[] }>(
      'GET',
      `/library/api/public/collection/account/${encodeURIComponent(accountId)}`,
      {
        bearer: accessToken,
        ...(options.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data.collections ?? [];
  }

  async createCollection(
    accessToken: string,
    accountId: string,
    name: string,
    options: LibraryRequestOptions = {},
  ): Promise<LibraryCollection> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    requireString(name, 'name');
    const response = await this.rest.request<LibraryCollection>(
      'POST',
      `/library/api/public/collection/account/${encodeURIComponent(accountId)}`,
      {
        bearer: accessToken,
        json: { name },
        ...(options.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data;
  }

  async updateCollection(
    accessToken: string,
    accountId: string,
    collectionId: string,
    name: string,
    options: LibraryRequestOptions = {},
  ): Promise<LibraryCollection> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    requireString(collectionId, 'collectionId');
    requireString(name, 'name');
    const response = await this.rest.request<LibraryCollection>(
      'PUT',
      `/library/api/public/collection/account/${encodeURIComponent(accountId)}`,
      {
        bearer: accessToken,
        json: { name },
        ...(options.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data;
  }

  async deleteCollection(
    accessToken: string,
    accountId: string,
    collectionId: string,
    options: LibraryRequestOptions = {},
  ): Promise<void> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    requireString(collectionId, 'collectionId');
    await this.rest.request<null>(
      'DELETE',
      `/library/api/public/collection/${encodeURIComponent(collectionId)}/account/${encodeURIComponent(accountId)}`,
      {
        bearer: accessToken,
        ...(options.signal ? { signal: options.signal } : {}),
      },
    );
  }

  async collectionItems(
    accessToken: string,
    collectionId: string,
    accountId: string,
    options: LibraryRequestOptions = {},
  ): Promise<LibraryCollectionItem[]> {
    requireString(accessToken, 'accessToken');
    requireString(collectionId, 'collectionId');
    requireString(accountId, 'accountId');
    const response = await this.rest.request<LibraryCollectionItemsResponse>(
      'GET',
      `/library/api/public/collection/${encodeURIComponent(collectionId)}/item/account/${encodeURIComponent(accountId)}`,
      {
        bearer: accessToken,
        ...(options.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data.records ?? [];
  }

  async addCollectionItem(
    accessToken: string,
    accountId: string,
    collectionId: string,
    item: LibraryCollectionItem,
    options: LibraryRequestOptions = {},
  ): Promise<LibraryCollection> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    requireString(collectionId, 'collectionId');
    requireString(item?.sandbox, 'item.sandbox');
    requireString(item?.catalogId, 'item.catalogId');
    requireString(item?.artifactId, 'item.artifactId');
    const response = await this.rest.request<LibraryCollection>(
      'POST',
      `/library/api/public/collection/${encodeURIComponent(collectionId)}/item/account/${encodeURIComponent(accountId)}` +
        `/sandbox/${encodeURIComponent(item.sandbox)}/catalog/${encodeURIComponent(item.catalogId)}/artifact/${encodeURIComponent(item.artifactId)}`,
      {
        bearer: accessToken,
        ...(options.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data;
  }

  async removeCollectionItem(
    accessToken: string,
    accountId: string,
    collectionId: string,
    item: LibraryCollectionItem,
    options: LibraryRequestOptions = {},
  ): Promise<LibraryCollection> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    requireString(collectionId, 'collectionId');
    requireString(item?.sandbox, 'item.sandbox');
    requireString(item?.catalogId, 'item.catalogId');
    requireString(item?.artifactId, 'item.artifactId');
    const response = await this.rest.request<LibraryCollection>(
      'DELETE',
      `/library/api/public/collection/${encodeURIComponent(collectionId)}/item/account/${encodeURIComponent(accountId)}` +
        `/sandbox/${encodeURIComponent(item.sandbox)}/catalog/${encodeURIComponent(item.catalogId)}/artifact/${encodeURIComponent(item.artifactId)}`,
      {
        bearer: accessToken,
        ...(options.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data;
  }

  async launcherItems(
    accessToken: string,
    options: LauncherLibraryItemsOptions = {},
  ): Promise<LauncherLibraryResponse> {
    requireString(accessToken, 'accessToken');
    const query: QueryParams = {};
    if (options.excludeNs !== undefined) query.excludeNs = options.excludeNs;
    if (options.limit !== undefined) query.limit = options.limit;
    if (options.platform !== undefined) query.platform = options.platform;
    if (options.nextCursor !== undefined) query.nextCursor = options.nextCursor;
    const response = await this.launcherRest.request<LauncherLibraryResponse>(
      'GET',
      '/launcher/api/public/library/items',
      {
        bearer: accessToken,
        query,
        ...(options.signal ? { signal: options.signal } : {}),
      },
    );
    return {
      records: response.data.records ?? [],
      responseMetadata: response.data.responseMetadata ?? {},
    };
  }
}
