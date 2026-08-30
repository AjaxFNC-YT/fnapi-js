import { ConfigurationError, ValidationError } from '../core/errors.js';
import type { AccountManager } from './account.js';
import type { EpicRestClient } from './rest.js';
import type { EpicAccount } from './types.js';

export const FRIENDS_BASE_URL = 'https://friends-public-service-prod.ol.epicgames.com';

export interface FriendEntry {
  accountId: string;
  groups?: string[];
  mutual?: number;
  nickname?: string;
  note?: string;
  favorite?: boolean;
  created?: string;
}

export interface ResolvedFriendEntry extends FriendEntry {
  displayName?: string;
  account?: EpicAccount;
}

interface RawFriendEntry extends Omit<FriendEntry, 'nickname'> {
  alias?: string;
  nickname?: string;
}

interface RawFriendsSummary extends Omit<FriendsSummary, 'friends' | 'incoming' | 'outgoing' | 'suggested'> {
  friends?: RawFriendEntry[];
  incoming?: RawFriendEntry[];
  outgoing?: RawFriendEntry[];
  suggested?: RawFriendEntry[];
}

function normalizeEntry(entry: RawFriendEntry): FriendEntry {
  const { alias, nickname, ...rest } = entry;
  const resolved = nickname ?? alias;
  return { ...rest, ...(resolved !== undefined ? { nickname: resolved } : {}) };
}

export interface BlocklistEntry {
  accountId: string;
  created: string;
}

export interface FriendSettings {
  acceptInvites?: string;
  mutualPrivacy?: string;
}

export interface FriendsLimitsReached {
  incoming: boolean;
  outgoing: boolean;
  accepted: boolean;
}

export interface FriendsSummary {
  friends: FriendEntry[];
  incoming: FriendEntry[];
  outgoing: FriendEntry[];
  suggested: FriendEntry[];
  blocklist: BlocklistEntry[];
  settings: FriendSettings;
  limitsReached: FriendsLimitsReached;
}

export interface FriendAddOptions {
  pin?: string;
  signal?: AbortSignal;
}

function requireString(value: unknown, parameter: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`"${parameter}" is required and must be a non-empty string`, parameter);
  }
  return value;
}

export class FriendsManager {
  constructor(
    private readonly rest: EpicRestClient,
    private readonly accounts?: AccountManager,
  ) {}

  private base(accountId: string): string {
    return `/friends/api/v1/${encodeURIComponent(accountId)}`;
  }

  private requireAccounts(): AccountManager {
    if (!this.accounts) {
      throw new ConfigurationError(
        'Name resolution requires an AccountManager. Use client.friends (which is wired with one) ' +
          'or construct new FriendsManager(rest, accountManager).',
        'accounts',
      );
    }
    return this.accounts;
  }

