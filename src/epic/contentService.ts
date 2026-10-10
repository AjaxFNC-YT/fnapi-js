import { ValidationError } from '../core/errors.js';
import type { EpicRestClient } from './rest.js';

export const CONTENT_SERVICE_BASE_URL = 'https://content-service.bfda.live.use1a.on.epicgames.com';

export interface FortniteBuild {
  buildVersion: string;
  version: string;
  major: number;
  minor: number;
  changelist: number;
  branch: string;
}

export interface CookedPackageOptions {
  platform?: string;
  role?: string;
  signal?: AbortSignal;
}

export interface ContentModuleRef {
  moduleId: string;
  version: number;
}

export interface ContentAccountRef {
  id: string;
  type: string;
}

export interface ContentLiveLink {
  linkCode: string;
  linkVersion: number;
  lastPublished: string;
  publishedBy: ContentAccountRef;
  base: string;
  commitMessage: string;
}

export interface ContentProjectFlags {
  projectId: string;
  created: string;
  owner: ContentAccountRef;
  author: ContentAccountRef;
  meta: { name: string; title: string; description: string };
  sysMeta: Record<string, unknown>;
  privateLinks: Record<string, unknown>;
  liveLink: ContentLiveLink;
}

export interface ContentModuleBinaries {
  baseUrl: string;
  files: unknown[];
  totalSizeKb: number;
  installMetadata: Array<{ gameFeaturePluginUri: string }>;
}

export interface ContentModule extends ContentModuleRef {
  binaryVersion: string;
  artifactId: string;
  cookJobId: string;
  binaries: ContentModuleBinaries;
  start: string;
  end: string;
}

export interface CookedContentPackage {
  status: string;
  projectId: string;
  projectFlags: ContentProjectFlags;
  content: ContentModule[];
  isEncrypted: boolean;
  resolved: {
    root: ContentModuleRef;
    resolutions: Record<string, number>;
  };
}

export interface ContentModuleKey extends ContentModuleRef {
  type: string;
  key: { Guid: string; Key: string };
}

export interface IslandKey extends ContentModuleRef {
  guid: string;
  keyBase64: string;
  key: string;
}

export interface IslandLaunchResult {
  status: 'queued' | 'notified' | (string & {});
  [field: string]: unknown;
}

const BUILD_PATTERN = /Release-(\d+)\.(\d+)-CL-(\d+)/;

export function parseFortniteBuild(buildVersion: string): FortniteBuild {
  const match = BUILD_PATTERN.exec(buildVersion);
  if (!match) {
    throw new ValidationError(`"${buildVersion}" is not a Fortnite build version`, 'buildVersion');
  }
  const [, major, minor, changelist] = match;
  return {
    buildVersion,
    version: `${major}.${minor}`,
    major: Number(major),
    minor: Number(minor),
    changelist: Number(changelist),
    branch: `Release-${major}.${minor}`,
  };
}

export function contentKeyToHex(base64: string): string {
  const bufferCtor = (globalThis as { Buffer?: { from(data: string, encoding: string): { toString(encoding: string): string } } }).Buffer;
  let hex = '';
  if (bufferCtor) {
    hex = bufferCtor.from(base64, 'base64').toString('hex');
  } else {
    const binary = atob(base64);
    for (let index = 0; index < binary.length; index += 1) {
      hex += binary.charCodeAt(index).toString(16).padStart(2, '0');
    }
  }
  return `0x${hex.toUpperCase()}`;
}

function requireString(value: unknown, parameter: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`"${parameter}" is required and must be a non-empty string`, parameter);
  }
  return value;
}

export class ContentServiceManager {
  constructor(private readonly rest: EpicRestClient) {}

  async cookedPackage(
    accessToken: string,
    linkCode: string,
    build: Pick<FortniteBuild, 'major' | 'minor' | 'changelist'>,
    options: CookedPackageOptions = {},
  ): Promise<CookedContentPackage> {
    requireString(accessToken, 'accessToken');
    requireString(linkCode, 'linkCode');
    const response = await this.rest.request<CookedContentPackage>(
      'GET',
      `/api/content/v4/cooked-content-package/link/${encodeURIComponent(linkCode)}`,
      {
        bearer: accessToken,
        query: {
          role: options.role ?? 'client',
          platform: options.platform ?? 'windows',
          major: build.major,
          minor: build.minor,
          patch: build.changelist,
        },
        ...(options.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data;
  }

  async moduleKeys(
    accessToken: string,
    modules: ContentModuleRef[],
    options: { signal?: AbortSignal } = {},
  ): Promise<ContentModuleKey[]> {
    requireString(accessToken, 'accessToken');
    if (!Array.isArray(modules) || modules.length === 0) {
      throw new ValidationError('"modules" must be a non-empty array', 'modules');
    }
    const response = await this.rest.request<ContentModuleKey[]>('POST', '/api/content/v4/module/key/batch', {
      bearer: accessToken,
      idempotent: true,
      json: modules.map((entry) => ({ moduleId: entry.moduleId, version: entry.version })),
      ...(options.signal ? { signal: options.signal } : {}),
    });
    return response.data;
  }

  async launch(accessToken: string, linkCode: string, options: { signal?: AbortSignal } = {}): Promise<IslandLaunchResult> {
    requireString(accessToken, 'accessToken');
    requireString(linkCode, 'linkCode');
    const response = await this.rest.request<IslandLaunchResult>(
      'POST',
      `/api/content/v2/launch/link/${encodeURIComponent(linkCode)}`,
      {
        bearer: accessToken,
        json: {},
        ...(options.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data;
  }
}

export function toIslandKey(entry: ContentModuleKey): IslandKey {
  return {
    moduleId: entry.moduleId,
    version: entry.version,
    guid: entry.key.Guid,
    keyBase64: entry.key.Key,
    key: contentKeyToHex(entry.key.Key),
  };
}
