export interface FnccEnvelope<T> {
  status: number;
  data: T;
}

export interface FnccColor {
  r: number;
  g: number;
  b: number;
  a: number;
  hex: string;
}

export interface FnccRarity {
  value: string;
  displayValue: string;
  backendValue: string;
}

export interface FnccTypeInfo {
  value: string;
  displayValue: string;
  backendValue: string;
}

export interface FnccSet {
  value: string;
  text: string;
  backendValue: string;
}

export interface FnccSeries {
  value: string;
  image: string | null;
  colors: string[];
  backendValue: string;
}

export interface FnccIntroduction {
  chapter: string;
  season: string;
  text: string;
  backendValue: number;
}

export interface FnccImages {
  smallIcon?: string;
  icon?: string;
  wide?: string;
  largeIcon?: string;
}

export interface FnccVariantOption {
  tag: string;
  name: string;
  image: string;
}

export interface FnccVariant {
  channel: string;
  type: string;
  options: FnccVariantOption[];
}

export interface FnccVersion {
  gameVersion: string;
  datasetBuild: string;
  publishedAt: string;
  complete: boolean;
  categories: Record<string, number>;
}

export interface FnccDynamicKey {
  name: string;
  guid: string;
  key: string;
}

export interface FnccAes {
  version: string;
  mainKey: string;
  dynamicKeys: FnccDynamicKey[];
  source: string;
  fetchedAt: string;
}

export interface FnccMappings {
  version: string;
  fileName: string;
  localPath: string;
  fetchedAt: string;
}

export interface FnccDatasetCategory {
  category: string;
  count: number;
  sourceCount: number;
}

export interface FnccStatusDataset {
  version: string;
  buildId: string;
  publishedAt: string;
  complete: boolean;
  categories: FnccDatasetCategory[];
}

export interface FnccStatusGame {
  status: string;
  installedVersion: string;
  availableVersion: string;
  upToDate: boolean;
  progress: number;
  lastCheckAt: string | null;
  lastError: string | null;
  checkIntervalMs: number;
}

export interface FnccStatusParser {
  state: string;
  mappingsVersion: string;
  aesVersion: string;
  fileCount: number;
  mountedArchives: number;
  unloadedArchives: number;
  missingKeyGuids: string[];
  loadedAt: string | null;
  lastError: string | null;
}

export interface FnccMaintenanceComponent {
  knownGood: string | null;
  current: string | null;
  candidate: string | null;
  failed: string | null;
  lastCheckAt: string | null;
  lastAttemptAt: string | null;
  lastPromotedAt: string | null;
  lastRolledBackAt: string | null;
  lastResult: string | null;
  lastError: string | null;
  attempts: number;
  promotions: number;
  rollbacks: number;
}

export interface FnccMaintenance {
  status: string;
  startedAt: string | null;
  cue4parse: FnccMaintenanceComponent;
  legendary: FnccMaintenanceComponent;
  updatedAt: string;
}

export interface FnccStatus {
  ready: boolean;
  dataset: FnccStatusDataset;
  game: FnccStatusGame;
  parser: FnccStatusParser;
  maintenance: FnccMaintenance;
}

export interface FnccDownloadRemote {
  buildVersion: string;
  downloadSize: number;
  diskSize: number;
  fileCount: number;
}

export interface FnccDownload {
  status: string;
  installedVersion: string;
  availableVersion: string;
  lastCheckAt: string | null;
  lastUpdateStartedAt: string | null;
  lastUpdateFinishedAt: string | null;
  lastError: string | null;
  consecutiveFailures: number;
  totalUpdates: number;
  remote: FnccDownloadRemote | null;
  updatedAt: string;
  progress: number;
}

export interface FnccParser {
  state: string;
  gameVersion: string;
  mappingsVersion: string;
  mountedArchives: number;
  unloadedArchives: number;
  fileCount: number;
  virtualPaths: number;
  localizedEntries: number;
  culture: string;
  availableCultures: string[];
  missingKeyGuids: string[];
  loadedAt: string | null;
  lastError: string | null;
}

export interface FnccBannerColor {
  id: string;
  color: string;
  category: string;
  categoryName: string;
  subCategoryGroup: string;
  primaryColor: FnccColor;
  secondaryColor: FnccColor;
}

export interface FnccBanner {
  id: string;
  devName: string;
  name: string;
  description: string;
  category: string;
  categoryName: string;
  fullUsageRights: boolean;
  rarity: FnccRarity | null;
  series: FnccSeries | null;
  set: FnccSet | null;
  introduction: FnccIntroduction | null;
  gameplayTags: string[];
  images: FnccImages;
  path: string;
}

