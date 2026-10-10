import { ValidationError } from '../core/errors.js';
import type { QueryParams, RequestCacheOptions } from '../core/types.js';
import type { ContentTournament } from './content.js';
import { EpicApiError } from './errors.js';
import type { EpicRestClient } from './rest.js';

export const EVENTS_BASE_URL = 'https://events-public-service-live.ol.epicgames.com';

export const EVENTS_GAME_ID = 'Fortnite';

export const EventRegion = {
  NAEast: 'NAE',
  NAWest: 'NAW',
  NACentral: 'NAC',
  Europe: 'EU',
  Brazil: 'BR',
  Asia: 'ASIA',
  Oceania: 'OCE',
  MiddleEast: 'ME',
} as const;

export type EventRegion = (typeof EventRegion)[keyof typeof EventRegion];

export interface EventLink {
  type: string;
  code: string;
  version?: number;
}

export interface EventMetadata {
  tournamentType?: string;
  webId?: string;
  minimumAccountLevel?: number;
  TrackedStats?: string[];
  requireSystemFeatures?: string[];
  DisqualifyType?: string;
  AccountLockType?: string;
  TeamLockType?: string;
  RegionLockType?: string;
  [key: string]: unknown;
}

export interface EventScoreLocation {
  leaderboardDefId: string;
  isMainWindowLeaderboard: boolean;
}

export interface EventWindow {
  eventWindowId: string;
  eventTemplateId: string;
  countdownBeginTime: string;
  beginTime: string;
  endTime: string;
  round: number;
  payoutDelay: number;
  isTBD: boolean;
  visibility: string;
  additionalRequirements: string[];
  teammateEligibility: string;
  blackoutPeriods: unknown[];
  scoreLocations: EventScoreLocation[];
  canLiveSpectate: boolean;
  requireAllTokens: string[];
  requireAnyTokens: string[];
  requireNoneTokensCaller: string[];
  requireAllTokensCaller: string[];
  requireAnyTokensCaller: string[];
  regionMappings: Record<string, string>;
  metadata: Record<string, unknown>;
}

export interface EventInfo {
  gameId: string;
  eventId: string;
  beginTime: string;
  endTime: string;
  displayDataId: string;
  eventGroup: string;
  announcementTime: string;
  regions: string[];
  regionMappings: Record<string, string>;
  platforms: string[];
  platformMappings: Record<string, string>;
  metadata: EventMetadata;
  eventWindows: EventWindow[];
  link: EventLink;
  sourceLinkCode?: string;
  appId?: string | null;
  environment?: string | null;
}

export interface EventTiebreakerFormula {
  basePointsBits: number;
  components: Array<{ trackedStat: string; bits: number; aggregation: string; multiplier?: number }>;
}

export interface EventScoringRule {
  trackedStat: string;
  matchRule: string;
  rewardTiers: Array<{ keyValue: number; pointsEarned: number; multiplicative: boolean }>;
}

export interface EventPayout {
  rewardType: string;
  rewardMode: string;
  value: string;
  quantity: number;
  notifiesPlayer?: boolean;
}

export interface EventPayoutTier {
  scoringType: string;
  ranks: Array<{ threshold: number; payouts: EventPayout[] }>;
}

export interface EventTemplate {
  gameId: string;
  eventTemplateId: string;
  playlistId: string;
  matchCap: number;
  tiebreakerFormula: EventTiebreakerFormula;
  scoringRules: EventScoringRule[];
  payoutTable: EventPayoutTier[];
  liveSessionAttributes: string[];
  clampsToZero: boolean;
}

export interface EventLeaderboardDef {
  gameId: string;
  leaderboardDefId: string;
  leaderboardStorageId: string;
  leaderboardInstanceGroupingKeyFormat: string;
  leaderboardInstanceIdFormat: string;
  maxSessionHistorySize: number;
  useIndividualScores: boolean;
  tiebreakerFormula: EventTiebreakerFormula;
  scoringRuleSetId: string;
  clampsToZero: boolean;
  payoutsConfig?: { payoutTableIdFormat: string; payoutDate?: string };
  hidePlayerScores: boolean;
  percentileAccuracy?: number;
  discardZeroScore?: boolean;
}

