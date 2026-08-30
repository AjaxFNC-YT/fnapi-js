export interface ApiEnvelope<T> {
  status: number;
  data: T;
  error?: string;
}

export interface ApiErrorEnvelope {
  status: number;
  error: string;
}

export interface CosmeticValue {
  value: string;
  displayValue: string;
  backendValue: string;
}

export interface CosmeticSeriesInfo {
  value: string;
  image?: string | null;
  colors: string[];
  backendValue: string;
}

export interface CosmeticSet {
  value: string;
  text: string;
  backendValue: string;
}

export interface CosmeticIntroduction {
  chapter: string;
  season: string;
  text: string;
  backendValue: number;
}

export interface SmallLargeImages {
  small?: string | null;
  large?: string | null;
}

export interface SmallLargeWideImages extends SmallLargeImages {
  wide?: string | null;
}

export type Nullable<T> = T | null;

export interface AesDynamicKey {
  pakFilename: string;
  pakGuid: string;
  key: string;
}

export interface Aes {
  build: string;
  mainKey: string | null;
  dynamicKeys: AesDynamicKey[];
  updated?: string | null;
}

export interface BannerImages {
  smallIcon: string;
  icon: string;
}

export interface Banner {
  id: string;
  devName: string;
  name: string;
  description: string;
  category?: string | null;
  fullUsageRights: boolean;
  images: BannerImages;
  series?: CosmeticSeriesInfo | null;
  set?: CosmeticSet | null;
  introduction?: CosmeticIntroduction | null;
}

export interface BannerColor {
  id: string;
  color: string;
  category: string;
  subCategoryGroup: number;
}

export interface BrCosmeticVariantOption {
  tag: string;
  name?: string | null;
  unlockRequirements?: string | null;
  image: string;
}

export interface BrCosmeticVariant {
  channel: string;
  type?: string | null;
  options: BrCosmeticVariantOption[];
}

export interface BrCosmeticImages {
  smallIcon?: string | null;
  icon?: string | null;
  featured?: string | null;
  lego?: SmallLargeWideImages | null;
  bean?: SmallLargeImages | null;
  other?: Record<string, string> | null;
}

export interface BrCosmetic {
  id: string;
  name: string;
  description: string;
  exclusiveDescription?: string | null;
  unlockRequirements?: string | null;
  customExclusiveCallout?: string | null;
  type: CosmeticValue;
  rarity: CosmeticValue;
  series?: CosmeticSeriesInfo | null;
  set?: CosmeticSet | null;
  introduction?: CosmeticIntroduction | null;
  images: BrCosmeticImages;
  variants?: BrCosmeticVariant[] | null;
  builtInEmoteIds?: string[] | null;
  searchTags?: string[] | null;
  gameplayTags?: string[] | null;
  metaTags?: string[] | null;
  showcaseVideo?: string | null;
  dynamicPakId?: string | null;
  itemPreviewHeroPath?: string | null;
  displayAssetPath?: string | null;
  definitionPath?: string | null;
  path?: string | null;
  added: string;
  shopHistory?: string[] | null;
}

export interface TrackDifficulty {
  vocals: number;
  guitar: number;
  bass: number;
  plasticBass: number;
  drums: number;
  plasticDrums: number;
}

export interface TrackCosmetic {
  id: string;
  devName: string;
  title: string;
  artist: string;
  album?: string | null;
  releaseYear: number;
  bpm: number;
  duration: number;
  difficulty: TrackDifficulty;
  gameplayTags?: string[] | null;
  genres?: string[] | null;
  albumArt: string;
  added: string;
  shopHistory?: string[] | null;
}

export interface InstrumentCosmetic {
  id: string;
  name: string;
  description: string;
  type: CosmeticValue;
  rarity: CosmeticValue;
  images: SmallLargeImages;
  series?: CosmeticSeriesInfo | null;
  gameplayTags?: string[] | null;
  path?: string | null;
  showcaseVideo?: string | null;
  added: string;
  shopHistory?: string[] | null;
}

