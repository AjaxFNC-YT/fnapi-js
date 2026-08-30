import { ValidationError } from '../core/errors.js';
import type { QueryParams } from '../core/types.js';
import type { EpicRestClient } from './rest.js';

export const LIGHTSWITCH_BASE_URL = 'https://lightswitch-public-service-prod.ol.epicgames.com';

export const LIGHTSWITCH_BULK_BASE_URL = 'https://lightswitch-public-service-prod06.ol.epicgames.com';

export const LIGHTSWITCH_SERVICE_ID = 'Fortnite';

export interface LightswitchLauncherInfo {
  appName?: string;
  catalogItemId?: string;
  namespace?: string;
}

export interface LightswitchStatus {
  serviceInstanceId: string;
  status: string;
  message?: string;
  maintenanceUri?: string | null;
  overrideCatalogIds?: string[];
  allowedActions?: string[];
  banned?: boolean;
  launcherInfoDTO?: LightswitchLauncherInfo;
}

export interface LightswitchOptions {
  signal?: AbortSignal;
}

function requireString(value: unknown, parameter: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`"${parameter}" is required and must be a non-empty string`, parameter);
  }
  return value;
}

function requireStringList(value: unknown, parameter: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ValidationError(`"${parameter}" must be a non-empty array`, parameter);
  }
  return value as string[];
}

export class LightswitchManager {
  private readonly serviceId: string;

  constructor(
    private readonly rest: EpicRestClient,
    private readonly bulkRest: EpicRestClient,
    options?: { serviceId?: string },
  ) {
    this.serviceId = options?.serviceId ?? LIGHTSWITCH_SERVICE_ID;
  }

  async status(
    accessToken: string,
    serviceId?: string,
    options?: LightswitchOptions,
  ): Promise<LightswitchStatus> {
    requireString(accessToken, 'accessToken');
    const service = serviceId ?? this.serviceId;
    const response = await this.rest.request<LightswitchStatus>(
      'GET',
      `/lightswitch/api/service/${encodeURIComponent(service)}/status`,
      {
        bearer: accessToken,
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data;
  }

  async statusBulk(
    accessToken: string,
    serviceIds: string[],
    options?: LightswitchOptions,
  ): Promise<LightswitchStatus[]> {
    requireString(accessToken, 'accessToken');
    const ids = requireStringList(serviceIds, 'serviceIds');
    const query: QueryParams = { serviceId: ids };
    const response = await this.bulkRest.request<LightswitchStatus[]>(
      'GET',
      '/lightswitch/api/service/bulk/status',
      {
        bearer: accessToken,
        query,
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data;
  }
}
