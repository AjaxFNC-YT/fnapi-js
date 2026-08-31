import { ValidationError } from '../core/errors.js';
import type { EpicRestClient } from './rest.js';

export const AVATAR_BASE_URL = 'https://avatar-service-prod.identity.live.on.epicgames.com';

export const AVATAR_ICON_BASE_URL = 'https://fortnite-api.com/images/cosmetics/br';

export const FNCC_AVATAR_ICON_BASE_URL = 'https://cdn.fn-api.cc/cosmetics/br';

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

export const AvatarImageSource = {
  Fncc: 'fncc',
  FortniteApi: 'fortnite-api',
} as const;

export type AvatarImageSource = (typeof AvatarImageSource)[keyof typeof AvatarImageSource];

export const AVATAR_IMAGE_SOURCE_LIST = Object.values(AvatarImageSource);

export const DEFAULT_AVATAR_IMAGE_SOURCE: AvatarImageSource = AvatarImageSource.Fncc;

export function isAvatarImageSource(value: unknown): value is AvatarImageSource {
  return (
    typeof value === 'string' && AVATAR_IMAGE_SOURCE_LIST.includes(value as AvatarImageSource)
  );
}

export interface AvatarEntry {
  accountId: string;
  avatarId: string;
  namespace: string;
}

export interface ResolvedAvatar extends AvatarEntry {
  characterId: string | null;
  source: AvatarImageSource;
  iconUrl: string | null;
  iconUrls: Record<AvatarImageSource, string | null>;
}

export interface AvatarOptions {
  signal?: AbortSignal;
}

export interface AvatarResolveOptions extends AvatarOptions {
  size?: AvatarIconSize;
  source?: AvatarImageSource;
}

export type AvatarImageResolver = (
  characterId: string,
  size: AvatarIconSize,
  options?: AvatarOptions,
) => Promise<string | null>;

export interface AvatarManagerOptions {
  source?: AvatarImageSource;
  imageResolver?: AvatarImageResolver;
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

function buildIconUrlFromCharacterId(
  characterId: string,
  size: AvatarIconSize,
  source: AvatarImageSource,
): string {
  if (source === AvatarImageSource.Fncc) {
    const fnccSize = size === AvatarIconSize.Featured ? AvatarIconSize.Icon : size;
    return `${FNCC_AVATAR_ICON_BASE_URL}/${characterId}/${fnccSize}.png`;
  }
  return `${AVATAR_ICON_BASE_URL}/${characterId}/${size}.png`;
}

export function buildIconUrl(
  avatarId: string,
  size: AvatarIconSize = AvatarIconSize.SmallIcon,
  source: AvatarImageSource = DEFAULT_AVATAR_IMAGE_SOURCE,
): string | null {
  const characterId = extractCharacterId(avatarId);
  if (!characterId) return null;
  return buildIconUrlFromCharacterId(characterId, size, source);
}

export function buildIconUrls(
  avatarId: string,
  size: AvatarIconSize = AvatarIconSize.SmallIcon,
): Record<AvatarImageSource, string | null> {
  const characterId = extractCharacterId(avatarId);
  const urls = {} as Record<AvatarImageSource, string | null>;
  for (const source of AVATAR_IMAGE_SOURCE_LIST) {
    urls[source] = characterId ? buildIconUrlFromCharacterId(characterId, size, source) : null;
  }
  return urls;
}

export class AvatarManager {
  private readonly defaultSource: AvatarImageSource;
  private readonly imageResolver: AvatarImageResolver | null;

  constructor(
    private readonly rest: EpicRestClient,
    options?: AvatarManagerOptions,
  ) {
    this.defaultSource = options?.source ?? DEFAULT_AVATAR_IMAGE_SOURCE;
    this.imageResolver = options?.imageResolver ?? null;
  }

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
    const source = options?.source ?? this.defaultSource;
    const entries = await this.get(accessToken, accountIds, options);
    return Promise.all(entries.map((entry) => this.resolveEntryLive(entry, size, source, options)));
  }

  async resolveFor(
    accessToken: string,
    accountId: string,
    options?: AvatarResolveOptions,
  ): Promise<ResolvedAvatar | null> {
    const entry = await this.getFor(accessToken, accountId, options);
    if (!entry) return null;
    return this.resolveEntryLive(
      entry,
      options?.size ?? AvatarIconSize.SmallIcon,
      options?.source ?? this.defaultSource,
      options,
    );
  }

  resolveEntry(
    entry: AvatarEntry,
    size: AvatarIconSize = AvatarIconSize.SmallIcon,
    source: AvatarImageSource = this.defaultSource,
  ): ResolvedAvatar {
    return {
      ...entry,
      characterId: extractCharacterId(entry.avatarId),
      source,
      iconUrl: buildIconUrl(entry.avatarId, size, source),
      iconUrls: buildIconUrls(entry.avatarId, size),
    };
  }

  private async resolveEntryLive(
    entry: AvatarEntry,
    size: AvatarIconSize,
    source: AvatarImageSource,
    options?: AvatarOptions,
  ): Promise<ResolvedAvatar> {
    const resolved = this.resolveEntry(entry, size, source);
    if (source !== AvatarImageSource.Fncc || !this.imageResolver || !resolved.characterId) {
      return resolved;
    }
    const liveUrl = await this.imageResolver(resolved.characterId, size, options);
    if (!liveUrl) return resolved;
    return {
      ...resolved,
      iconUrl: liveUrl,
      iconUrls: { ...resolved.iconUrls, [AvatarImageSource.Fncc]: liveUrl },
    };
  }

  resolveIconUrl(
    avatarId: string,
    size: AvatarIconSize = AvatarIconSize.SmallIcon,
    source: AvatarImageSource = this.defaultSource,
  ): string | null {
    return buildIconUrl(avatarId, size, source);
  }

  resolveIconUrls(
    avatarId: string,
    size: AvatarIconSize = AvatarIconSize.SmallIcon,
  ): Record<AvatarImageSource, string | null> {
    return buildIconUrls(avatarId, size);
  }
}
