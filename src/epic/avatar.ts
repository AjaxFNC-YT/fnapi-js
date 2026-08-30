import { ValidationError } from '../core/errors.js';
import type { EpicRestClient } from './rest.js';

export const AVATAR_BASE_URL = 'https://avatar-service-prod.identity.live.on.epicgames.com';

export const AVATAR_ICON_BASE_URL = 'https://fortnite-api.com/images/cosmetics/br';

export const AVATAR_CHARACTER_NAMESPACE = 'ATHENACHARACTER:';

export const AvatarIconSize = {
  SmallIcon: 'smallicon',
  Icon: 'icon',
  Featured: 'featured',
} as const;

export type AvatarIconSize = (typeof AvatarIconSize)[keyof typeof AvatarIconSize];

export const AVATAR_ICON_SIZE_LIST = Object.values(AvatarIconSize);

export function isAvatarIconSize(value: unknown): value is AvatarIconSize {
  return typeof value === 'string' && AVATAR_ICON_SIZE_LIST.includes(value as AvatarIconSize);
}

export interface AvatarEntry {
  accountId: string;
  avatarId: string;
  namespace: string;
}

export interface ResolvedAvatar extends AvatarEntry {
  characterId: string | null;
  iconUrl: string | null;
}

export interface AvatarOptions {
  signal?: AbortSignal;
}

export interface AvatarResolveOptions extends AvatarOptions {
  size?: AvatarIconSize;
}

function requireString(value: unknown, parameter: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`"${parameter}" is required and must be a non-empty string`, parameter);
  }
  return value;
}

function requireAccountIds(accountIds: readonly string[]): string[] {
  if (!Array.isArray(accountIds) || accountIds.length === 0) {
    throw new ValidationError('"accountIds" must be a non-empty array', 'accountIds');
  }
  return accountIds.map((accountId, index) => requireString(accountId, `accountIds[${index}]`));
}

export function extractCharacterId(avatarId: string): string | null {
  if (typeof avatarId !== 'string' || avatarId.trim().length === 0) return null;
  const separator = avatarId.indexOf(':');
  const raw = separator >= 0 ? avatarId.slice(separator + 1) : avatarId;
  const characterId = raw.trim().toLowerCase();
  return characterId.length > 0 ? characterId : null;
}

export function buildIconUrl(
  avatarId: string,
  size: AvatarIconSize = AvatarIconSize.SmallIcon,
): string | null {
  const characterId = extractCharacterId(avatarId);
  if (!characterId) return null;
  return `${AVATAR_ICON_BASE_URL}/${characterId}/${size}.png`;
}

export class AvatarManager {
  constructor(private readonly rest: EpicRestClient) {}

  async get(
    accessToken: string,
    accountIds: readonly string[],
    options?: AvatarOptions,
  ): Promise<AvatarEntry[]> {
    requireString(accessToken, 'accessToken');
    const ids = requireAccountIds(accountIds);
    const response = await this.rest.request<AvatarEntry[]>(
      'GET',
      '/v1/avatar/fortnite/ids',
      {
        bearer: accessToken,
        query: { accountIds: ids.join(',') },
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data;
  }

  async getFor(
    accessToken: string,
    accountId: string,
    options?: AvatarOptions,
  ): Promise<AvatarEntry | null> {
    requireString(accountId, 'accountId');
    const entries = await this.get(accessToken, [accountId], options);
    return entries.find((entry) => entry.accountId === accountId) ?? entries[0] ?? null;
  }

  async resolve(
    accessToken: string,
    accountIds: readonly string[],
    options?: AvatarResolveOptions,
  ): Promise<ResolvedAvatar[]> {
    const size = options?.size ?? AvatarIconSize.SmallIcon;
    const entries = await this.get(accessToken, accountIds, options);
    return entries.map((entry) => this.resolveEntry(entry, size));
  }

  async resolveFor(
    accessToken: string,
    accountId: string,
    options?: AvatarResolveOptions,
  ): Promise<ResolvedAvatar | null> {
    const entry = await this.getFor(accessToken, accountId, options);
    if (!entry) return null;
    return this.resolveEntry(entry, options?.size ?? AvatarIconSize.SmallIcon);
  }

  resolveEntry(entry: AvatarEntry, size: AvatarIconSize = AvatarIconSize.SmallIcon): ResolvedAvatar {
    return {
      ...entry,
      characterId: extractCharacterId(entry.avatarId),
      iconUrl: buildIconUrl(entry.avatarId, size),
    };
  }

  resolveIconUrl(avatarId: string, size: AvatarIconSize = AvatarIconSize.SmallIcon): string | null {
    return buildIconUrl(avatarId, size);
  }
}