export interface EventPlayer {
  gameId: string;
  accountId: string;
  tokens: string[];
  teams: Record<string, string[]>;
  pendingPayouts: unknown[];
  pendingPenalties: Record<string, unknown>;
  persistentScores: Record<string, number>;
  groupIdentity: Record<string, string>;
}

export interface EventSessionSummary {
  sessionId: string;
  endTime: string;
  trackedStats: Record<string, number>;
}

export interface EventScore {
  scoreKey?: { gameId: string; eventId: string; eventWindowId: string; _scoreId?: string | null };
  gameId?: string;
  eventId?: string;
  eventWindowId?: string;
  teamId: string;
  teamAccountIds: string[];
  liveSessionId?: string | null;
  pointsEarned: number;
  score: number;
  rank: number;
  percentile: number;
  pointBreakdown: Record<string, { timesAchieved: number; pointsEarned: number }>;
  sessionHistory: EventSessionSummary[];
  unscoredSessions: EventSessionSummary[];
  playerFlagTokens?: Record<string, string>;
}

export interface EventsData {
  player?: EventPlayer | null;
  events: EventInfo[];
  templates: EventTemplate[];
  leaderboardDefs: EventLeaderboardDef[];
  scoringRuleSets: Record<string, EventScoringRule[]>;
  payoutTables: Record<string, EventPayoutTier[]>;
  scoreLocationScoringRuleSets: Record<string, string>;
  scoreLocationPayoutTables: Record<string, string>;
  resolvedWindowLocations: Record<string, string[]>;
  eventSeries: unknown[];
  scores?: EventScore[] | null;
}

export interface EventLeaderboard {
  gameId: string;
  eventId: string;
  eventWindowId: string;
  page: number;
  totalPages: number;
  updatedTime: string;
  entries: EventScore[];
  liveSessions: Record<string, unknown>;
}

export interface EventTokens {
  accounts: Array<{ accountId: string; tokens: string[] }>;
}

export interface EventsBaseOptions {
  gameId?: string;
  cache?: boolean | RequestCacheOptions;
  signal?: AbortSignal;
}

export interface EventsDataOptions extends EventsBaseOptions {
  region?: string;
  showPastEvents?: boolean;
  showPrivateEvents?: boolean;
}

export interface EventsDownloadOptions extends EventsBaseOptions {
  region: string;
  platform: string;
  teamAccountIds?: string[];
}

export interface EventHistoryOptions extends EventsBaseOptions {
  eventWindowId?: string;
  teamAccountIds?: string[];
}

export interface EventLeaderboardOptions extends EventsBaseOptions {
  page?: number;
  rank?: number;
  teamAccountIds?: string[];
  showLiveSessions?: boolean;
}

export interface EventScoresOptions extends EventsBaseOptions {
  teams: string[][];
  fromIndex?: number;
  aroundTeamIds?: string[][];
  findTeams?: boolean;
}

export const EVENT_LEADERBOARD_PAGES = 100;

const NO_SCORE_FOUND = 'com.epicgames.events.no_score_found';

export class EventsManager {
  constructor(private readonly rest: EpicRestClient) {}

  data(accessToken: string, accountId: string, options: EventsDataOptions = {}): Promise<EventsData> {
    requireString(accountId, 'accountId');
    const query: QueryParams = {};
    if (options.region) query['region'] = options.region;
    if (options.showPastEvents !== undefined) query['showPastEvents'] = options.showPastEvents;
    if (options.showPrivateEvents !== undefined) query['showPrivateEvents'] = options.showPrivateEvents;
    return this.get<EventsData>(accessToken, `/api/v1/events/${game(options)}/data/${encode(accountId)}`, options, query);
  }

