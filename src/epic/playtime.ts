import { ValidationError } from '../core/errors.js';
import type { EpicRestClient } from './rest.js';

export const PLAYTIME_BASE_URL = 'https://library-service.live.use1a.on.epicgames.com';

export const PLAYTIME_ARTIFACT_ID = 'Fortnite';

export const PLAYTIME_MACHINE_ID = '5058da6a-4ee8-4370-967f-4bff47a77114';

export interface PlaytimeInfo {
  accountId: string;
  artifactId: string;
  totalTime: number;
}

export interface PlaytimeOptions {
  signal?: AbortSignal;
}

export interface PlaytimeSegment {
  artifactId?: string;
  machineId?: string;
  startTime: Date | string;
  endTime: Date | string;
  startSegment?: boolean;
  endSegment?: boolean;
}

export interface PlaytimeAddSecondsOptions extends PlaytimeOptions {
  artifactId?: string;
  machineId?: string;
  endTime?: Date | string;
}

interface PlaytimeSegmentPayload {
  machineId: string;
  artifactId: string;
  startTime: string;
  endTime: string;
  startSegment: boolean;
  endSegment: boolean;
}

function requireString(value: unknown, parameter: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`"${parameter}" is required and must be a non-empty string`, parameter);
  }
  return value;
}

function toIso(value: Date | string, parameter: string): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new ValidationError(`"${parameter}" is an invalid Date`, parameter);
    }
    return value.toISOString();
  }
  return requireString(value, parameter);
}

function buildSegment(segment: PlaytimeSegment, artifactFallback: string): PlaytimeSegmentPayload {
  return {
    machineId: segment.machineId ?? PLAYTIME_MACHINE_ID,
    artifactId: segment.artifactId ?? artifactFallback,
    startTime: toIso(segment.startTime, 'startTime'),
    endTime: toIso(segment.endTime, 'endTime'),
    startSegment: segment.startSegment ?? true,
    endSegment: segment.endSegment ?? true,
  };
}

export class PlaytimeManager {
  private readonly artifactId: string;

  constructor(
    private readonly rest: EpicRestClient,
    options?: { artifactId?: string },
  ) {
    this.artifactId = options?.artifactId ?? PLAYTIME_ARTIFACT_ID;
  }

  async get(
    accessToken: string,
    accountId: string,
    artifactId?: string,
    options?: PlaytimeOptions,
  ): Promise<PlaytimeInfo> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    const artifact = artifactId ?? this.artifactId;
    const response = await this.rest.request<PlaytimeInfo>(
      'GET',
      `/library/api/public/playtime/account/${encodeURIComponent(accountId)}/artifact/${encodeURIComponent(artifact)}`,
      {
        bearer: accessToken,
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data;
  }

  async getAll(
    accessToken: string,
    accountId: string,
    options?: PlaytimeOptions,
  ): Promise<PlaytimeInfo[]> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    const response = await this.rest.request<PlaytimeInfo[]>(
      'GET',
      `/library/api/public/playtime/account/${encodeURIComponent(accountId)}/all`,
      {
        bearer: accessToken,
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data;
  }

  async add(
    accessToken: string,
    accountId: string,
    segment: PlaytimeSegment,
    options?: PlaytimeOptions,
  ): Promise<void> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    await this.rest.request<null>(
      'PUT',
      `/library/api/public/playtime/account/${encodeURIComponent(accountId)}`,
      {
        bearer: accessToken,
        json: buildSegment(segment, this.artifactId),
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
  }

  async addBulk(
    accessToken: string,
    accountId: string,
    segments: PlaytimeSegment[],
    options?: PlaytimeOptions,
  ): Promise<void> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    if (!Array.isArray(segments) || segments.length === 0) {
      throw new ValidationError('"segments" must be a non-empty array', 'segments');
    }
    await this.rest.request<null>(
      'PUT',
      `/library/api/public/playtime/account/${encodeURIComponent(accountId)}/bulk`,
      {
        bearer: accessToken,
        json: { playtimeAddList: segments.map((segment) => buildSegment(segment, this.artifactId)) },
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
  }

  async addSeconds(
    accessToken: string,
    accountId: string,
    seconds: number,
    options?: PlaytimeAddSecondsOptions,
  ): Promise<void> {
    if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) {
      throw new ValidationError('"seconds" must be a positive, finite number', 'seconds');
    }
    const end = options?.endTime instanceof Date ? options.endTime : options?.endTime ? new Date(options.endTime) : new Date();
    const start = new Date(end.getTime() - Math.round(seconds) * 1000);
    await this.add(
      accessToken,
      accountId,
      {
        startTime: start,
        endTime: end,
        ...(options?.artifactId ? { artifactId: options.artifactId } : {}),
        ...(options?.machineId ? { machineId: options.machineId } : {}),
      },
      options?.signal ? { signal: options.signal } : undefined,
    );
  }
}
