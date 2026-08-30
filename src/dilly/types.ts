export interface DillyExport<T = unknown> {
  hash: string;
  entries: number;
  bytes: number;
  jsonOutput: T[];
}

export interface DillyDataEnvelope<T = unknown> {
  hash: string;
  entries: number;
  bytes: number;
  data: T[];
}

export interface DillyErrorBody {
  error?: string;
  message?: string;
  statusCode?: number;
  [key: string]: unknown;
}

export interface DillySize {
  raw: number;
  formatted: string;
}

export interface DillyVersionInfo {
  id: string;
  build: string;
  platform: string;
}

export interface DillyVersionArchives {
  files: number;
  pakchunks: number;
  unloaded: number;
}

export interface DillyVersionMeta {
  state: string;
  tag: string;
}

export interface DillyVersion {
  version: DillyVersionInfo;
  archives: DillyVersionArchives;
  meta: DillyVersionMeta;
}

export interface DillyDynamicKey {
  name: string;
  key: string;
  guid: string;
  keychain: string;
  fileCount: number;
  size: DillySize;
}

export interface DillyUnloadedPak {
  name: string;
  guid: string;
  size: DillySize;
}

export interface DillyAesResponse {
  version: string;
  mainKey: string;
  dynamicKeys: DillyDynamicKey[];
  unloaded: DillyUnloadedPak[];
}

export interface DillyBackupMeta {
  version: string;
  compressionMethod: string;
  platform: string;
  entries: number;
}

export interface DillyBackup {
  hash: string;
  fileName: string;
  size: number;
  url: string;
  uploadedAt: string;
  meta: DillyBackupMeta;
}

export interface DillyHotfixEntry {
  nativeString: string;
  localizedStrings: Record<string, string>;
}

export type DillyHotfixSection = Record<string, DillyHotfixEntry>;

export type DillyHotfixes = Record<string, DillyHotfixSection>;

export interface DillyManifest {
  id: string;
  manifestId: string;
  appName: string;
  labelName: string;
  buildVersion: string;
  versionName: string;
  hash: string;
  size: number;
  totalBuildSize: number;
  totalDownloadSize: number;
  totalFiles: number;
  discoveredAt: string;
  completedAt: string;
}

export interface DillyMappingMeta {
  version: string;
  compressionMethod: string;
  platform: string;
  source: string | null;
  enumCount: number;
  structCount: number;
}

export interface DillyMapping {
  hash: string;
  fileName: string;
  size: number;
  url: string;
  jsonUrl: string | null;
  uploadedAt: string;
  meta: DillyMappingMeta;
}

export interface DillyCosmeticType {
  id: string;
  name: string;
}

export interface DillyCosmeticRarity {
  id: string;
  name: string;
}

export interface DillyCosmeticIntroduction {
  id: number;
  name: string;
  chapter: string;
  season: string;
}

export interface DillyCosmeticImages {
  smallIcon: string | null;
  icon: string | null;
  [key: string]: string | null | undefined;
}

export interface DillyCosmetic {
  id: string;
  name: string;
  description: string;
  type: DillyCosmeticType;
  rarity: DillyCosmeticRarity;
  series: unknown | null;
  set: unknown | null;
  introduction: DillyCosmeticIntroduction | null;
  images: DillyCosmeticImages;
  displayAsset: string | null;
  lego: unknown | null;
  gameplayTags: string[];
  pakId: string | null;
  releaseVersion: string | null;
  isTraversal: boolean;
  isShuffle: boolean;
  path: string;
}

export interface DillyBundle {
  id: string;
  name: string;
  image: string | null;
  grantedCosmeticIds: string[];
  path: string;
}

export interface DillyExportName {
  namespace: string;
  key: string;
  value: string;
}

export interface DillyExportPathEntry {
  id: string;
  path: string;
}

export interface DillyExportBundleEntry {
  id: string;
  name: DillyExportName;
  path: string;
}

export interface DillyExportSetEntry {
  namespace: string;
  key: string;
  displayValue: string;
  backendValue: string;
}

export interface DillyExportOfferPopupEntry {
  id: string;
  value: string;
}

export interface DillyExportSeasonChapter {
  key?: string;
  text?: string;
  [key: string]: unknown;
}

export interface DillyExportSeasonEntry {
  key: string;
  text: string;
  displayType?: string;
  chapter?: DillyExportSeasonChapter;
  season?: DillyExportSeasonChapter;
  [key: string]: unknown;
}

export type DillyAesCosmeticsResponse = DillyDataEnvelope<DillyCosmetic>;
export type DillyCosmeticsResponse = DillyDataEnvelope<DillyCosmetic>;
export type DillyBundlesResponse = DillyDataEnvelope<DillyBundle>;
export type DillyExportCosmeticsResponse = DillyExport<DillyExportPathEntry>;
export type DillyExportSeriesResponse = DillyExport<DillyExportPathEntry>;
export type DillyExportSetsResponse = DillyExport<DillyExportSetEntry>;
export type DillyExportOfferPopupsResponse = DillyExport<DillyExportOfferPopupEntry>;
export type DillyExportDisplayAssetsResponse = DillyExport<string>;
export type DillyExportBundlesResponse = DillyExport<DillyExportBundleEntry>;
export type DillyExportSeasonsResponse = DillyExport<DillyExportSeasonEntry>;
export type DillyExportSearchResponse = DillyExport<string>;
