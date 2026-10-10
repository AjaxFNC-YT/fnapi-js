import { ParseError, ValidationError } from '../core/errors.js';
import type { RequestCacheOptions } from '../core/types.js';
import { parseFortniteBuild, type FortniteBuild } from './contentService.js';
import type { EpicRestClient } from './rest.js';

export const LAUNCHER_BASE_URL = 'https://launcher-public-service-prod06.ol.epicgames.com';

export const FORTNITE_CATALOG_ITEM_ID = '4fe75bbc5a674f4f9b356b5c90567da5';

export const FORTNITE_NAMESPACE = 'fn';

export const FORTNITE_APP_NAME = 'Fortnite';

export const FORTNITE_APK_BASE_URL = 'https://epicgames-download1.akamaized.net/Builds/Fortnite/Apk';

export const LauncherInstaller = {
  LauncherWindows: 'EpicGamesLauncherInstaller.msi',
  LauncherMac: 'EpicGamesLauncherInstaller.dmg',
  UnrealEngineWindows: 'UnrealEngineInstaller.msi',
  UnrealEngineMac: 'UnrealEngineInstaller.dmg',
  EpicGamesStoreAndroid: 'F924A9B4AE2D430992775190A895B65A.apk',
  BuildPatchTool: 'BuildPatchTool.zip',
} as const;

export type LauncherInstaller = (typeof LauncherInstaller)[keyof typeof LauncherInstaller];

export interface LauncherDeviceProfile {
  platform: string;
  abis?: string[];
  apiLevel?: number;
  coreCount?: number;
  hardwareName?: string;
  hasLibHoudini?: boolean;
  machineId?: string;
  manufacturer?: string;
  memoryMiB?: number;
  model?: string;
  preInstallInfo?: string;
  renderingDevice?: string;
  renderingDriver?: string;
  sha1Fingerprint?: string;
  supportsArmNEON?: boolean;
  supportsFpRenderTargets?: boolean;
  textureCompressionFormats?: string[];
  version?: string;
  [field: string]: unknown;
}

export const ANDROID_DEVICE_PROFILE: LauncherDeviceProfile = {
  platform: 'Android',
  abis: ['arm64-v8a', 'armeabi-v7a', 'armeabi'],
  apiLevel: 30,
  coreCount: 8,
  hardwareName: 'Qualcomm Technologies, Inc SDMMAGPIE',
  hasLibHoudini: false,
  machineId: '',
  manufacturer: 'samsung',
  memoryMiB: 5524,
  model: 'SM-A715F',
  preInstallInfo: 'ThirdPartyInstall',
  renderingDevice: 'Adreno (TM) 618',
  renderingDriver: 'OpenGL ES 3.2',
  sha1Fingerprint: '',
  supportsArmNEON: true,
  supportsFpRenderTargets: true,
  textureCompressionFormats: ['ASTC', 'ATC', 'ETC2', 'ETC1'],
  version: '5.2.0',
};

export interface LauncherBuildOptions {
  platform?: string;
  device?: LauncherDeviceProfile;
  namespace?: string;
  catalogItemId?: string;
  appName?: string;
  label?: string;
  signal?: AbortSignal;
  cache?: boolean | RequestCacheOptions;
}

export interface LauncherManifest {
  uri: string;
  queryParams: Array<{ name: string; value: string }>;
}

export interface LauncherBuildElement {
  appName: string;
  labelName: string;
  buildVersion: string;
  hash: string;
  useSignedUrl: boolean;
  metadata: Record<string, unknown>;
  manifests: LauncherManifest[];
  selectiveDownload?: unknown[];
  isPreloaded?: boolean;
}

export interface LauncherBuild {
  elements: LauncherBuildElement[];
}

export interface LauncherAsset {
  appName: string;
  labelName: string;
  buildVersion: string;
  catalogItemId: string;
  namespace: string;
  assetId: string;
  sdMetaHash?: string;
  metadata?: Record<string, unknown>;
}

export interface LauncherAssetItem {
  signature: string;
  distribution: string;
  path: string;
  hash?: string;
  additionalDistributions: string[];
}

export interface LauncherAppAsset {
  appName: string;
  labelName: string;
  buildVersion: string;
  catalogItemId: string;
  assetId: string;
  expires: string;
  metadata: Record<string, unknown>;
  items: Record<string, LauncherAssetItem>;
}

export interface LauncherApk {
  buildVersion: string;
  manifestId: string;
  url: string;
  sizeBytes: number | null;
}

export interface LauncherInstallerDownload {
  app: string;
  url: string;
  fileName: string | null;
}

function requireString(value: unknown, parameter: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`"${parameter}" is required and must be a non-empty string`, parameter);
  }
  return value;
}

export function apkFromBuild(element: LauncherBuildElement): LauncherApk {
  const manifest = element.manifests[0]?.uri;
  const manifestId = manifest?.split('?')[0]?.split('/').pop()?.replace(/\.manifest$/, '');
  if (!manifestId) {
    throw new ValidationError('The build has no manifest to derive an APK from', 'manifests');
  }
  const size = element.metadata['downloadSizeBytes'];
  return {
    buildVersion: element.buildVersion,
    manifestId,
    url: `${FORTNITE_APK_BASE_URL}/${manifestId}.apk`,
    sizeBytes: typeof size === 'number' ? size : null,
  };
}

