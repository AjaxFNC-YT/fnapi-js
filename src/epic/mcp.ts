import { ConfigurationError, ValidationError } from '../core/errors.js';
import type { QueryParams } from '../core/types.js';
import type { EpicRestClient } from './rest.js';
import { MCP_OPERATIONS } from './mcp-operations.generated.js';

export interface MCPClientOptions {
  allowCustomOperations?: boolean;
}

export const MCP_BASE_URL = 'https://fngw-mcp-gc-livefn.ol.epicgames.com';

export const STOREFRONT_CATALOG_PATH = '/fortnite/api/storefront/v2/catalog';

export const MCPProfile = {
  athena: 'athena',
  creative: 'creative',
  campaign: 'campaign',
  commonPublic: 'common_public',
  collections: 'collections',
  commonCore: 'common_core',
  metadata: 'metadata',
  collectionBookPeople: 'collection_book_people0',
  collectionBookSchematics: 'collection_book_schematics0',
  outpost: 'outpost0',
  theater0: 'theater0',
  theater1: 'theater1',
  theater2: 'theater2',
  recycleBin: 'recycle_bin',
} as const;

export type MCPProfileId = (typeof MCPProfile)[keyof typeof MCPProfile];

export const MCPRoute = {
  client: 'client',
  public: 'public',
  dedicatedServer: 'dedicated_server',
} as const;

export type MCPRouteName = (typeof MCPRoute)[keyof typeof MCPRoute];

export { MCP_OPERATIONS };

export type MCPOperation = (typeof MCP_OPERATIONS)[number];

export const MCP_OPERATIONS_SOURCE_URL =
  'https://api.github.com/repos/LeleDerGrasshalmi/FortniteEndpointsDocumentation/contents/EpicGames/FN-Service/Game/Profile/Operations';

const MCP_OPERATION_SET = new Set<string>(MCP_OPERATIONS);

export function isMCPOperation(value: unknown): value is MCPOperation {
  return typeof value === 'string' && MCP_OPERATION_SET.has(value);
}

export function knownMCPOperations(): string[] {
  return [...MCP_OPERATION_SET];
}

export interface RefreshMCPOperationsOptions {
  fetch?: typeof fetch;
  signal?: AbortSignal;
  url?: string;
}

interface GitHubContentEntry {
  name: string;
  type: string;
}

export async function refreshMCPOperations(
  options: RefreshMCPOperationsOptions = {},
): Promise<string[]> {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new ConfigurationError(
      'No fetch implementation available. Pass `fetch` in RefreshMCPOperationsOptions.',
      'fetch',
    );
  }

  const url = options.url ?? MCP_OPERATIONS_SOURCE_URL;
  const response = await fetchImpl(url, {
    headers: { Accept: 'application/vnd.github+json' },
    ...(options.signal ? { signal: options.signal } : {}),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch MCP operations (${response.status} ${response.statusText})`);
  }

  const entries = (await response.json()) as GitHubContentEntry[];
  if (!Array.isArray(entries)) {
    throw new Error('Unexpected response shape while refreshing MCP operations');
  }

  const added: string[] = [];
  for (const entry of entries) {
    if (entry.type !== 'file' || !entry.name.endsWith('.md')) continue;
    const name = entry.name.slice(0, -'.md'.length);
    if (!MCP_OPERATION_SET.has(name)) {
      MCP_OPERATION_SET.add(name);
      added.push(name);
    }
  }

  return added;
}

export interface MCPResponse<T = unknown> {
  profileRevision: number;
  profileId: string;
  profileChangesBaseRevision: number;
  profileChanges: T[];
  profileCommandRevision: number;
  serverTime: string;
  responseVersion: number;
  [key: string]: unknown;
}

export interface MCPOperationOptions {
  profileId?: MCPProfileId | (string & {});
  route?: MCPRouteName | (string & {});
  rvn?: number;
  payload?: unknown;
  signal?: AbortSignal;
  timeout?: number;
}

function requireString(value: unknown, parameter: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`"${parameter}" is required and must be a non-empty string`, parameter);
  }
  return value;
}

export class MCPClient {
  private readonly allowCustomOperations: boolean;

  constructor(
    private readonly rest: EpicRestClient,
    options: MCPClientOptions = {},
  ) {
    this.allowCustomOperations = options.allowCustomOperations ?? false;
  }

  async operation<T = unknown>(
    accessToken: string,
    accountId: string,
    operation: MCPOperation | (string & {}),
    options: MCPOperationOptions = {},
  ): Promise<MCPResponse<T>> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    requireString(operation, 'operation');

    if (!isMCPOperation(operation) && !this.allowCustomOperations) {
      throw new ConfigurationError(
        `Unknown MCP operation "${operation}". Pass \`allowCustomMcpOperations: true\` to the ` +
          'EpicGamesClient constructor to call operations not in MCP_OPERATIONS.',
        'allowCustomMcpOperations',
      );
    }

    const route = options.route ?? 'client';
    const path =
      `/fortnite/api/game/v2/profile/${encodeURIComponent(accountId)}/${route}/${operation}`;
    const query: QueryParams = {
      profileId: options.profileId ?? 'common_core',
      rvn: options.rvn ?? -1,
    };

    const response = await this.rest.request<MCPResponse<T>>('POST', path, {
      bearer: accessToken,
      query,
      json: options.payload ?? {},
      ...(options.signal ? { signal: options.signal } : {}),
      ...(options.timeout !== undefined ? { timeout: options.timeout } : {}),
    });
    return response.data;
  }

  async storefrontCatalog<T = unknown>(
    accessToken: string,
    options: { signal?: AbortSignal; timeout?: number } = {},
  ): Promise<T> {
    requireString(accessToken, 'accessToken');
    const response = await this.rest.request<T>('GET', STOREFRONT_CATALOG_PATH, {
      bearer: accessToken,
      ...(options.signal ? { signal: options.signal } : {}),
      ...(options.timeout !== undefined ? { timeout: options.timeout } : {}),
    });
    return response.data;
  }

  refreshOperations(options: RefreshMCPOperationsOptions = {}): Promise<string[]> {
    return refreshMCPOperations(options);
  }

  queryProfile<T = unknown>(
    accessToken: string,
    accountId: string,
    profileId: MCPProfileId | (string & {}) = 'common_core',
    options: Omit<MCPOperationOptions, 'profileId'> = {},
  ): Promise<MCPResponse<T>> {
    return this.operation<T>(accessToken, accountId, 'QueryProfile', { ...options, profileId });
  }

  queryPublicProfile<T = unknown>(
    accessToken: string,
    accountId: string,
    profileId: MCPProfileId | (string & {}) = 'common_core',
    options: Omit<MCPOperationOptions, 'profileId' | 'route'> = {},
  ): Promise<MCPResponse<T>> {
    return this.operation<T>(accessToken, accountId, 'QueryPublicProfile', {
      ...options,
      profileId,
      route: 'public',
    });
  }
}
