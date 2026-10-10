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

export interface FnccRarityGradient {
  radius: number;
  falloff: number;
  brightness: number;
  roughness: number;
  glow: number;
}

export interface FnccRarity {
  value: string;
  displayValue: string;
  backendValue: string;
  colors: string[];
  hexColors: string[];
  gradient: FnccRarityGradient;
  image: string;
  generated: boolean;
  card: string | null;
  cardAnimated: boolean;
}

export interface FnccRarityColors {
  value: string;
  displayValue: string;
  backendValue: string;
  colors: string[];
  hexColors: string[];
  gradient: FnccRarityGradient;
}

export interface FnccRarityTier extends Omit<FnccRarity, 'generated'> {
  cosmetics: number;
  weapons: number;
}

export interface FnccTypeInfo {
  value: string;
  displayValue: string;
  backendValue: string;
  image: string;
}

export interface FnccCosmeticType extends FnccTypeInfo {
  category: string;
  count: number;
}

export interface FnccSet {
  value: string;
  text: string;
  backendValue: string;
}

export interface FnccSeries {
  value: string;
  backendValue: string;
  colors: string[];
  hexColors: string[];
  image: string | null;
  generated: boolean;
  card: string | null;
  cardAnimated: boolean;
}

export interface FnccIntroduction {
  chapter: string;
  season: string;
  text: string;
  backendValue: number;
}

export interface FnccImages {
  smallIcon?: string | null;
  icon?: string;
  wide?: string | null;
  largeIcon?: string;
  render?: string;
  albumArt?: string;
  placeholder?: boolean;
}

export interface FnccMedia {
  video: Record<string, string> | null;
  audio: string | null;
  audioDuration: string | null;
  source: string;
}

export interface FnccVariantOption {
  tag: string;
  name: string;
  image: string | null;
}

export interface FnccVariant {
  channel: string;
  name: string | null;
  type: string;
  options: FnccVariantOption[];
}

export interface FnccVersion {
  gameVersion: string;
  cleanBuild: string;
  changelist: number;
  branch: string;
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
  fetchedAt: string;
}