export class LauncherManager {
  constructor(private readonly rest: EpicRestClient) {}

  async build(accessToken: string, options: LauncherBuildOptions = {}): Promise<LauncherBuild> {
    requireString(accessToken, 'accessToken');
    const platform = encodeURIComponent(options.platform ?? 'Windows');
    const catalogItemId = encodeURIComponent(options.catalogItemId ?? FORTNITE_CATALOG_ITEM_ID);
    const appName = encodeURIComponent(options.appName ?? FORTNITE_APP_NAME);
    const namespace = encodeURIComponent(options.namespace ?? FORTNITE_NAMESPACE);
    const label = encodeURIComponent(options.label ?? 'Live');
    const path =
      `/launcher/api/public/assets/v2/platform/${platform}/namespace/${namespace}` +
      `/catalogItem/${catalogItemId}/app/${appName}/label/${label}`;
    const device = options.device ?? (options.platform === 'Android' ? ANDROID_DEVICE_PROFILE : undefined);
    const response = await this.rest.request<LauncherBuild>(device ? 'POST' : 'GET', path, {
      bearer: accessToken,
      ...(device ? { json: device, idempotent: true } : {}),
      ...(options.cache !== undefined ? { cache: options.cache } : {}),
      ...(options.signal ? { signal: options.signal } : {}),
    });
    return response.data;
  }

  async asset(
    accessToken: string,
    options: Pick<LauncherBuildOptions, 'platform' | 'catalogItemId' | 'appName' | 'label' | 'signal' | 'cache'> = {},
  ): Promise<LauncherAppAsset> {
    requireString(accessToken, 'accessToken');
    const platform = encodeURIComponent(options.platform ?? 'Windows');
    const catalogItemId = encodeURIComponent(options.catalogItemId ?? FORTNITE_CATALOG_ITEM_ID);
    const appName = encodeURIComponent(options.appName ?? FORTNITE_APP_NAME);
    const response = await this.rest.request<LauncherAppAsset>(
      'GET',
      `/launcher/api/public/assets/${platform}/${catalogItemId}/${appName}`,
      {
        bearer: accessToken,
        query: { label: options.label ?? 'Live' },
        ...(options.cache !== undefined ? { cache: options.cache } : {}),
        ...(options.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data;
  }

  async fortniteApk(accessToken: string, options: Omit<LauncherBuildOptions, 'platform'> = {}): Promise<LauncherApk> {
    const build = await this.build(accessToken, { ...options, platform: 'Android' });
    const element = build.elements[0];
    if (!element) {
      throw new ParseError('The launcher returned no Android build', {
        url: this.rest.buildUrl('/launcher/api/public/assets/v2/platform/Android'),
        raw: JSON.stringify(build),
      });
    }
    return apkFromBuild(element);
  }

  async assets(
    accessToken: string,
    options: Pick<LauncherBuildOptions, 'platform' | 'namespace' | 'label' | 'signal' | 'cache'> = {},
  ): Promise<LauncherAsset[]> {
    requireString(accessToken, 'accessToken');
    const platform = encodeURIComponent(options.platform ?? 'Windows');
    const response = await this.rest.request<LauncherAsset[]>('GET', `/launcher/api/public/assets/${platform}`, {
      bearer: accessToken,
      query: { label: options.label ?? 'Live', namespace: options.namespace },
      ...(options.cache !== undefined ? { cache: options.cache } : {}),
      ...(options.signal ? { signal: options.signal } : {}),
    });
    return response.data;
  }

  async fortniteBuild(accessToken: string, options: LauncherBuildOptions = {}): Promise<FortniteBuild> {
    const build = await this.build(accessToken, { cache: { ttl: 300_000 }, ...options });
    const buildVersion = build.elements[0]?.buildVersion;
    if (!buildVersion) {
      throw new ParseError('The launcher returned no Fortnite build', {
        url: this.rest.buildUrl('/launcher/api/public/assets/v2'),
        raw: JSON.stringify(build),
      });
    }
    return parseFortniteBuild(buildVersion);
  }

  installerUrl(app: LauncherInstaller | (string & {})): string {
    requireString(app, 'app');
    return this.rest.buildUrl(`/launcher/api/installer/download/${encodeURIComponent(app)}`);
  }

  async installer(
    app: LauncherInstaller | (string & {}),
    options: { signal?: AbortSignal } = {},
  ): Promise<LauncherInstallerDownload> {
    requireString(app, 'app');
    const response = await this.rest.request<unknown>('GET', `/launcher/api/installer/download/${encodeURIComponent(app)}`, {
      redirect: 'manual',
      ...(options.signal ? { signal: options.signal } : {}),
    });
    const location = response.headers['location'];
    if (!location) {
      throw new ParseError(`The launcher did not redirect to an installer for ${app}`, {
        url: this.installerUrl(app),
        raw: `status ${response.status}`,
      });
    }
    const fileName = new URL(location).searchParams.get('launcherfilename') ?? location.split('?')[0]?.split('/').pop() ?? null;
    return { app, url: location, fileName };
  }
}
