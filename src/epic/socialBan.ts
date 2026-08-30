import { ValidationError } from '../core/errors.js';
import type { EpicRestClient } from './rest.js';

export const SOCIAL_BAN_BASE_URL = 'https://social-ban-public-service-prod.ol.epicgames.com';

export interface SocialBanOptions {
  signal?: AbortSignal;
}

export interface SocialBanEntry {
  [key: string]: unknown;
}

export interface SocialBanStatus {
  active: boolean;
  bans: SocialBanEntry[];
  warnings: SocialBanEntry[];
}

interface RawSocialBanResponse {
  bans?: unknown;
  warnings?: unknown;
}

function requireString(value: unknown, parameter: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`"${parameter}" is required and must be a non-empty string`, parameter);
  }
  return value;
}

function toEntries(value: unknown): SocialBanEntry[] {
  return Array.isArray(value) ? (value as SocialBanEntry[]) : [];
}

export class SocialBanManager {
  constructor(private readonly rest: EpicRestClient) {}

  async status(
    accessToken: string,
    accountId: string,
    options?: SocialBanOptions,
  ): Promise<SocialBanStatus> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    const response = await this.rest.request<RawSocialBanResponse>(
      'GET',
      `/socialban/api/public/v1/${encodeURIComponent(accountId)}`,
      {
        bearer: accessToken,
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
    const bans = toEntries(response.data?.bans);
    const warnings = toEntries(response.data?.warnings);
    return { active: bans.length > 0, bans, warnings };
  }
}
