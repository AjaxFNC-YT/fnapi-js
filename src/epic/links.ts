import { ValidationError } from '../core/errors.js';
import type { QueryParams, RequestCacheOptions } from '../core/types.js';
import { EpicApiError } from './errors.js';
import type { EpicRestClient } from './rest.js';

export const LINKS_BASE_URL = 'https://links-public-service-live.ol.epicgames.com';

export const DISCOVERY_BASE_URL = 'https://fn-service-discovery-live-public.ogs.live.on.epicgames.com';

export const LINKS_NAMESPACE = 'fn';

export const LINKS_BULK_LIMIT = 100;

export const CREATOR_PAGE_LIMIT = 100;

export interface LinkImageUrls {
  url?: string;
  url_xs?: string;
  url_s?: string;
  url_m?: string;
}

export interface LinkRatingBoard {
  rating: string;
  initial_rating?: string;
  rating_overridden?: boolean;
  descriptors?: string[];
  interactive_elements?: string[];
}

export interface LinkMatchmaking {
  maxPlayers?: number;
  minPlayers?: number;
  maxTeamCount?: number;
  maxTeamSize?: number;
  minTeamSize?: number;
  allowJoinInProgress?: boolean;
  [key: string]: unknown;
}

export interface LinkMetadata {
  title?: string;
  tagline?: string;
  introduction?: string;
  locale?: string;
  image_url?: string;
  image_urls?: LinkImageUrls;
  alt_title?: Record<string, string>;
  alt_tagline?: Record<string, string>;
  alt_introduction?: Record<string, string>;
  mode?: string;
  genres?: string[];
  supportCode?: string;
  projectId?: string;
  quicksilver_id?: string;
  product_tag?: string;
  parent_set?: string;
  parent_experience?: string;
  sub_link_codes?: string[];
  matchmaking?: Record<string, unknown>;
  matchmakingV2?: LinkMatchmaking;
  ratings?: { rating_received_time?: string; boards?: Record<string, LinkRatingBoard> };
  video_vuid?: string;
  [key: string]: unknown;
}

export interface LinkMnemonic {
  namespace: string;
  accountId: string;
  creatorName: string;
  mnemonic: string;
  linkType: string;
  metadata: LinkMetadata;
  version: number;
  active: boolean;
  disabled: boolean;
  created: string;
  published?: string;
  updated?: string;
  descriptionTags: string[];
  moderationStatus?: string;
  lastActivatedDate?: string;
  discoveryIntent?: string;
  linkState?: string;
  activationHistory?: unknown[];
}

export interface LinkRelated {
  parentLinks: LinkMnemonic[];
  links: Record<string, LinkMnemonic>;
}

export interface CreatorPageLink {
  linkCode: string;
  lastActivatedDate?: string;
  isFavorite: boolean;
  globalCCU: number;
  lockStatus: string;
  lockStatusReason?: string;
  isVisible: boolean;
}

export interface CreatorPage {
  creatorId: string;
  links: CreatorPageLink[];
  hasMore: boolean;
}

export interface LinkLookup {
  mnemonic: string;
  type?: string;
  version?: number;
}

export interface LinksBaseOptions {
  namespace?: string;
  cache?: boolean | RequestCacheOptions;
  signal?: AbortSignal;
}

export interface LinkLookupOptions extends LinksBaseOptions {
  type?: string;
  version?: number;
  includeActivationHistory?: boolean;
}

export interface CreatorPageOptions extends Omit<LinksBaseOptions, 'namespace'> {
  limit?: number;
  olderThan?: string;
}

const MISSING_LINK_CODES = new Set([
  'errors.com.epicgames.links.no_active_version',
  'errors.com.epicgames.links.mnemonic_not_found',
  'errors.com.epicgames.links.not_found',
]);

export class LinksManager {
  constructor(
    private readonly rest: EpicRestClient,
    private readonly discoveryRest: EpicRestClient,
  ) {}

  async mnemonic(accessToken: string, mnemonic: string, options: LinkLookupOptions = {}): Promise<LinkMnemonic | null> {
    requireString(mnemonic, 'mnemonic');
    const query: QueryParams = {};
    if (options.type) query['type'] = options.type;
    if (options.version !== undefined) query['v'] = options.version;
    if (options.includeActivationHistory !== undefined) query['includeActivationHistory'] = options.includeActivationHistory;
    try {
      return await this.get<LinkMnemonic>(accessToken, `${base(options)}/mnemonic/${encode(mnemonic)}`, options, query);
    } catch (error) {
      if (isMissingLink(error)) return null;
      throw error;
    }
  }

  async mnemonics(
    accessToken: string,
    lookups: Array<string | LinkLookup>,
    options: LinksBaseOptions = {},
  ): Promise<LinkMnemonic[]> {
    requireString(accessToken, 'accessToken');
    if (!Array.isArray(lookups) || lookups.length === 0) {
      throw new ValidationError('"mnemonics" must be a non-empty array', 'mnemonics');
    }
    const body = lookups.map((lookup) => {
      const entry = typeof lookup === 'string' ? { mnemonic: lookup } : lookup;
      requireString(entry?.mnemonic, 'mnemonic');
      return { mnemonic: entry.mnemonic, type: entry.type ?? '', filter: false, v: entry.version?.toString() ?? '' };
    });
    const results: LinkMnemonic[] = [];
    for (let index = 0; index < body.length; index += LINKS_BULK_LIMIT) {
      const response = await this.rest.request<LinkMnemonic[]>('POST', `${base(options)}/mnemonic`, {
        bearer: accessToken,
        query: { ignoreFailures: true },
        json: body.slice(index, index + LINKS_BULK_LIMIT),
        idempotent: true,
        ...(options.signal ? { signal: options.signal } : {}),
      });
      results.push(...response.data);
    }
    return results;
  }

