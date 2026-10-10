import { ValidationError } from '../core/errors.js';
import type { RequestCacheOptions } from '../core/types.js';
import { FN_LIVE_DEPLOYMENT_ID } from './eos.js';
import type { EpicRestClient } from './rest.js';

export const QUEST_SERVICE_BASE_URL = 'https://fngw-svc-ds-livefn.ol.epicgames.com';

export interface QuestObjectiveProgress {
  statName: string;
  quantity: number;
  stage: number;
}

export interface QuestProgressEntry {
  templateId: string;
  itemId: string;
  state: string;
  objectives: QuestObjectiveProgress[];
  challengeBundleId: string | null;
  expiryTime: string | null;
  productTags: string[];
}

export interface ChallengeBundleEntry {
  itemId: string;
  templateId: string;
  challengeScheduleId: string;
  attributes: {
    num_granted_bundle_quests?: number;
    num_quests_completed?: number;
    num_progress_quests_completed?: number;
    grantedquestinstanceids?: string[];
    [key: string]: unknown;
  };
}

export interface ChallengeScheduleEntry {
  itemId: string;
  templateId: string;
  attributes: {
    unlock_epoch?: string;
    granted_bundles?: string[];
    [key: string]: unknown;
  };
}

export interface QuestAccountXp {
  seasonNumber: number;
  seasonLevel: number;
  seasonXp: number;
  seasonBegin: string;
  restedXp: number;
  timeDilation?: number;
  boosters?: unknown[];
  dynamicXp?: Record<string, number>;
  playtimeXp?: { currentWeek: number; currentWeekXp: number };
}

export interface QuestProgressResponse {
  questProgress: {
    quests: QuestProgressEntry[];
    challengeBundles: ChallengeBundleEntry[];
    challengeBundleSchedules: ChallengeScheduleEntry[];
    trackedQuests: string[];
    trackedQuestIds?: string[];
  };
  tokens: unknown[];
  accountXp?: QuestAccountXp;
}

export interface QuestProgressOptions {
  deploymentId?: string;
  cache?: boolean | RequestCacheOptions;
  signal?: AbortSignal;
}

export class QuestService {
  constructor(private readonly rest: EpicRestClient) {}

  async progress(eosAccessToken: string, accountId: string, options: QuestProgressOptions = {}): Promise<QuestProgressResponse> {
    requireString(eosAccessToken, 'eosAccessToken');
    requireString(accountId, 'accountId');
    const deploymentId = encodeURIComponent(options.deploymentId ?? FN_LIVE_DEPLOYMENT_ID);
    const response = await this.rest.request<QuestProgressResponse>(
      'GET',
      `/api/quest/v3/${deploymentId}/progress/account/${encodeURIComponent(accountId)}`,
      {
        bearer: eosAccessToken,
        ...(options.cache !== undefined ? { cache: options.cache } : {}),
        ...(options.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data;
  }
}

function requireString(value: unknown, parameter: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new ValidationError(`"${parameter}" is required`, parameter);
  }
  return value;
}