export interface FnccCosmetic {
  id: string;
  category: string;
  name: string;
  description: string;
  type: FnccTypeInfo | null;
  rarity: FnccRarity | null;
  series: FnccSeries | null;
  set: FnccSet | null;
  introduction: FnccIntroduction | null;
  images: FnccImages;
  variants: FnccVariant[];
  gameplayTags: string[];
  searchTags: string[];
  metaTags: string[];
  builtInEmoteIds: string[];
  gender: string;
  cosmeticId: string;
  vehicleId: string | null;
  dynamicPakId: string | null;
  showcaseVideo: string | null;
  itemPreviewHeroPath: string | null;
  path: string;
}

export type FnccCosmeticsByCategory = Record<string, FnccCosmetic[]>;

export type FnccCosmeticCategories = Record<string, number>;

export interface FnccCosmeticSearchResponse {
  status: number;
  total: number;
  data: FnccCosmetic[];
}

export interface FnccSpritePerkLevel {
  level: number;
  value: number;
}

export interface FnccSpritePerkScaling {
  stat: string;
  levels: FnccSpritePerkLevel[];
}

export interface FnccSpritePerk {
  id: string;
  name: string;
  description: string;
  scaling: FnccSpritePerkScaling[];
}

export interface FnccSpriteVariant {
  id: string;
  mappingId: string;
  name: string;
  description: string;
  variant: string;
  rarity: FnccRarity | null;
  summonCost: number;
  isStarter: boolean;
  released: boolean;
  images: FnccImages;
}

export interface FnccSprite {
  id: string;
  mappingId: string;
  library: string;
  season: number;
  name: string;
  description: string;
  rarity: FnccRarity | null;
  summonCost: number;
  isStarter: boolean;
  released: boolean;
  currentSeason: boolean;
  dexNumber: number;
  species: string;
  acquisitionHint: string;
  images: FnccImages;
  gameplayTags: string[];
  contextTags: string[];
  perks: FnccSpritePerk[];
  variants: FnccSpriteVariant[];
  enabled?: boolean;
  path: string;
}

export interface FnccSpritesResponse {
  status: number;
  hotfixAppliedAt: string | null;
  hotfixRules: unknown[];
  count: number;
  data: FnccSprite[];
}

export interface FnccPage<T> {
  total: number;
  offset: number;
  limit: number;
  items: T[];
}

export interface FnccAssetEntry {
  path: string;
  size?: number;
  extension?: string;
}

export interface FnccAssetExport {
  name: string;
  type?: string;
}

export type FnccAssetPackage = Record<string, string | null>;

export interface FnccArchive {
  name: string;
  mounted?: boolean;
}

export interface FnccSearchHit {
  path: string;
  size?: number;
  extension?: string;
}

export interface FnccContentMatch {
  path: string;
  matches: unknown[];
}

export interface FnccContentSearchResult {
  total: number;
  files: number;
  items: FnccContentMatch[];
}

export interface FnccAntiCheatFileRef {
  name: string;
  size?: number;
  hash?: string;
  [key: string]: unknown;
}

export interface FnccAntiCheat {
  installed: boolean;
  splash: Record<string, unknown> | null;
  version: string;
  productVersion: string;
  runtimeVersion: string;
  gameVersion: string;
  product: Record<string, unknown> | null;
  locales: string[];
  licenses: unknown[];
  certificates: unknown[];
  licenseFiles: unknown[];
  files: FnccAntiCheatFileRef[];
  checkedAt: string;
}

export type FnccAntiCheatFileContent = Record<string, unknown>;

export interface FnccCloudStorageFile {
  filename: string;
  uniqueFilename: string;
  hash: string;
  hash256: string;
  sourceHash256: string;
  size: number;
  contentType: string;
  storageType: string;
  uploaded: string;
  doNotCache: boolean;
  cachedAt: string;
}

export interface FnccDiscoveryPanel {
  panelName?: string;
  results?: unknown[];
  [key: string]: unknown;
}

export interface FnccDiscoverySurface {
  name: string;
  testName: string;
  testVariant: string;
  panelCount: number;
  resultCount: number;
  panels: FnccDiscoveryPanel[];
}

export interface FnccDiscoveryResponse {
  status: number;
  fetchedAt: string;
  stream: string;
  surfaceCount: number;
  panelCount: number;
  resultCount: number;
  data: FnccDiscoverySurface[];
}

export interface FnccFish {
  id: string;
  itemId: string;
  name: string;
  description: string;
  details: string | null;
  enabled: boolean;
  needsProFishingRod: boolean;
  sizeMin: number | null;
  sizeMax: number | null;
  heal: number | null;
  rarity: FnccRarity | null;
  maxStackSize: number | null;
  tags: string[];
  image: string;
  smallImage: string;
  timeOfDay: string[];
  location: string[];
  path: string;
}