  download(accessToken: string, accountId: string, options: EventsDownloadOptions): Promise<EventsData> {
    requireString(accountId, 'accountId');
    requireString(options?.region, 'region');
    requireString(options?.platform, 'platform');
    return this.get<EventsData>(accessToken, `/api/v1/events/${game(options)}/download/${encode(accountId)}`, options, {
      region: options.region,
      platform: options.platform,
      teamAccountIds: (options.teamAccountIds ?? [accountId]).join(','),
    });
  }

  player(accessToken: string, accountId: string, options: EventsBaseOptions = {}): Promise<EventPlayer> {
    requireString(accountId, 'accountId');
    return this.get<EventPlayer>(accessToken, `/api/v1/players/${game(options)}/${encode(accountId)}`, options);
  }

  tokens(accessToken: string, accountIds: string[], options: EventsBaseOptions = {}): Promise<EventTokens> {
    const ids = requireIds(accountIds, 'accountIds');
    return this.get<EventTokens>(accessToken, `/api/v1/players/${game(options)}/tokens`, options, {
      teamAccountIds: ids.join(','),
    });
  }

  history(accessToken: string, eventId: string, accountId: string, options: EventHistoryOptions = {}): Promise<EventScore[]> {
    requireString(eventId, 'eventId');
    requireString(accountId, 'accountId');
    const window = options.eventWindowId ? `/${encode(options.eventWindowId)}` : '';
    const query: QueryParams = {};
    if (options.teamAccountIds?.length) query['teamAccountIds'] = options.teamAccountIds.join(',');
    return this.get<EventScore[]>(
      accessToken,
      `/api/v1/events/${game(options)}/${encode(eventId)}${window}/history/${encode(accountId)}`,
      options,
      query,
    );
  }

  leaderboard(
    accessToken: string,
    eventId: string,
    eventWindowId: string,
    accountId: string,
    options: EventLeaderboardOptions = {},
  ): Promise<EventLeaderboard> {
    requireString(eventId, 'eventId');
    requireString(eventWindowId, 'eventWindowId');
    requireString(accountId, 'accountId');
    const page = options.page ?? 0;
    if (!Number.isInteger(page) || page < 0 || page >= EVENT_LEADERBOARD_PAGES) {
      throw new ValidationError(`"page" must be an integer between 0 and ${EVENT_LEADERBOARD_PAGES - 1}`, 'page');
    }
    return this.get<EventLeaderboard>(
      accessToken,
      `/api/v1/leaderboards/${game(options)}/${encode(eventId)}/${encode(eventWindowId)}/${encode(accountId)}`,
      options,
      {
        page,
        rank: options.rank ?? 0,
        teamAccountIds: (options.teamAccountIds ?? []).join(','),
        appId: 'Fortnite',
        showLiveSessions: options.showLiveSessions ?? false,
      },
    );
  }

  async scores(
    accessToken: string,
    eventId: string,
    eventWindowId: string,
    accountId: string,
    options: EventScoresOptions,
  ): Promise<EventScore[]> {
    requireString(accessToken, 'accessToken');
    requireString(eventId, 'eventId');
    requireString(eventWindowId, 'eventWindowId');
    requireString(accountId, 'accountId');
    if (!Array.isArray(options?.teams) || options.teams.length === 0) {
      throw new ValidationError('"teams" must list at least one team of account ids', 'teams');
    }
    if (options.fromIndex === undefined && !options.aroundTeamIds?.length) {
      throw new ValidationError('Pass either "fromIndex" or "aroundTeamIds"', 'fromIndex');
    }
    const query: QueryParams = { accountId };
    if (options.fromIndex !== undefined) query['fromIndex'] = options.fromIndex;
    if (options.aroundTeamIds?.length) query['aroundTeamId'] = options.aroundTeamIds.map((team) => team.join(':'));
    if (options.findTeams !== undefined) query['findTeams'] = options.findTeams;
    try {
      const response = await this.rest.request<EventScore[]>(
        'POST',
        `/api/v2/games/${game(options)}/leaderboards/${encode(eventId)}/${encode(eventWindowId)}/scores`,
        {
          bearer: accessToken,
          query,
          json: { teams: options.teams },
          idempotent: true,
          ...(options.signal ? { signal: options.signal } : {}),
        },
      );
      return response.data;
    } catch (error) {
      if (error instanceof EpicApiError && error.errorCode === NO_SCORE_FOUND) return [];
      throw error;
    }
  }