export interface CarCosmetic {
  id: string;
  vehicleId: string;
  name: string;
  description: string;
  type: CosmeticValue;
  rarity: CosmeticValue;
  images?: SmallLargeImages | null;
  series?: CosmeticSeriesInfo | null;
  gameplayTags?: string[] | null;
  path?: string | null;
  showcaseVideo?: string | null;
  added: string;
  shopHistory?: string[] | null;
}

export interface LegoCosmetic {
  id: string;
  cosmeticId?: string | null;
  soundLibraryTags?: string[] | null;
  images?: SmallLargeWideImages | null;
  path?: string | null;
  added: string;
}

export interface LegoKitCosmetic {
  id: string;
  name: string;
  type: CosmeticValue;
  series?: CosmeticSeriesInfo | null;
  gameplayTags?: string[] | null;
  images?: SmallLargeWideImages | null;
  path?: string | null;
  added: string;
  shopHistory?: string[] | null;
}

export interface BeanCosmetic {
  id: string;
  cosmeticId?: string | null;
  name: string;
  gender?: string | null;
  gameplayTags?: string[] | null;
  images?: SmallLargeImages | null;
  path?: string | null;
  added: string;
}

export type AnyCosmetic =
  | BrCosmetic
  | TrackCosmetic
  | InstrumentCosmetic
  | CarCosmetic
  | LegoCosmetic
  | LegoKitCosmetic
  | BeanCosmetic;

export interface AllCosmetics {
  br: BrCosmetic[];
  tracks: TrackCosmetic[];
  instruments: InstrumentCosmetic[];
  cars: CarCosmetic[];
  lego: LegoCosmetic[];
  legoKits: LegoKitCosmetic[];
  beans: BeanCosmetic[];
}

export interface NewCosmeticsHashes {
  all: string;
  br?: string | null;
  tracks?: string | null;
  instruments?: string | null;
  cars?: string | null;
  lego?: string | null;
  legoKits?: string | null;
  beans?: string | null;
}

export interface NewCosmeticsLastAdditions {
  all: string;
  br?: string | null;
  tracks?: string | null;
  instruments?: string | null;
  cars?: string | null;
  lego?: string | null;
  legoKits?: string | null;
  beans?: string | null;
}

export interface NewCosmeticsItems {
  br?: BrCosmetic[];
  tracks?: TrackCosmetic[];
  instruments?: InstrumentCosmetic[];
  cars?: CarCosmetic[];
  lego?: LegoCosmetic[];
  legoKits?: LegoKitCosmetic[];
  beans?: BeanCosmetic[];
}

export interface NewCosmetics {
  date: string;
  build: string;
  previousBuild: string;
  hashes: NewCosmeticsHashes;
  lastAdditions: NewCosmeticsLastAdditions;
  items: NewCosmeticsItems;
}

export interface CreatorCodeAccount {
  id: string;
  name: string;
}

export interface CreatorCode {
  code: string;
  account: CreatorCodeAccount;
  status: string;
  verified: boolean;
}

export interface MapImages {
  blank: string;
  pois: string;
}

export interface PoiLocation {
  x: number;
  y: number;
  z: number;
}

export interface Poi {
  id: string;
  name: string;
  location: PoiLocation;
}

export interface GameMap {
  images: MapImages;
  pois: Poi[];
}

export interface NewsMotd {
  id: string;
  title: string;
  tabTitle: string;
  body: string;
  image: string;
  tileImage: string;
  sortingPriority: number;
  hidden: boolean;
  videoString?: string | null;
  videoId?: string | null;
  spotlight?: boolean | null;
}

export interface NewsMessage {
  title: string;
  body: string;
  image: string;
  adspace?: string | null;
}

export interface GameModeNews {
  hash: string;
  date: string;
  image?: string | null;
  motds?: NewsMotd[] | null;
  messages?: NewsMessage[] | null;
}

export interface News {
  br?: GameModeNews | null;
  stw?: GameModeNews | null;
  creative?: GameModeNews | null;
}

export interface PlaylistImages {
  showcase: string | null;
  missionIcon: string | null;
}

