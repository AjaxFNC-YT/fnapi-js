import { ValidationError } from '../core/errors.js';
import type { EpicRestClient } from './rest.js';

export const PRESENCE_BASE_URL = 'https://presence-public-service-prod.ol.epicgames.com';

export const PRESENCE_NAMESPACE = 'Fortnite';

export interface LastOnlineEntry {
  namespace?: string;
  last_online: string;
}

export type LastOnlineResponse = Record<string, LastOnlineEntry[]>;

export interface FriendPresenceRow {
  accountId: string;
  namespace?: string;
  lastOnline?: string;
  status?: string;
  activity?: unknown;
  props?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface PresenceOptions {
  namespace?: string;
  signal?: AbortSignal;
}

function requireString(value: unknown, parameter: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`"${parameter}" is required and must be a non-empty string`, parameter);
  }
  return value;
}

export class PresenceManager {
  private readonly namespace: string;

  constructor(
    private readonly rest: EpicRestClient,
    options?: { namespace?: string },
  ) {
    this.namespace = options?.namespace ?? PRESENCE_NAMESPACE;
  }

  async lastOnline(
    accessToken: string,
    accountId: string,
    options?: PresenceOptions,
  ): Promise<LastOnlineResponse> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    const namespace = options?.namespace ?? this.namespace;
    const response = await this.rest.request<LastOnlineResponse>(
      'GET',
      `/presence/api/v1/${encodeURIComponent(namespace)}/${encodeURIComponent(accountId)}/last-online`,
      {
        bearer: accessToken,
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data;
  }

  async lastOnlineFor(
    accessToken: string,
    accountId: string,
    options?: PresenceOptions,
  ): Promise<LastOnlineEntry | null> {
    const response = await this.lastOnline(accessToken, accountId, options);
    return response[accountId]?.[0] ?? null;
  }

  async friendsPresence(
    accessToken: string,
    accountId: string,
    options?: { signal?: AbortSignal },
  ): Promise<FriendPresenceRow[]> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    const response = await this.rest.request<FriendPresenceRow[]>(
      'GET',
      `/presence/api/v1/_/friends/${encodeURIComponent(accountId)}`,
      {
        bearer: accessToken,
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
    return Array.isArray(response.data) ? response.data : [];
  }
}
