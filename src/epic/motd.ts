import { ValidationError } from '../core/errors.js';
import type { EpicRestClient } from './rest.js';

export const MOTD_BASE_URL = 'https://prm-dialogue-public-api-prod.edea.live.use1a.on.epicgames.com';

export const MOTD_DEFAULT_TAGS = ['Product.BR'];

export interface MotdParameters {
  platform?: string;
  language?: string;
  serverRegion?: string;
  country?: string;
  [parameter: string]: unknown;
}

export interface MotdOptions {
  channel?: string;
  tags?: string[];
  parameters?: MotdParameters;
  signal?: AbortSignal;
}

export interface MotdImage {
  width: number;
  height: number;
  url: string;
}

export interface MotdVideo {
  _type?: string;
  UID: string;
  VideoString: string;
  Autoplay: boolean;
  ShouldLoop: boolean;
  StreamingEnabled: boolean;
  StartTime?: number;
  EndTime?: number;
}

export interface MotdBackground {
  _type?: string;
  Image: MotdImage[];
  Video?: MotdVideo;
}

export interface MotdButton {
  _type?: string;
  Text: string;
  Style: string;
  Action: { _type: string; [field: string]: unknown };
}

export interface MotdContentFields {
  TeaserTitle?: string;
  TeaserBackground?: MotdBackground;
  FullScreenTitle?: string;
  FullScreenBody?: string;
  FullScreenBackground?: MotdBackground;
  Buttons?: MotdButton[];
  VerticalTextLayout?: boolean;
  [field: string]: unknown;
}

export interface MotdPlacement {
  trackingId: string;
  tag: string;
  locations: string[];
  position: number;
}

export interface MotdItem {
  contentHash: string;
  contentSchemaName: string;
  contentFields: MotdContentFields;
  placements: MotdPlacement[];
}

export interface MotdResponse {
  tcId: string | null;
  contentItems: MotdItem[];
}

export class MotdManager {
  constructor(private readonly rest: EpicRestClient) {}

  async target(accessToken: string, options: MotdOptions = {}): Promise<MotdResponse> {
    if (typeof accessToken !== 'string' || accessToken.trim().length === 0) {
      throw new ValidationError('"accessToken" is required and must be a non-empty string', 'accessToken');
    }
    const channel = options.channel ?? 'motd';
    const response = await this.rest.request<MotdResponse | null>(
      'POST',
      `/api/v1/fortnite-br/channel/${encodeURIComponent(channel)}/target`,
      {
        bearer: accessToken,
        idempotent: true,
        json: {
          parameters: { platform: 'Windows', language: 'en', serverRegion: 'NAE', country: 'US', ...options.parameters },
          tags: options.tags ?? MOTD_DEFAULT_TAGS,
        },
        ...(options.signal ? { signal: options.signal } : {}),
      },
    );
    return { tcId: response.data?.tcId ?? null, contentItems: response.data?.contentItems ?? [] };
  }
}