export interface FnccMappings {
  version: string;
  fileName: string;
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
  progress: number | null;
  lastCheckAt: string | null;
  lastError: string | null;
  checkIntervalMs: number;
  cleanBuild: string;
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

export interface FnccMaintenanceComponentSummary {
  knownGood: string | null;
  lastResult: string | null;
  lastCheckAt: string | null;
  quarantined: number;
  promotions: number;
  rollbacks: number;
  lastError: string | null;
}

export interface FnccMaintenanceSummary {
  status: string;
  cue4parse: FnccMaintenanceComponentSummary;
  legendary: FnccMaintenanceComponentSummary;
}

export interface FnccMaintenanceComponent {
  knownGood: string | null;
  current: string | null;
  candidate: string | null;
  failed: string[];
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
  maintenance: FnccMaintenanceSummary;
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
  progress: number | null;
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
  subCategoryGroup: number;
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
  gender: string | null;
  cosmeticId: string | null;
  vehicleId: string | null;
  dynamicPakId: string | null;
  showcaseVideo: string | null;
  itemPreviewHeroPath: string | null;
  path: string;
  media?: FnccMedia | null;
}

export interface FnccTrackDifficulty {
  vocals: number;
  guitar: number;
  bass: number;
  plasticBass: number;
  drums: number;
  plasticDrums: number;
}

export interface FnccTrack {
  id: string;
  devName: string;
  title: string;
  artist: string;
  album: string | null;
  releaseYear: number;
  bpm: number;
  duration: number;
  difficulty: FnccTrackDifficulty;
  genres: string[];
  albumArt: string;
  images?: FnccImages;
  media?: FnccMedia | null;
}

export interface FnccBean {
  id: string;
  cosmeticId: string;
  name: string;
  description: string;
  gender: string | null;
  images: FnccImages;
  gameplayTags: string[];
  path: string;
}

export type FnccCatalogItem = FnccCosmetic | FnccTrack | FnccBean;

export type FnccCosmeticsByCategory = Record<string, FnccCatalogItem[]>;

export type FnccCosmeticCategories = Record<string, number>;

export interface FnccCosmeticSearchResponse<T = FnccCosmetic> {
  status: number;
  total: number;
  data: T[];
}

export interface FnccCosmeticSearchAllResponse {
  status: number;
  total: number;
  count: number;
  data: Array<FnccCatalogItem & { category: string }>;
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
  name: string | null;
  description: string | null;
  scaling: FnccSpritePerkScaling[];
}

export interface FnccSpriteSpawn {
  variantWeight: number | null;
  weightTable: string | null;
  weightRow: string | null;
  eventTable: string | null;
  eventRow: string | null;
  eventWeight: number | null;
  eventEnabled: boolean | null;
  randomActivationChance: number | null;
  maxCount: number | null;
  maxSpawnedCount: number | null;
  minRespawnTime: number | null;
  maxRespawnTime: number | null;
  onlyInSafeZone: boolean | null;
  calendarGated: boolean;
}

export interface FnccSpriteVariantSpawn extends FnccSpriteSpawn {
  shippedVariantWeight: number;
}

export interface FnccSpriteGrant {
  reward: string;
  plugin: string;
  quest: string | null;
  requires: string | null;
}

export interface FnccSpriteAcquisition {
  spawnable: boolean;
  granted: boolean;
  methods: string[];
  grants: FnccSpriteGrant[];
}

export interface FnccSpriteVariantAcquisition extends FnccSpriteAcquisition {
  override: boolean;
}

export interface FnccSpriteVariant {
  id: string;
  mappingId: string;
  name: string;
  description: string;
  variant: string;
  rarity: FnccRarityColors | null;
  summonCost: number;
  isStarter: boolean;
  library: string;
  season: string;
  released: string;
  currentSeason: boolean;
  images: FnccImages;
  contextTags: string[];
  perks: FnccSpritePerk[];
  extractionCurve: string | null;
  extractionPoints: FnccSpritePerkLevel[];
  enabled: boolean;
  registered: boolean;
  spawn: FnccSpriteVariantSpawn | null;
  acquisition: FnccSpriteVariantAcquisition;
  path: string;
}

export interface FnccSprite {
  id: string;
  mappingId: string;
  library: string;
  season: string;
  name: string;
  description: string;
  rarity: FnccRarity | null;
  summonCost: number;
  isStarter: boolean;
  released: string;
  currentSeason: boolean;
  dexNumber: number | null;
  species: string;
  acquisitionHint: string | null;
  images: FnccImages;
  gameplayTags: string[];
  contextTags: string[];
  perks: FnccSpritePerk[];
  variants: FnccSpriteVariant[];
  enabled: boolean;
  registered: boolean;
  spawn: FnccSpriteSpawn | null;
  acquisition: FnccSpriteAcquisition;
  path: string;
}

export interface FnccSpritesResponse {
  status: number;
  hotfixAppliedAt: string | null;
  hotfixRules: number;
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
  extension: string;
  size: number;
  archiveName: string;
}

export type FnccSearchHit = FnccAssetEntry;

export type FnccAssetPackage = Record<string, string>;

export interface FnccAssetExportRef {
  name: string;
  class: string;
}

export interface FnccFixedPath {
  input: string;
  found: boolean;
  file: string | null;
  package: string | null;
  objectPath: string | null;
  objectName: string | null;
  class: string | null;
  archive: string | null;
  size: number | null;
  exports: FnccAssetExportRef[];
  error: string | null;
}

export interface FnccArchive {
  name: string;
  path: string;
  encrypted: boolean;
  encryptionKeyGuid: string;
  fileCount: number;
  size: number;
  mounted: boolean;
}

export interface FnccContentMatchContext {
  text: string;
  offset: number;
  encoding: string;
}

export interface FnccContentMatch extends FnccAssetEntry {
  matchCount: number;
  matches: FnccContentMatchContext[];
}

export interface FnccContentSearchResult {
  term: string;
  candidates: number;
  scanned: number;
  skipped: number;
  hits: number;
  truncated: boolean;
  truncationReason: string | null;
  elapsedMs: number;
  items: FnccContentMatch[];
}

export interface FnccAntiCheatFileRef {
  name: string;
  size: number;
  sha256: string;
  modified: string;
  version: string | null;
  productVersion: string | null;
  url: string | null;
}

export interface FnccAntiCheat {
  installed: boolean;
  splash: FnccAntiCheatFileRef | null;
  version: string;
  productVersion: string;
  runtimeVersion: string;
  gameVersion: string;
  product: Record<string, string> | null;
  locales: string[];
  licenses: string[];
  certificates: FnccAntiCheatFileRef[];
  licenseFiles: FnccAntiCheatFileRef[];
  files: FnccAntiCheatFileRef[];
  checkedAt: string;
}

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

export interface FnccDiscoveryResult {
  linkCode: string;
  isVisible: boolean;
  lockStatus: string;
  lockStatusReason: string;
  globalCcu: number | null;
  likePercent: number | null;
}

export interface FnccDiscoveryPanel {
  name: string;
  displayName: string;
  subtitle: string | null;
  type: string;
  featureTags: string[];
  hasMore: boolean;
  resultCount: number;
  results: FnccDiscoveryResult[];
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
  itemId?: string;
  name: string;
  description: string | null;
  details: string | null;
  enabled: boolean;
  needsProFishingRod: boolean;
  sizeMin: number | null;
  sizeMax: number | null;
  heal: number | null;
  rarity: string | null;
  maxStackSize: number | null;
  tags: string[];
  image: string | null;
  smallImage: string | null;
  timeOfDay: string[];
  location: string[];
  source: string;
  path: string | null;
}

export interface FnccShopPrice {
  currency: string;
  regularPrice: number | null;
  finalPrice: number;
  discount: number | null;
  saleType: string | null;
  saleExpiration: string | null;
  dynamic: boolean;
  floorPrice?: number;
}

export interface FnccShopColors {
  color1: string;
  color2: string;
  color3: string | null;
  textBackground: string;
}

export interface FnccShopBackground {
  type: string;
  texture: string;
}

export interface FnccShopLayout {
  id: string;
  name: string;
  index: number;
  rank: number;
  category: string | null;
  subtitle: string | null;
  showIneligibleOffers: string;
  useWidePreview: boolean | null;
  displayType: string | null;
  background: FnccShopBackground;
  offerGroupId: string;
}

export interface FnccShopItem {
  templateId: string;
  type: string;
  id: string;
  quantity: number;
  category: string | null;
  name: string | null;
  description: string | null;
  rarity: FnccRarity | null;
  series: FnccSeries | null;
  cosmeticType: FnccTypeInfo | null;
  images: FnccImages | null;
}

export interface FnccShopBundleItem {
  templateId: string;
  quantity: number;
  regularPrice: number;
  discountedPrice: number;
  alreadyOwnedPriceReduction: number;
}

export interface FnccShopBundle {
  name: string;
  description: string | null;
  asset: string;
}

export interface FnccShopImages {
  source: string;
  store: string[];
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
  bundleItems: FnccShopBundleItem[];
  relatedOffers: string | null;
  mainType: string | null;
  inDate: string;
  outDate: string;
  giftable: boolean;
  refundable: boolean;
  dailyLimit: number;
  weeklyLimit: number;
  monthlyLimit: number;
  price: FnccShopPrice;
  colors: FnccShopColors;
  displayAsset: string;
  displayAssetPath: string | null;
  tileBackgroundMaterial: string | null;
  primaryTemplateId: string | null;
  items: FnccShopItem[];
  storefront: string;
  section: { id: string; name: string };
  images: FnccShopImages | null;
  layout: FnccShopLayout;
  bundle: FnccShopBundle | null;
  media: FnccMedia | null;
}

export interface FnccItemShop {
  status: number;
  fetchedAt: string;
  resetsAt: string;
  catalogExpiresAt: string;
  refreshIntervalHrs: number;
  hash: string;
  offerCount: number;
  itemsResolved: number;
  itemsUnresolved: number;
  data: FnccShopOffer[];
}

export interface FnccShopStackRank {
  context: string;
  productTag: string;
  rank: number;
  startDate: string;
}

export interface FnccShopOfferGroup {
  id: string;
  displayType: string;
  widePreview: boolean;
  stackRanks: FnccShopStackRank[];
}

export interface FnccItemShopSection {
  id: string;
  name: string;
  index: number;
  category: string | null;
  subtitle: string | null;
  showIneligibleOffers: string;
  background: FnccShopBackground;
  stackRanks: FnccShopStackRank[];
  offerGroups: FnccShopOfferGroup[];
  offerCount: number;
}

export interface FnccItemShopSections {
  status: number;
  fetchedAt: string;
  resetsAt: string;
  catalogExpiresAt: string;
  layoutLastModified: string;
  sectionCount: number;
  data: FnccItemShopSection[];
}

export interface FnccLightswitchLauncher {
  appName: string;
  catalogItemId: string;
  namespace: string;
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
  launcher: FnccLightswitchLauncher | null;
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

export interface FnccExternalAuthId {
  id: string;
  type: string;
}

export interface FnccExternalAuth {
  accountId: string;
  type: string;
  externalAuthId?: string;
  externalAuthIdType?: string;
  externalAuthSecondaryId?: string;
  externalDisplayName?: string;
  avatar?: string;
  authIds: FnccExternalAuthId[];
}

export interface FnccLookupNameMatch {
  value: string;
  platform: string;
}

export interface FnccLookupMatch {
  accountId: string;
  displayName: string;
  externalAuths: Record<string, FnccExternalAuth>;
  matchType?: string;
  matches?: FnccLookupNameMatch[];
  epicMutuals?: number;
  sortPosition?: number;
  links?: Record<string, unknown>;
}

export interface FnccLookupQuery {
  accountId?: string;
  name?: string;
  platform?: string;
  resolved: string;
}

export interface FnccLookupResponse {
  status: number;
  query: FnccLookupQuery;
  exactCount: number;
  moreCount: number;
  count: number;
  exact: FnccLookupMatch[];
  more: FnccLookupMatch[];
}

export interface FnccMnemonicImages {
  full: string | null;
  medium: string | null;
  small: string | null;
  tiny: string | null;
}

export interface FnccMnemonicMatchmaking {
  v1: Record<string, unknown> | null;
  v2: Record<string, unknown> | null;
  v3: Record<string, unknown> | null;
  plugins: string[] | null;
}

export interface FnccMnemonic {
  mnemonic: string;
  linkType: string;
  creator: string;
  title: string | null;
  description: string | null;
  image: string | null;
  images: FnccMnemonicImages;
  parentExperience: string | null;
  matchmakingId: string | null;
  matchmaking: FnccMnemonicMatchmaking;
  metadata: Record<string, unknown>;
}

export interface FnccMnemonicLink {
  namespace: string;
  accountId: string;
  creatorName: string;
  mnemonic: string;
  linkType: string;
  metadata: Record<string, unknown>;
  version: number;
  active: boolean;
  disabled: boolean;
  created: string;
  published: string;
  updated: string;
  descriptionTags: string[];
  moderationStatus: string;
  lastActivatedDate: string;
  discoveryIntent: string;
  linkState: string;
}

export interface FnccMnemonicRelated {
  parentLinks: FnccMnemonicLink[];
  links: Record<string, FnccMnemonicLink>;
}

export interface FnccNewsMessage {
  title: string;
  body: string;
  image?: string;
  hidden?: boolean;
  messagetype?: string;
  spotlight?: boolean;
  layout?: string;
}

export interface FnccNewsPlatformMessageContent {
  entryType: string;
  image: string;
  tileImage: string;
  hidden: boolean;
  videoMute: boolean;
  title: string;
  body: string;
  videoLoop: boolean;
  videoStreamingEnabled: boolean;
  id: string;
  videoAutoplay: boolean;
  videoFullscreen: boolean;
  spotlight: boolean;
  sortingPriority?: number;
}

export interface FnccNewsPlatformMessage {
  hidden: boolean;
  message: FnccNewsPlatformMessageContent;
  platform: string;
}

export interface FnccNewsFeed {
  id: string;
  contentKey: string;
  title: string | null;
  style: string | null;
  alwaysShow: boolean;
  lastModified: string;
  messageCount: number;
  messages: FnccNewsMessage[];
  platformMessages: FnccNewsPlatformMessage[];
}

export interface FnccNewsResponse {
  status: number;
  fetchedAt: string;
  lastModified: string;
  feedCount: number;
  messageCount: number;
  data: FnccNewsFeed[];
}

export interface FnccPlaylistImages {
  missionIcon: string | null;
  cover?: string;
}

export interface FnccPlaylistLootPool {
  id: string;
  name: string;
  experience: string;
  experienceId: string;
  map: string | null;
  mapCode: string | null;
  itemCount: number;
  containerCount: number;
}

export interface FnccMatchmakingFillRate {
  MinMmr: number;
  MaxMmr: number;
  MinFillPct: number;
  MaxFillPct: number;
  MaxPriority: number;
}

export interface FnccMatchmakingRatingBracket {
  MinMmr: number;
  MaxMmr: number;
}

export interface FnccMatchmakingRatingExpansion {
  Priority: number;
  RatingDelta: number;
}

export interface FnccPlaylistMatchmaking {
  service: string | null;
  routedByHotfix: boolean;
  supports: { v1: boolean; v2: boolean; v3: boolean };
  v1: Record<string, unknown> | null;
  v2: Record<string, unknown> | null;
  v3: Record<string, unknown> | null;
  v3Version: number | null;
  v3Options: string[] | null;
  plugins: string[] | null;
  ratingType: string | null;
  usesPlayerRating: boolean;
  strategy: string | null;
  minBracketSize: number | null;
  maxBracketSize: number | null;
  maxBucketCapacity: number | null;
  maxPendingMatches: number | null;
  multidivisionQueues: boolean;
  limitedPool: boolean;
  allowSinglePartyMatches: boolean;
  enableRatingUpdate: boolean;
  fillRateTable: FnccMatchmakingFillRate[] | null;
  playerRatingBrackets: FnccMatchmakingRatingBracket[] | null;
  priorityRatingExpansion: FnccMatchmakingRatingExpansion[] | null;
}

export interface FnccPlaylist {
  id: string;
  playlistId: number | null;
  name: string;
  subName: string | null;
  description: string | null;
  gameType: string | null;
  ratingType: string | null;
  minPlayers: number | null;
  maxPlayers: number;
  maxTeams: number;
  maxTeamSize: number;
  maxSquads: number | null;
  maxSquadSize: number;
  maxSocialPartySize: number | null;
  maxHumanAndBotParticipants: number | null;
  isDefault: boolean;
  isTournament: boolean;
  isRanked: boolean;
  isLimitedTimeMode: boolean;
  isLargeTeamGame: boolean;
  usePlayerRating: boolean;
  allowJoinInProgress: boolean;
  winCondition: string | null;
  respawnType: string | null;
  richPresence: string | null;
  map: string | null;
  gameplayTags: string[];
  modifiers: string[];
  hiddenHudElements: string[];
  requiredPlugins: string[];
  images: FnccPlaylistImages;
  added: string | null;
  path: string;
  properties: Record<string, unknown>;
  lootPool: FnccPlaylistLootPool | null;
  parentExperience: string | null;
  matchmaking: FnccPlaylistMatchmaking;
  hidden?: boolean;
  specialBorder?: unknown;
}

export interface FnccWeaponRangeBands {
  close: number;
  mid: number;
  long: number;
  max: number;
}

export interface FnccWeaponStats {
  table: string;
  row: string;
  damagePerSecond: number | null;
  damage: FnccWeaponRangeBands;
  environmentDamage: FnccWeaponRangeBands;
  impactDamage: FnccWeaponRangeBands;
  range: FnccWeaponRangeBands;
  headshotMultiplier: number;
  firingRate: number | null;
  burstFiringRate: number | null;
  clipSize: number;
  reloadTime: number;
  reloadType: string;
  bulletsPerCartridge: number | null;
  cartridgePerFire: number;
  ammoCostPerFire: number;
  maxSpareAmmo: number | null;
  initialClips: number;
  spread: number | null;
  spreadDownsights: number | null;
  recoilVertical: number | null;
  recoilHorizontal: number | null;
  aimTransitionIn: number | null;
  aimTransitionOut: number | null;
  projectileVelocity: number | null;
  minChargeTime: number;
  maxChargeTime: number;
  baseLevel: number;
  raw?: Record<string, unknown>;
}

export interface FnccWeaponImages {
  icon: string | null;
  largeIcon: string | null;
  miniMapIcon: string | null;
}

export interface FnccWeapon {
  id: string;
  name: string;
  description: string | null;
  shortDescription: string | null;
  type: string;
  category: string | null;
  subCategory: string | null;
  rarity: string | null;
  tier: number | null;
  ammoType: string | null;
  triggerType: string | null;
  isRanged: boolean;
  isMelee: boolean;
  analyticTags: string[];
  searchTags: string[];
  traits: string[];
  tags: string[];
  mesh: string | null;
  stats: FnccWeaponStats | null;
  images: FnccWeaponImages;
  added: string | null;
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

export interface FnccLootPoolSummary {
  id: string;
  name: string;
  experience: string;
  experienceId: string;
  map: string | null;
  mapCode: string | null;
  zeroBuild: boolean;
  ranked: boolean;
  competitive: boolean;
  teamSize: number | null;
  itemCount: number;
  containerCount: number;
  hotfixCount: number;
  playlistCount: number;
}

export interface FnccLootRange {
  min: number;
  max: number;
}

export interface FnccLootDrop {
  id: string;
  name: string | null;
  rarity: string | null;
  type: string;
  chance: number;
  count: FnccLootRange;
  images: { icon: string } | null;
}

export interface FnccLootContainer {
  id: string;
  name: string;
  drops: FnccLootRange;
  resolved: number;
  items: FnccLootDrop[];
}

export interface FnccLootContainerSummary {
  id: string;
  name: string;
  items: number;
  resolved: number;
  drops: FnccLootRange;
}

export interface FnccLootPoolTables {
  tier: string;
  package: string;
  merged: string[];
}

export interface FnccLootPoolPlaylist {
  id: string;
  name: string;
  gameType: string;
  tags: string[];
}

export interface FnccLootPool extends FnccLootPoolSummary {
  tables: FnccLootPoolTables;
  borrowedFrom: Record<string, number>;
  unresolved: string[];
  playlists: FnccLootPoolPlaylist[];
  hotfixes: Record<string, unknown>[];
  containers: FnccLootContainer[];
}

export interface FnccLootPoolWithContainers extends FnccLootPoolSummary {
  containers: FnccLootContainer[];
}

export interface FnccLootPoolContainers extends Omit<FnccLootPool, 'containers'> {
  containers: FnccLootContainerSummary[];
}

export interface FnccLootHit extends FnccLootDrop {
  pool: string;
  poolName: string;
  experience: string;
  map: string | null;
  container: string;
  containerName: string;
}

export interface FnccLootSearchResponse {
  status: number;
  total: number;
  count: number;
  data: FnccLootHit[];
}

export interface FnccShortLink {
  code: string;
  url: string;
  target: string;
  createdAt: string;
  expiresAt: string;
  expiresInHours: number;
}

export interface FnccShortenStats {
  links: number;
  audit: number;
}

export interface FnccSeason {
  season: number;
  chapter: string;
  seasonInChapter: string;
  displayName: string;
  gameName: string | null;
  storefront: string | null;
  current: boolean;
}

export interface FnccBattlePassOffers {
  seasonPassOfferId: string;
  seasonPassLevelOfferId: string;
  seasonPassBundleOfferId?: string;
  seasonPassLevelBundleOfferId?: string;
}

export interface FnccBattlePassReward {
  id: string;
  type: string;
  name: string | null;
  rarity: FnccRarity | null;
  images: FnccImages | null;
  tier: string;
  cost: number;
  currency: string;
  path: string;
}

export interface FnccBattlePassCategory {
  title: string;
  subtitle: string;
  rewardCount: number;
  rewards: FnccBattlePassReward[];
}

export interface FnccBattlePass {
  id: string;
  season: number;
  name: string;
  displayName: string;
  description: string;
  storefront: string;
  passId: string;
  offers: FnccBattlePassOffers;
  rewardCount: number;
  categories: FnccBattlePassCategory[];
}

export interface FnccBundleItem {
  templateId: string;
  type: string;
  id: string;
  name: string | null;
  rarity: FnccRarity | null;
  quantity: number;
  regularPrice: number | null;
  discountedPrice: number | null;
  images: FnccImages | null;
}

export interface FnccBundlePrice {
  currency: string;
  regularPrice: number | null;
  finalPrice: number;
}

export interface FnccBundle {
  id: string;
  name: string | null;
  bundleId: string | null;
  displayAsset: string;
  items: FnccBundleItem[];
  price: FnccBundlePrice;
  images: FnccShopImages | null;
  firstSeen: string;
  lastSeen: string;
  occurrences: number;
  inShop: boolean;
  offerIds: string[];
}

export interface FnccBundlesResponse {
  status: number;
  total: number;
  count: number;
  data: FnccBundle[];
}

export interface FnccAvailability {
  forcedOffIn: string[];
  forcedOnIn: string[];
}

export interface FnccModeImages {
  lobby: string | null;
  matchmaking: string;
}

export interface FnccModeMapLootPool {
  id: string;
  name: string;
  zeroBuild: boolean;
  ranked: boolean;
}

export interface FnccModeMap {
  code: string;
  name: string | null;
  localisedNames: Record<string, string> | null;
  inRotation: boolean;
  modes: string[] | null;
  rotationDuration: number | null;
  islandCodes: string[];
  images: FnccModeImages | null;
  lootPools: FnccModeMapLootPool[];
  playlistCount: number;
  availability: FnccAvailability;
}

export interface FnccModeSubstitution {
  base: string;
  active: string;
}

export interface FnccModeRotation {
  name: string | null;
  localisedNames: Record<string, string>;
  duration: number;
  modes: string[] | null;
  islandCodes: string[];
  mapCodes: string[];
  images: FnccModeImages;
  substitutions: FnccModeSubstitution[];
}

export interface FnccModeMapRef {
  code: string;
  name: string | null;
}

export interface FnccMode {
  id: string;
  name: string;
  description: string;
  mnemonic: string;
  image: string;
  enabled: boolean;
  updated: string;
  lootPoolCount: number;
  playlistCount: number;
  inRotation: Record<string, FnccModeMapRef[]>;
  maps: FnccModeMap[];
  availability: FnccAvailability;
  rotation: FnccModeRotation[];
  events?: Record<string, unknown>[];
}

export interface FnccModeSeason {
  number: number;
  begin: string;
  end: string;
  displayedEnd: string;
}

export interface FnccModes {
  fetchedAt: string;
  currentTime: string;
  season: FnccModeSeason;
  modes: FnccMode[];
}

export interface FnccQuestObjective {
  description: string | null;
  hudDescription: string | null;
  count: number | null;
  displayStage?: number | null;
  displayMaxStage?: number | null;
}

export interface FnccQuestReward {
  type: string;
  templateId: string | null;
  quantity: number;
  hidden: boolean;
}

export interface FnccQuest {
  templateId: string;
  name: string | null;
  description: string | null;
  flavorText: string | null;
  type: string | null;
  subtype: string | null;
  sortPriority: number | null;
  tags: string[];
  visibleToPlayers: boolean;
  includedInCategories: boolean;
  canShowInPostMatch: boolean;
  completionText: string | null;
  visibleWhen: { active?: boolean; completed?: boolean; claimed?: boolean; expired?: boolean };
  allowPinning: boolean;
  objectives: Record<string, FnccQuestObjective>;
  rewards: FnccQuestReward[] | null;
  path: string;
}

export interface FnccStwQuest {
  templateId: string;
  name: string | null;
  description: string | null;
  completionText: string | null;
  type: string | null;
  category: string | null;
  objectives: Record<string, FnccQuestObjective>;
  rewards: FnccQuestReward[] | null;
  path: string;
}

export interface FnccQuestBundle {
  templateId: string;
  tags: string[];
  quests: string[];
  calendarEventTag: string | null;
  path: string;
}

export interface FnccQuestCategoryHeader {
  name: string | null;
  description: string | null;
  tag: string;
  sortOrder: number;
}

export interface FnccQuestCategory {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  enabled: boolean;
  alwaysDisplay: boolean;
  includeTags: string[];
  product: string | null;
  mode: string | null;
  defaultHeader: { name: string | null; sortOrder: number };
  headers: FnccQuestCategoryHeader[];
  extra?: Record<string, unknown>;
  path: string;
}

export interface FnccStwQuestCategory {
  id: string;
  name: string;
  sortPriority: number;
}

export interface FnccQuestCatalogMeta {
  build: string;
  generatedAt: string;
  lang: string;
  counts?: Partial<Record<'quests' | 'bundles' | 'categories' | 'stwQuests' | 'stwCategories' | 'skipped', number>>;
}

export interface FnccQuestCatalog extends FnccQuestCatalogMeta {
  quests: Record<string, FnccQuest>;
  bundles: Record<string, FnccQuestBundle>;
  categories: FnccQuestCategory[];
  stwQuests: Record<string, FnccStwQuest>;
  stwCategories: Record<string, FnccStwQuestCategory>;
}

export interface FnccQuestCategories extends FnccQuestCatalogMeta {
  categories: FnccQuestCategory[];
}

export interface FnccQuestBundles extends FnccQuestCatalogMeta {
  bundles: Record<string, FnccQuestBundle>;
}

export interface FnccStwQuests extends FnccQuestCatalogMeta {
  stwQuests: Record<string, FnccStwQuest>;
  stwCategories: Record<string, FnccStwQuestCategory>;
}

export interface FnccQuestLookup {
  build: string;
  generatedAt: string;
  lang: string;
  quests: Record<string, FnccQuest>;
  stwQuests: Record<string, FnccStwQuest>;
  missing: string[];
}

export type FnccQuestEntry = (FnccQuest & { source: 'athena' }) | (FnccStwQuest & { source: 'stw' });