  private async get<T>(accessToken: string, path: string, options: EventsBaseOptions, query: QueryParams = {}): Promise<T> {
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

export type TournamentStatus = 'upcoming' | 'live' | 'ended';

export interface TournamentWindow {
  id: string;
  round: number;
  status: TournamentStatus;
  countdownTime: string;
  beginTime: string;
  endTime: string;
  isTBD: boolean;
  visibility: string;
  playlistId: string | null;
  matchCap: number | null;
  requirements: string[];
  requiredTokens: { all: string[]; any: string[]; none: string[] };
  eligible: boolean | null;
  leaderboards: string[];
  scoring: EventScoringRule[];
  payouts: EventPayoutTier[];
  brackets: TournamentBracket[];
  canLiveSpectate: boolean;
  raw: EventWindow;
}

export interface TournamentBracket {
  id: string;
  scoring: EventScoringRule[];
  payouts: EventPayoutTier[];
}

export interface TournamentImages {
  poster: string | null;
  posterBack: string | null;
  square: string | null;
  background: string | null;
  loadingScreen: string | null;
  playlistTile: string | null;
}

export interface Tournament {
  eventId: string;
  displayId: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  schedule: string | null;
  type: string | null;
  group: string;
  status: TournamentStatus;
  regions: string[];
  platforms: string[];
  minimumAccountLevel: number | null;
  announcementTime: string;
  beginTime: string;
  endTime: string;
  nextWindow: TournamentWindow | null;
  windows: TournamentWindow[];
  images: TournamentImages;
  colors: { primary: string | null; secondary: string | null; title: string | null };
  linkCode: string | null;
  display: ContentTournament | null;
  raw: EventInfo;
}

export interface TournamentListOptions extends EventsDataOptions {
  eligibility?: boolean;
  now?: number;
}

export interface TournamentShapeOptions {
  now?: number;
  tokens?: string[] | null;
}

const STATUS_ORDER: Record<TournamentStatus, number> = { live: 0, upcoming: 1, ended: 2 };

export function windowStatus(window: Pick<EventWindow, 'beginTime' | 'endTime'>, now = Date.now()): TournamentStatus {
  if (Date.parse(window.endTime) <= now) return 'ended';
  return Date.parse(window.beginTime) <= now ? 'live' : 'upcoming';
}

export function windowEligible(window: EventWindow, tokens: string[]): boolean {
  const owned = new Set(tokens.map((token) => token.toLowerCase()));
  const has = (token: string): boolean => owned.has(token.toLowerCase());
  const all = [...window.requireAllTokens, ...window.requireAllTokensCaller];
  const any = [...window.requireAnyTokens, ...window.requireAnyTokensCaller];
  return all.every(has) && (any.length === 0 || any.some(has)) && !window.requireNoneTokensCaller.some(has);
}

export function toTournaments(
  data: EventsData,
  display: ContentTournament[] = [],
  options: TournamentShapeOptions = {},
): Tournament[] {
  const now = options.now ?? Date.now();
  const tokens = options.tokens ?? data.player?.tokens ?? null;
  const displays = new Map(display.map((entry) => [entry.tournament_display_id.toLowerCase(), entry]));
  const templates = new Map((data.templates ?? []).map((template) => [template.eventTemplateId, template]));

  const tournaments = (data.events ?? []).map((event): Tournament => {
    const info = displays.get(event.displayDataId.toLowerCase()) ?? null;
    const windows = [...event.eventWindows]
      .map((window): TournamentWindow => {
        const template = templates.get(window.eventTemplateId);
        const location = `${event.gameId}:${event.eventId}:${window.eventWindowId}`;
        return {
          id: window.eventWindowId,
          round: window.round,
          status: windowStatus(window, now),
          countdownTime: window.countdownBeginTime,
          beginTime: window.beginTime,
          endTime: window.endTime,
          isTBD: window.isTBD,
          visibility: window.visibility,
          playlistId: template?.playlistId ?? null,
          matchCap: template?.matchCap ?? null,
          requirements: window.additionalRequirements ?? [],
          requiredTokens: {
            all: [...window.requireAllTokens, ...window.requireAllTokensCaller],
            any: [...window.requireAnyTokens, ...window.requireAnyTokensCaller],
            none: [...window.requireNoneTokensCaller],
          },
          eligible: tokens ? windowEligible(window, tokens) : null,
          leaderboards: window.scoreLocations.map((entry) => entry.leaderboardDefId),
          scoring: locationScoring(data, location) ?? template?.scoringRules ?? [],
          payouts: locationPayouts(data, location) ?? template?.payoutTable ?? [],
          brackets: (data.resolvedWindowLocations?.[location] ?? [])
            .filter((key) => key !== location)
            .map((key) => ({
              id: key.slice(key.lastIndexOf(':') + 1),
              scoring: locationScoring(data, key) ?? [],
              payouts: locationPayouts(data, key) ?? [],
            })),
          canLiveSpectate: window.canLiveSpectate,
          raw: window,
        };
      })
      .sort((a, b) => Date.parse(a.beginTime) - Date.parse(b.beginTime) || a.round - b.round);

    const nextWindow = windows.find((window) => window.status === 'live') ?? windows.find((window) => window.status === 'upcoming') ?? null;
    const status: TournamentStatus = nextWindow?.status ?? 'ended';
    return {
      eventId: event.eventId,
      displayId: event.displayDataId,
      name: info?.long_format_title || joinTitle(info) || event.eventId,
      subtitle: info?.title_line_2 || null,
      description: info?.details_description || info?.flavor_description || null,
      schedule: info?.schedule_info || null,
      type: event.metadata?.tournamentType ?? null,
      group: event.eventGroup,
      status,
      regions: event.regions,
      platforms: event.platforms,
      minimumAccountLevel: event.metadata?.minimumAccountLevel ?? null,
      announcementTime: event.announcementTime,
      beginTime: event.beginTime,
      endTime: event.endTime,
      nextWindow,
      windows,
      images: {
        poster: info?.poster_front_image ?? null,
        posterBack: info?.poster_back_image ?? null,
        square: info?.square_poster_image ?? null,
        background: info?.tournament_view_background_image ?? null,
        loadingScreen: info?.loading_screen_image ?? null,
        playlistTile: info?.playlist_tile_image ?? null,
      },
      colors: {
        primary: colour(info?.primary_color),
        secondary: colour(info?.secondary_color),
        title: colour(info?.title_color),
      },
      linkCode: event.link?.code ?? null,
      display: info,
      raw: event,
    };
  });

  return tournaments.sort((a, b) => {
    const order = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (order !== 0) return order;
    if (a.status === 'ended') return Date.parse(b.endTime) - Date.parse(a.endTime);
    return Date.parse(a.nextWindow!.beginTime) - Date.parse(b.nextWindow!.beginTime);
  });
}

function locationScoring(data: EventsData, location: string): EventScoringRule[] | undefined {
  const id = data.scoreLocationScoringRuleSets?.[location];
  return id ? data.scoringRuleSets?.[id] : undefined;
}

function locationPayouts(data: EventsData, location: string): EventPayoutTier[] | undefined {
  const id = data.scoreLocationPayoutTables?.[location];
  return id ? data.payoutTables?.[id] : undefined;
}

function joinTitle(info: ContentTournament | null): string {
  return [info?.title_line_1, info?.title_line_2].filter(Boolean).join(' ');
}

function colour(value: string | undefined): string | null {
  return value ? `#${value.replace(/^#/, '')}` : null;
}

function game(options: EventsBaseOptions): string {
  return encode(options.gameId ?? EVENTS_GAME_ID);
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

function requireIds(value: unknown, parameter: string): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.some((id) => typeof id !== 'string' || id.length === 0)) {
    throw new ValidationError(`"${parameter}" must be a non-empty array of account ids`, parameter);
  }
  return value as string[];
}