  related(accessToken: string, mnemonic: string, options: LinkLookupOptions = {}): Promise<LinkRelated> {
    requireString(mnemonic, 'mnemonic');
    const query: QueryParams = {};
    if (options.version !== undefined) query['v'] = options.version;
    return this.get<LinkRelated>(accessToken, `${base(options)}/mnemonic/${encode(mnemonic)}/related`, options, query);
  }

  versions(accessToken: string, mnemonic: string, options: LinksBaseOptions = {}): Promise<LinkMnemonic[]> {
    requireString(mnemonic, 'mnemonic');
    return this.get<LinkMnemonic[]>(accessToken, `${base(options)}/mnemonic/${encode(mnemonic)}/all`, options);
  }

  author(accessToken: string, accountId: string, options: LinksBaseOptions = {}): Promise<LinkMnemonic[]> {
    requireString(accountId, 'accountId');
    return this.get<LinkMnemonic[]>(accessToken, `${base(options)}/author/${encode(accountId)}`, options);
  }

  async creatorPage(
    accessToken: string,
    creatorAccountId: string,
    playerId: string,
    options: CreatorPageOptions = {},
  ): Promise<CreatorPage> {
    requireString(accessToken, 'accessToken');
    requireString(creatorAccountId, 'creatorAccountId');
    requireString(playerId, 'playerId');
    const limit = options.limit ?? CREATOR_PAGE_LIMIT;
    if (!Number.isInteger(limit) || limit < 1 || limit > CREATOR_PAGE_LIMIT) {
      throw new ValidationError(`"limit" must be between 1 and ${CREATOR_PAGE_LIMIT}`, 'limit');
    }
    const query: QueryParams = { playerId, limit };
    if (options.olderThan) query['olderThan'] = options.olderThan;
    const response = await this.discoveryRest.request<CreatorPage>(
      'GET',
      `/api/v1/creator/page/${encode(creatorAccountId)}`,
      {
        bearer: accessToken,
        query,
        ...(options.cache !== undefined ? { cache: options.cache } : {}),
        ...(options.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data;
  }

  private async get<T>(accessToken: string, path: string, options: LinksBaseOptions, query: QueryParams = {}): Promise<T> {
    requireString(accessToken, 'accessToken');
    const response = await this.rest.request<T>('GET', path, {
      bearer: accessToken,
      query,
      ...(options.cache !== undefined ? { cache: options.cache } : {}),
      ...(options.signal ? { signal: options.signal } : {}),
    });
    return response.data;
  }
}

export interface Island {
  code: string;
  type: string;
  title: string;
  tagline: string | null;
  description: string | null;
  creator: { accountId: string; name: string };
  version: number;
  active: boolean;
  state: string | null;
  moderationStatus: string | null;
  discoveryIntent: string | null;
  tags: string[];
  genres: string[];
  mode: string | null;
  players: { min: number | null; max: number | null };
  image: string | null;
  images: LinkImageUrls;
  ratings: Record<string, string>;
  supportCode: string | null;
  projectId: string | null;
  createdAt: string;
  publishedAt: string | null;
  updatedAt: string | null;
  lastActivatedAt: string | null;
  link: LinkMnemonic;
}

export function toIsland(link: LinkMnemonic, locale?: string): Island {
  const meta = link.metadata ?? {};
  const localized = (base: string | undefined, alternatives: Record<string, string> | undefined): string | null =>
    (locale ? alternatives?.[locale] : undefined) ?? base ?? null;
  const players = meta.matchmakingV2 ?? {};
  return {
    code: link.mnemonic,
    type: link.linkType,
    title: localized(meta.title, meta.alt_title) ?? link.mnemonic,
    tagline: localized(meta.tagline, meta.alt_tagline),
    description: localized(meta.introduction, meta.alt_introduction),
    creator: { accountId: link.accountId, name: link.creatorName },
    version: link.version,
    active: link.active && !link.disabled,
    state: link.linkState ?? null,
    moderationStatus: link.moderationStatus ?? null,
    discoveryIntent: link.discoveryIntent ?? null,
    tags: link.descriptionTags ?? [],
    genres: meta.genres ?? [],
    mode: meta.mode ?? null,
    players: {
      min: typeof players.minPlayers === 'number' ? players.minPlayers : null,
      max: typeof players.maxPlayers === 'number' ? players.maxPlayers : null,
    },
    image: meta.image_urls?.url ?? meta.image_url ?? null,
    images: meta.image_urls ?? (meta.image_url ? { url: meta.image_url } : {}),
    ratings: Object.fromEntries(
      Object.entries(meta.ratings?.boards ?? {}).map(([board, entry]) => [board, entry.rating]),
    ),
    supportCode: meta.supportCode ?? null,
    projectId: meta.projectId ?? null,
    createdAt: link.created,
    publishedAt: link.published ?? null,
    updatedAt: link.updated ?? null,
    lastActivatedAt: link.lastActivatedDate ?? null,
    link,
  };
}

function isMissingLink(error: unknown): boolean {
  return (
    error instanceof EpicApiError &&
    (error.status === 404 || (error.errorCode !== null && MISSING_LINK_CODES.has(error.errorCode)))
  );
}

function base(options: LinksBaseOptions): string {
  return `/links/api/${encode(options.namespace ?? LINKS_NAMESPACE)}`;
}

function encode(value: string): string {
  return encodeURIComponent(value);
}

function requireString(value: unknown, parameter: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new ValidationError(`"${parameter}" is required`, parameter);
  }
  return value;
}
