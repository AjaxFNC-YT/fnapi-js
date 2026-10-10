import { ValidationError } from '../core/errors.js';
import type { RequestCacheOptions } from '../core/types.js';
import type { EpicRestClient } from './rest.js';

export const CONTENT_PAGES_BASE_URL = 'https://fortnitecontent-website-prod07.ol.epicgames.com';

export const ContentPageKey = {
  FortniteGame: 'fortnite-game',
  FortniteEditor: 'fortnite-editor',
} as const;

export type ContentPageKey = (typeof ContentPageKey)[keyof typeof ContentPageKey];

export interface ContentPageOptions {
  lang?: string;
  signal?: AbortSignal;
  cache?: boolean | RequestCacheOptions;
}

export interface ContentSection {
  _title: string;
  _noIndex?: boolean;
  _activeDate: string;
  lastModified: string;
  _locale: string;
  _templateName: string;
  [field: string]: unknown;
}

export interface ContentPage {
  _title: string;
  _activeDate: string;
  lastModified: string;
  _locale: string;
  _templateName: string;
  _suggestedPrefetch?: unknown[];
  [section: string]: unknown;
}

export interface ContentEmergencyNotice {
  _type?: string;
  title: string;
  body: string;
  hidden: boolean;
  gamemodes?: string[];
  platforms?: string[];
}

export interface ContentMotd {
  _type?: string;
  id: string;
  title: string;
  body: string;
  image?: string;
  tileImage?: string;
  entryType?: string;
  hidden: boolean;
  spotlight?: boolean;
  sortingPriority?: number;
  tabTitleOverride?: string;
  videoString?: string;
  videoUID?: string;
  videoAutoplay?: boolean;
  videoFullscreen?: boolean;
  videoLoop?: boolean;
  videoMute?: boolean;
  videoStreamingEnabled?: boolean;
}

export interface ContentTournament {
  _type?: string;
  tournament_display_id: string;
  title_line_1?: string;
  title_line_2?: string;
  long_format_title?: string;
  short_format_title?: string;
  schedule_info?: string;
  details_description?: string;
  flavor_description?: string;
  pin_score_requirement?: number;
  pin_earned_text?: string;
  loading_screen_image?: string;
  playlist_tile_image?: string;
  poster_front_image?: string;
  poster_back_image?: string;
  square_poster_image?: string;
  tournament_view_background_image?: string;
  primary_color?: string;
  secondary_color?: string;
  title_color?: string;
  background_text_color?: string;
  background_left_color?: string;
  background_right_color?: string;
  [field: string]: unknown;
}

export interface ContentBackground {
  _type?: string;
  key: string;
  stage: string;
  backgroundimage?: string;
}

export interface ContentShopSection {
  _type?: string;
  sectionId: string;
  sectionDisplayName?: string;
  landingPriority: number;
  bHidden: boolean;
  bShowTimer?: boolean;
  bShowIneligibleOffers?: boolean;
  bShowIneligibleOffersIfGiftable?: boolean;
  bSortOffersByOwnership?: boolean;
  bEnableToastNotification?: boolean;
  background?: ContentBackground;
  [field: string]: unknown;
}

export interface ContentLoginMessage {
  title: string;
  body: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function requireString(value: unknown, parameter: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`"${parameter}" is required and must be a non-empty string`, parameter);
  }
  return value;
}

export class ContentPagesManager {
  constructor(private readonly rest: EpicRestClient) {}

  async pages(key: ContentPageKey | (string & {}) = ContentPageKey.FortniteGame, options?: ContentPageOptions): Promise<ContentPage> {
    requireString(key, 'key');
    const response = await this.rest.request<ContentPage>('GET', `/content/api/pages/${encodeURIComponent(key)}`, this.requestOptions(options));
    return response.data;
  }

  async page<T extends Record<string, unknown> = ContentSection>(
    key: ContentPageKey | (string & {}),
    subKey: string,
    options?: ContentPageOptions,
  ): Promise<T> {
    requireString(key, 'key');
    requireString(subKey, 'subKey');
    const path = `/content/api/pages/${encodeURIComponent(key)}/${encodeURIComponent(subKey)}`;
    const response = await this.rest.request<T>('GET', path, this.requestOptions(options));
    return response.data;
  }

  async emergencyNotices(options?: ContentPageOptions): Promise<ContentEmergencyNotice[]> {
    const section = asRecord((await this.pages(ContentPageKey.FortniteGame, options))['emergencynoticev2']);
    return asArray<ContentEmergencyNotice>(asRecord(section['emergencynotices'])['emergencynotices']);
  }

  async motds(options?: ContentPageOptions): Promise<ContentMotd[]> {
    const section = asRecord((await this.pages(ContentPageKey.FortniteGame, options))['battleroyalenewsv2']);
    return asArray<ContentMotd>(asRecord(section['news'])['motds']);
  }

  async tournaments(options?: ContentPageOptions): Promise<ContentTournament[]> {
    const section = asRecord((await this.pages(ContentPageKey.FortniteGame, options))['tournamentinformation']);
    return asArray<ContentTournament>(asRecord(section['tournament_info'])['tournaments']);
  }

  async tournament(displayId: string, options?: ContentPageOptions): Promise<ContentTournament | null> {
    requireString(displayId, 'displayId');
    const tournaments = await this.tournaments(options);
    return tournaments.find((entry) => entry.tournament_display_id === displayId) ?? null;
  }

  async backgrounds(options?: ContentPageOptions): Promise<ContentBackground[]> {
    const section = asRecord((await this.pages(ContentPageKey.FortniteGame, options))['dynamicbackgrounds']);
    return asArray<ContentBackground>(asRecord(section['backgrounds'])['backgrounds']);
  }

  async shopSections(options?: ContentPageOptions): Promise<ContentShopSection[]> {
    const section = asRecord((await this.pages(ContentPageKey.FortniteGame, options))['shopSections']);
    return asArray<ContentShopSection>(asRecord(section['sectionList'])['sections']);
  }

  async loginMessage(options?: ContentPageOptions): Promise<ContentLoginMessage | null> {
    const section = asRecord((await this.pages(ContentPageKey.FortniteGame, options))['loginmessage']);
    const message = asRecord(asRecord(section['loginmessage'])['message']);
    const title = typeof message['title'] === 'string' ? message['title'] : '';
    const body = typeof message['body'] === 'string' ? message['body'] : '';
    return title || body ? { title, body } : null;
  }

  private requestOptions(options?: ContentPageOptions) {
    return {
      query: { lang: options?.lang ?? 'en' },
      cache: options?.cache ?? { ttl: 60_000 },
      ...(options?.signal ? { signal: options.signal } : {}),
    };
  }
}