export interface FnccShopOffer {
  offerId: string;
  devName: string;
  offerType: string;
  sortPriority: number;
  layoutId: string;
  layoutRank: number;
  sectionId: string;
  offerGroupId: string | null;
  tileSize: string;
  offerTag: string | null;
  violatorTag: string | null;
  violatorIntensity: string | null;
  bundleId: string | null;
  bundleItems: unknown[];
  relatedOffers: Record<string, unknown> | null;
  mainType: string | null;
  inDate: string;
  outDate: string;
  giftable: boolean;
  refundable: boolean;
  dailyLimit: number;
  weeklyLimit: number;
  monthlyLimit: number;
  price: Record<string, unknown>;
  colors: Record<string, unknown> | null;
  displayAsset: string;
  tileBackgroundMaterial: string;
  primaryTemplateId: string | null;
  items: unknown[];
  storefront: string;
  section: Record<string, unknown> | null;
}

export interface FnccItemShop {
  status: number;
  fetchedAt: string;
  resetsAt: string;
  refreshIntervalHrs: number;
  hash: string;
  offerCount: number;
  itemsResolved: number;
  itemsUnresolved: number;
  data: FnccShopOffer[];
}

export interface FnccItemShopSection {
  id: string;
  name: string;
  offerGroups: unknown[];
  offerCount: number;
}

export interface FnccItemShopSections {
  status: number;
  fetchedAt: string;
  resetsAt: string;
  layoutLastModified: string;
  sectionCount: number;
  data: FnccItemShopSection[];
}

export interface FnccLightswitchService {
  serviceId: string;
  status: string;
  up: boolean;
  message: string;
  maintenanceUri: string | null;
  allowedActions: string[];
  banned: boolean;
  overrideCatalogIds: string[];
  launcher: Record<string, unknown> | null;
}

export interface FnccLightswitchResponse {
  status: number;
  checkedAt: string;
  changedAt: string;
  stale: boolean;
  ageMs: number;
  allUp: boolean;
  serviceCount: number;
  data: FnccLightswitchService[];
}

export interface FnccLookupMatch {
  accountId?: string;
  displayName?: string;
  externalAuths?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface FnccLookupResponse {
  status: number;
  query: Record<string, unknown>;
  exactCount: number;
  moreCount: number;
  count: number;
  exact: FnccLookupMatch[];
  more: FnccLookupMatch[];
}

export interface FnccMnemonic {
  mnemonic: string;
  linkType: string;
  creator: string;
  title: string;
  description: string;
  image: string;
  images: FnccImages;
  parentExperience: Record<string, unknown> | null;
  matchmakingId: string | null;
  matchmaking: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
}

export interface FnccNewsMessage {
  title?: string;
  body?: string;
  image?: string;
  [key: string]: unknown;
}

export interface FnccNewsFeed {
  id: string;
  contentKey: string;
  title: string | null;
  style: string;
  alwaysShow: boolean;
  lastModified: string;
  messageCount: number;
  messages: FnccNewsMessage[];
  platformMessages: FnccNewsMessage[];
}

export interface FnccNewsResponse {
  status: number;
  fetchedAt: string;
  lastModified: string;
  feedCount: number;
  messageCount: number;
  data: FnccNewsFeed[];
}

export interface FnccPlaylist {
  id: string;
  playlistId: string | null;
  name: string;
  subName: string | null;
  description: string | null;
  gameType: string;
  ratingType: string;
  minPlayers: number;
  maxPlayers: number;
  maxTeams: number;
  maxTeamSize: number;
  maxSquads: number | null;
  maxSquadSize: number;
  maxSocialPartySize: number | null;
  maxHumanAndBotParticipants: number;
  isDefault: boolean;
  isTournament: boolean;
  isRanked: boolean;
  isLimitedTimeMode: boolean;
  isLargeTeamGame: boolean;
  usePlayerRating: boolean;
  allowJoinInProgress: boolean;
  winCondition: string;
  respawnType: string | null;
  richPresence: string;
  map: string | null;
  gameplayTags: string[];
  modifiers: string[];
  hiddenHudElements: string[];
  requiredPlugins: string[];
  images: FnccImages;
  added: FnccIntroduction | null;
  path: string;
  properties: Record<string, unknown>;
  parentExperience: Record<string, unknown> | null;
  matchmaking: Record<string, unknown> | null;
}

export interface FnccWeapon {
  id: string;
  name: string;
  description: string;
  shortDescription: string | null;
  type: string;
  category: string;
  subCategory: string | null;
  rarity: FnccRarity | null;
  tier: string | null;
  ammoType: string;
  triggerType: string | null;
  isRanged: boolean;
  isMelee: boolean;
  analyticTags: string[];
  searchTags: string[];
  traits: string[];
  mesh: string;
  stats: Record<string, unknown>;
  images: FnccImages;
  added: FnccIntroduction | null;
  path: string;
  properties: Record<string, unknown>;
}

export interface FnccWeaponsResponse {
  status: number;
  total: number;
  count: number;
  data: FnccWeapon[];
}

export interface FnccWeaponFilters {
  categories: Record<string, number>;
  rarities: Record<string, number>;
  ammoTypes: Record<string, number>;
  triggerTypes: Record<string, number>;
  types: Record<string, number>;
}