export interface Playlist {
  id: string;
  name: string | null;
  subName?: string | null;
  description?: string | null;
  gameType?: string | null;
  ratingType?: string | null;
  minPlayers: number;
  maxPlayers: number;
  maxTeams: number;
  maxTeamSize: number;
  maxSquads: number;
  maxSquadSize: number;
  isDefault: boolean;
  isTournament: boolean;
  isLimitedTimeMode: boolean;
  isLargeTeamGame: boolean;
  accumulateToProfileStats: boolean;
  images?: PlaylistImages | null;
  gameplayTags?: string[] | null;
  path?: string | null;
  added: string;
}

export interface ShopEntryLayout {
  id: string;
  name: string;
  category?: string | null;
  index: number;
  rank: number;
  showIneligibleOffers: string;
  background?: string | null;
  useWidePreview: boolean;
  displayType: string;
}

export interface ShopEntryColors {
  color1: string;
  color2?: string | null;
  color3?: string | null;
  textBackgroundColor?: string | null;
}

export interface ShopEntryBundle {
  name: string;
  info: string;
  image: string;
}

export interface ShopEntryBanner {
  value: string;
  intensity: string;
  backendValue: string;
}

export interface ShopEntryOfferTag {
  id: string;
  text: string;
}

export interface ShopEntryRenderImage {
  productTag: string;
  fileName: string;
  image: string;
}

export interface ShopEntryMaterialInstanceImages {
  [key: string]: string;
}

export interface ShopEntryMaterialInstance {
  id: string;
  primaryMode?: string | null;
  productTag?: string | null;
  images: ShopEntryMaterialInstanceImages;
  colors?: Record<string, string> | null;
  scalings?: Record<string, number> | null;
  flags?: Record<string, boolean> | null;
}

export interface ShopEntryNewDisplayAsset {
  id: string;
  cosmeticId?: string | null;
  materialInstances: ShopEntryMaterialInstance[];
  renderImages: ShopEntryRenderImage[];
}

export interface ShopEntry {
  regularPrice: number;
  finalPrice: number;
  devName: string;
  offerId: string;
  inDate: string;
  outDate: string;
  giftable: boolean;
  refundable: boolean;
  sortPriority: number;
  layoutId: string;
  layout?: ShopEntryLayout | null;
  colors?: ShopEntryColors | null;
  bundle?: ShopEntryBundle | null;
  banner?: ShopEntryBanner | null;
  offerTag?: ShopEntryOfferTag | null;
  tileBackgroundMaterial?: string | null;
  tileSize: string;
  displayAssetPath?: string | null;
  newDisplayAssetPath?: string | null;
  newDisplayAsset?: ShopEntryNewDisplayAsset | null;
  brItems?: BrCosmetic[];
  tracks?: TrackCosmetic[];
  instruments?: InstrumentCosmetic[];
  cars?: CarCosmetic[];
  legoKits?: LegoKitCosmetic[];
}

export interface Shop {
  hash: string;
  date: string;
  vbuckIcon: string;
  entries: ShopEntry[];
}

export interface StatsAccount {
  id: string;
  name: string;
}

export interface StatsBattlePass {
  level: number;
  progress: number;
}

export interface GameModeStats {
  score: number;
  scorePerMin: number;
  scorePerMatch: number;
  wins: number;
  top3?: number;
  top5?: number;
  top6?: number;
  top10?: number;
  top12?: number;
  top25?: number;
  kills: number;
  killsPerMin: number;
  killsPerMatch: number;
  deaths: number;
  kd: number;
  matches: number;
  winRate: number;
  minutesPlayed: number;
  playersOutlived: number;
  lastModified: string;
}

export interface InputTypeStats {
  overall: GameModeStats | null;
  solo: GameModeStats | null;
  duo: GameModeStats | null;
  trio: GameModeStats | null;
  squad: GameModeStats | null;
  ltm: GameModeStats | null;
}

export interface StatsBreakdown {
  all: InputTypeStats | null;
  keyboardMouse: InputTypeStats | null;
  gamepad: InputTypeStats | null;
  touch: InputTypeStats | null;
}

export interface BrStats {
  account: StatsAccount;
  battlePass: StatsBattlePass;
  image: string | null;
  stats: StatsBreakdown;
}
