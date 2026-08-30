import { ParseError, ValidationError } from '../core/errors.js';
import { EpicApiError } from './errors.js';
import type { SocialBanStatus } from './socialBan.js';
import type { EpicRestClient } from './rest.js';

export const MATCHMAKING_USER_AGENT_BUILD = '++Fortnite+Release-Live';

export const MATCHMAKING_USER_AGENT_PLATFORM = 'Windows/10.0.22631.1.768.64bit';

export const MATCHMAKING_DEFAULT_HOTFIX_VERSION = '1';

export const MATCHMAKING_DEFAULT_REGION = 'NAE';

export const MATCHMAKING_DEFAULT_PLAYLIST = 'playlist_defaultsolo';

export const MATCHMAKING_DEFAULT_PLATFORM = 'Windows';

export const MATCHMAKING_BAN_ERROR_CODE =
  'errors.com.epicgames.fortnite.player_banned_from_sub_game';

export interface MatchmakingBanResult {
  banned: boolean;
  banDaysRemaining: number | null;
  errorCode: string | null;
}

export interface BanCheckResult {
  banned: boolean;
  permanent: boolean;
  temporary: boolean;
  social: boolean;
  banDaysRemaining: number | null;
  matchmaking: MatchmakingBanResult;
  socialBan: SocialBanStatus;
}

export interface MatchmakingSessionAttributes {
  LINKID_s?: string;
  SUBREGION_s?: string;
  MATCHSTARTTIME_s?: string;
  REGION_s?: string;
  [key: string]: unknown;
}

export interface MatchmakingSession {
  id: string;
  totalPlayers: number;
  serverAddress: string;
  serverName?: string;
  serverPort: number;
  started: boolean;
  attributes: MatchmakingSessionAttributes;
  [key: string]: unknown;
}

export interface MatchmakingRequestAttributes {
  buildUniqueId_s?: string;
  [key: string]: unknown;
}

export interface MatchmakingRequestEntry {
  attributes: MatchmakingRequestAttributes;
  [key: string]: unknown;
}

export interface BucketIdParts {
  netCL?: string;
  hotfixVersion?: string;
  region?: string;
  playlist?: string;
}

export interface MatchmakingOptions {
  signal?: AbortSignal;
}

export interface MatchmakingTicketOptions extends MatchmakingOptions, BucketIdParts {
  bucketId?: string;
  platform?: string;
  userAgent?: string;
}

export function buildBucketId(netCL: string, parts?: Omit<BucketIdParts, 'netCL'>): string {
  const build = requireString(netCL, 'netCL');
  const hotfixVersion = parts?.hotfixVersion ?? MATCHMAKING_DEFAULT_HOTFIX_VERSION;
  const region = parts?.region ?? MATCHMAKING_DEFAULT_REGION;
  const playlist = parts?.playlist ?? MATCHMAKING_DEFAULT_PLAYLIST;
  return `${build}:${hotfixVersion}:${region}:${playlist}`;
}

export function buildUserAgent(netCL: string): string {
  const build = requireString(netCL, 'netCL');
  return `Fortnite/${MATCHMAKING_USER_AGENT_BUILD}-CL-${build} ${MATCHMAKING_USER_AGENT_PLATFORM}`;
}

function requireString(value: unknown, parameter: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`"${parameter}" is required and must be a non-empty string`, parameter);
  }
  return value;
}

function readBanDays(error: EpicApiError): number | null {
  const body = error.body;
  if (body && typeof body === 'object') {
    const value = (body as Record<string, unknown>).banDaysRemaining;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  for (const variable of error.messageVars) {
    const parsed = Number(variable);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function isBanError(error: EpicApiError): boolean {
  const code = error.errorCode ?? '';
  return code === MATCHMAKING_BAN_ERROR_CODE || code.includes('player_banned');
}

export class MatchmakingManager {
  constructor(private readonly rest: EpicRestClient) {}

  async netCL(accessToken: string, options?: MatchmakingOptions): Promise<string> {
    requireString(accessToken, 'accessToken');
    const path = '/fortnite/api/matchmaking/session/matchMakingRequest';
    const response = await this.rest.request<MatchmakingRequestEntry[]>('POST', path, {
      bearer: accessToken,
      json: { criteria: [], openPlayersRequired: 1, buildUniqueId: '', maxResults: 1 },
      ...(options?.signal ? { signal: options.signal } : {}),
    });
    const buildUniqueId = response.data?.[0]?.attributes?.buildUniqueId_s;
    if (typeof buildUniqueId !== 'string' || buildUniqueId.trim().length === 0) {
      throw new ParseError('Matchmaking request did not return a buildUniqueId (netCL)', {
        url: this.rest.buildUrl(path),
        raw: JSON.stringify(response.data),
      });
    }
    return buildUniqueId;
  }

  async ticketBan(
    accessToken: string,
    accountId: string,
    options?: MatchmakingTicketOptions,
  ): Promise<MatchmakingBanResult> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    let netCL = options?.netCL;
    if (!netCL && (!options?.bucketId || !options?.userAgent)) {
      netCL = await this.netCL(accessToken, options);
    }
    const bucketId =
      options?.bucketId ??
      buildBucketId(netCL as string, {
        hotfixVersion: options?.hotfixVersion,
        region: options?.region,
        playlist: options?.playlist,
      });
    const userAgent = options?.userAgent ?? buildUserAgent(netCL as string);
    try {
      await this.rest.request<unknown>(
        'GET',
        `/fortnite/api/game/v2/matchmakingservice/ticket/player/${encodeURIComponent(accountId)}`,
        {
          bearer: accessToken,
          query: {
            bucketId,
            partyPlayerIds: accountId,
            'player.platform': options?.platform ?? MATCHMAKING_DEFAULT_PLATFORM,
          },
          headers: { 'user-agent': userAgent },
          ...(options?.signal ? { signal: options.signal } : {}),
        },
      );
      return { banned: false, banDaysRemaining: null, errorCode: null };
    } catch (error) {
      if (error instanceof EpicApiError && isBanError(error)) {
        return {
          banned: true,
          banDaysRemaining: readBanDays(error),
          errorCode: error.errorCode,
        };
      }
      throw error;
    }
  }

  async sessionInfo(
    accessToken: string,
    accountId: string,
    options?: MatchmakingOptions,
  ): Promise<MatchmakingSession[]> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    const response = await this.rest.request<MatchmakingSession[]>(
      'GET',
      `/fortnite/api/matchmaking/session/findPlayer/${encodeURIComponent(accountId)}`,
      {
        bearer: accessToken,
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data;
  }
}