  async summary(
    accessToken: string,
    accountId: string,
    options?: { signal?: AbortSignal },
  ): Promise<FriendsSummary> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    const response = await this.rest.request<RawFriendsSummary>('GET', `${this.base(accountId)}/summary`, {
      bearer: accessToken,
      ...(options?.signal ? { signal: options.signal } : {}),
    });
    const raw = response.data;
    return {
      ...raw,
      friends: (raw.friends ?? []).map(normalizeEntry),
      incoming: (raw.incoming ?? []).map(normalizeEntry),
      outgoing: (raw.outgoing ?? []).map(normalizeEntry),
      suggested: (raw.suggested ?? []).map(normalizeEntry),
    };
  }

  private async listing(
    accessToken: string,
    accountId: string,
    segment: string,
    options?: { signal?: AbortSignal },
  ): Promise<FriendEntry[]> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    const response = await this.rest.request<RawFriendEntry[]>('GET', `${this.base(accountId)}/${segment}`, {
      bearer: accessToken,
      ...(options?.signal ? { signal: options.signal } : {}),
    });
    return response.data.map(normalizeEntry);
  }

  list(accessToken: string, accountId: string, options?: { signal?: AbortSignal }): Promise<FriendEntry[]> {
    return this.listing(accessToken, accountId, 'friends', options);
  }

  incoming(accessToken: string, accountId: string, options?: { signal?: AbortSignal }): Promise<FriendEntry[]> {
    return this.listing(accessToken, accountId, 'incoming', options);
  }

  outgoing(accessToken: string, accountId: string, options?: { signal?: AbortSignal }): Promise<FriendEntry[]> {
    return this.listing(accessToken, accountId, 'outgoing', options);
  }

  suggested(accessToken: string, accountId: string, options?: { signal?: AbortSignal }): Promise<FriendEntry[]> {
    return this.listing(accessToken, accountId, 'suggested', options);
  }

  async resolveEntries(
    accessToken: string,
    entries: FriendEntry[],
    options?: { signal?: AbortSignal },
  ): Promise<ResolvedFriendEntry[]> {
    requireString(accessToken, 'accessToken');
    const accounts = await this.requireAccounts().resolveAccounts(
      accessToken,
      entries.map((entry) => entry.accountId),
      options,
    );
    return entries.map((entry) => {
      const account = accounts.get(entry.accountId);
      return account ? { ...entry, displayName: account.displayName, account } : { ...entry };
    });
  }

  async listResolved(
    accessToken: string,
    accountId: string,
    options?: { signal?: AbortSignal },
  ): Promise<ResolvedFriendEntry[]> {
    const entries = await this.list(accessToken, accountId, options);
    return this.resolveEntries(accessToken, entries, options);
  }

  async acceptBulk(
    accessToken: string,
    accountId: string,
    targetIds: string[],
    options?: { signal?: AbortSignal },
  ): Promise<string[]> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    if (!Array.isArray(targetIds) || targetIds.length === 0) {
      throw new ValidationError('"targetIds" must be a non-empty array', 'targetIds');
    }
    const response = await this.rest.request<string[]>('POST', `${this.base(accountId)}/incoming/accept`, {
      bearer: accessToken,
      query: { targetIds: targetIds.join(',') },
      ...(options?.signal ? { signal: options.signal } : {}),
    });
    return response.data;
  }

  async clearAll(
    accessToken: string,
    accountId: string,
    options?: { signal?: AbortSignal },
  ): Promise<void> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    await this.rest.request<null>('DELETE', `${this.base(accountId)}/friends`, {
      bearer: accessToken,
      ...(options?.signal ? { signal: options.signal } : {}),
    });
  }

  async get(
    accessToken: string,
    accountId: string,
    friendId: string,
    options?: { signal?: AbortSignal },
  ): Promise<FriendEntry> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    requireString(friendId, 'friendId');
    const response = await this.rest.request<RawFriendEntry>(
      'GET',
      `${this.base(accountId)}/friends/${encodeURIComponent(friendId)}`,
      {
        bearer: accessToken,
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
    return normalizeEntry(response.data);
  }

  async add(
    accessToken: string,
    accountId: string,
    friendId: string,
    options?: FriendAddOptions,
  ): Promise<void> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    requireString(friendId, 'friendId');
    await this.rest.request<null>(
      'POST',
      `${this.base(accountId)}/friends/${encodeURIComponent(friendId)}`,
      {
        bearer: accessToken,
        ...(options?.pin ? { json: { pin: options.pin } } : {}),
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
  }

  async remove(
    accessToken: string,
    accountId: string,
    friendId: string,
    options?: { signal?: AbortSignal },
  ): Promise<void> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    requireString(friendId, 'friendId');
    await this.rest.request<null>(
      'DELETE',
      `${this.base(accountId)}/friends/${encodeURIComponent(friendId)}`,
      {
        bearer: accessToken,
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
  }

  async mutual(
    accessToken: string,
    accountId: string,
    friendId: string,
    options?: { signal?: AbortSignal },
  ): Promise<string[]> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    requireString(friendId, 'friendId');
    const response = await this.rest.request<string[]>(
      'GET',
      `${this.base(accountId)}/friends/${encodeURIComponent(friendId)}/mutual`,
      {
        bearer: accessToken,
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data;
  }

  async setNickname(
    accessToken: string,
    accountId: string,
    friendId: string,
    nickname: string,
    options?: { signal?: AbortSignal },
  ): Promise<void> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    requireString(friendId, 'friendId');
    requireString(nickname, 'nickname');
    await this.rest.request<null>(
      'PUT',
      `${this.base(accountId)}/friends/${encodeURIComponent(friendId)}/alias`,
      {
        bearer: accessToken,
        text: nickname,
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
  }

  async removeNickname(
    accessToken: string,
    accountId: string,
    friendId: string,
    options?: { signal?: AbortSignal },
  ): Promise<void> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    requireString(friendId, 'friendId');
    await this.rest.request<null>(
      'DELETE',
      `${this.base(accountId)}/friends/${encodeURIComponent(friendId)}/alias`,
      {
        bearer: accessToken,
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
  }

  async setNote(
    accessToken: string,
    accountId: string,
    friendId: string,
    note: string,
    options?: { signal?: AbortSignal },
  ): Promise<void> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    requireString(friendId, 'friendId');
    requireString(note, 'note');
    await this.rest.request<null>(
      'PUT',
      `${this.base(accountId)}/friends/${encodeURIComponent(friendId)}/note`,
      {
        bearer: accessToken,
        text: note,
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
  }

  async removeNote(
    accessToken: string,
    accountId: string,
    friendId: string,
    options?: { signal?: AbortSignal },
  ): Promise<void> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    requireString(friendId, 'friendId');
    await this.rest.request<null>(
      'DELETE',
      `${this.base(accountId)}/friends/${encodeURIComponent(friendId)}/note`,
      {
        bearer: accessToken,
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
  }

  async blocklist(
    accessToken: string,
    accountId: string,
    options?: { signal?: AbortSignal },
  ): Promise<BlocklistEntry[]> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    const response = await this.rest.request<BlocklistEntry[]>('GET', `${this.base(accountId)}/blocklist`, {
      bearer: accessToken,
      ...(options?.signal ? { signal: options.signal } : {}),
    });
    return response.data;
  }

  async block(
    accessToken: string,
    accountId: string,
    userId: string,
    options?: { signal?: AbortSignal },
  ): Promise<void> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    requireString(userId, 'userId');
    await this.rest.request<null>(
      'POST',
      `${this.base(accountId)}/blocklist/${encodeURIComponent(userId)}`,
      {
        bearer: accessToken,
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
  }

  async unblock(
    accessToken: string,
    accountId: string,
    userId: string,
    options?: { signal?: AbortSignal },
  ): Promise<void> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    requireString(userId, 'userId');
    await this.rest.request<null>(
      'DELETE',
      `${this.base(accountId)}/blocklist/${encodeURIComponent(userId)}`,
      {
        bearer: accessToken,
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
  }
}
