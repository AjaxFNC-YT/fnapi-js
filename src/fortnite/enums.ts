export const AccountType = {
  Epic: 'epic',
  Psn: 'psn',
  Xbl: 'xbl',
} as const;

export type AccountType = (typeof AccountType)[keyof typeof AccountType];

export const ACCOUNT_TYPES = Object.values(AccountType) as AccountType[];

export function isAccountType(value: unknown): value is AccountType {
  return typeof value === 'string' && (ACCOUNT_TYPES as string[]).includes(value);
}

export const KeyFormat = {
  Hex: 'hex',
  Base64: 'base64',
} as const;

export type KeyFormat = (typeof KeyFormat)[keyof typeof KeyFormat];

export const KEY_FORMATS = Object.values(KeyFormat) as KeyFormat[];

export function isKeyFormat(value: unknown): value is KeyFormat {
  return typeof value === 'string' && (KEY_FORMATS as string[]).includes(value);
}

export const Language = {
  Arabic: 'ar',
  German: 'de',
  English: 'en',
  Spanish: 'es',
  SpanishLatinAmerica: 'es-419',
  French: 'fr',
  Indonesian: 'id',
  Italian: 'it',
  Japanese: 'ja',
  Korean: 'ko',
  Polish: 'pl',
  PortugueseBrazil: 'pt-BR',
  Russian: 'ru',
  Thai: 'th',
  Turkish: 'tr',
  Vietnamese: 'vi',
  ChineseSimplified: 'zh-Hans',
  ChineseTraditional: 'zh-Hant',
} as const;

export type Language = (typeof Language)[keyof typeof Language];

export const LANGUAGES = Object.values(Language) as Language[];

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as string[]).includes(value);
}

export const MatchMethod = {
  Full: 'full',
  Contains: 'contains',
  Starts: 'starts',
  Ends: 'ends',
} as const;

export type MatchMethod = (typeof MatchMethod)[keyof typeof MatchMethod];

export const MATCH_METHODS = Object.values(MatchMethod) as MatchMethod[];

export function isMatchMethod(value: unknown): value is MatchMethod {
  return typeof value === 'string' && (MATCH_METHODS as string[]).includes(value);
}

export const TimeWindow = {
  Lifetime: 'lifetime',
  Season: 'season',
} as const;

export type TimeWindow = (typeof TimeWindow)[keyof typeof TimeWindow];

export const TIME_WINDOWS = Object.values(TimeWindow) as TimeWindow[];

export function isTimeWindow(value: unknown): value is TimeWindow {
  return typeof value === 'string' && (TIME_WINDOWS as string[]).includes(value);
}

export const StatsImage = {
  All: 'all',
  KeyboardMouse: 'keyboardMouse',
  Gamepad: 'gamepad',
  Touch: 'touch',
  None: 'none',
} as const;

export type StatsImage = (typeof StatsImage)[keyof typeof StatsImage];

export const STATS_IMAGES = Object.values(StatsImage) as StatsImage[];

export function isStatsImage(value: unknown): value is StatsImage {
  return typeof value === 'string' && (STATS_IMAGES as string[]).includes(value);
}

export const Rarity = {
  Common: 'common',
  Uncommon: 'uncommon',
  Rare: 'rare',
  Epic: 'epic',
  Legendary: 'legendary',
  Mythic: 'mythic',
  Dark: 'dark',
  Dc: 'dc',
  Frozen: 'frozen',
  GamingLegends: 'gaminglegends',
  Icon: 'icon',
  Lamborghini: 'lamborghini',
  Lava: 'lava',
  Marvel: 'marvel',
  Shadow: 'shadow',
  Slurp: 'slurp',
  StarWars: 'starwars',
} as const;

export type Rarity = (typeof Rarity)[keyof typeof Rarity];

export const RARITIES = Object.values(Rarity) as Rarity[];

export function isRarity(value: unknown): value is Rarity {
  return typeof value === 'string' && (RARITIES as string[]).includes(value);
}

export const BackendRarity = {
  Common: 'EFortRarity::Common',
  Uncommon: 'EFortRarity::Uncommon',
  Rare: 'EFortRarity::Rare',
  Epic: 'EFortRarity::Epic',
  Legendary: 'EFortRarity::Legendary',
  Mythic: 'EFortRarity::Mythic',
  Unattainable: 'EFortRarity::Unattainable',
} as const;

export type BackendRarity = (typeof BackendRarity)[keyof typeof BackendRarity];

export const BACKEND_RARITIES = Object.values(BackendRarity) as BackendRarity[];

export function isBackendRarity(value: unknown): value is BackendRarity {
  return typeof value === 'string' && (BACKEND_RARITIES as string[]).includes(value);
}

export const CosmeticSeries = {
  Crew: 'CrewSeries',
  Dark: 'CUBESeries',
  Dc: 'DCUSeries',
  DcVehicles: 'Series_DC',
  Frozen: 'FrozenSeries',
  GamingLegends: 'PlatformSeries',
  GamingLegendsVehicles: 'Series_GamingLegends',
  Icon: 'CreatorCollabSeries',
  Lava: 'LavaSeries',
  Marvel: 'MarvelSeries',
  Shadow: 'ShadowSeries',
  Slurp: 'SlurpSeries',
  StarWars: 'ColumbusSeries',
  Puma: 'KittySeries',
  Adidas: 'Series_Adidas',
  AlanWalker: 'Series_Alan_Walker',
  AstonMartin: 'Series_AstonMartin',
  Bmw: 'Series_BMW',
  Bugatti: 'Series_Bugatti',
  Chevrolet: 'Series_Chevrolet',
  Chrysler: 'Series_Chrysler',
  Defender: 'Series_Defender',
  Dodge: 'Series_Dodge',
  Ferrari: 'Series_Ferrari',
  Ford: 'Series_Ford',
  Hyundai: 'Series_Hyundai',
  Jeep: 'Series_Jeep',
  Lamborghini: 'Series_Lamborghini',
  Maserati: 'Series_Maserati',
  McLaren: 'Series_McLaren',
  Mercedes: 'Series_Mercedes',
  Nissan: 'Series_Nissan',
  Pontiac: 'Series_Pontiac',
  Porsche: 'Series_Porsche',
  Ram: 'Series_RAM',
  Rivian: 'Series_Rivian',
  Tesla: 'Series_Tesla',
} as const;

export type CosmeticSeries = (typeof CosmeticSeries)[keyof typeof CosmeticSeries];

export const COSMETIC_SERIES = Object.values(CosmeticSeries) as CosmeticSeries[];

export const VEHICLE_SERIES = [
  CosmeticSeries.AstonMartin,
  CosmeticSeries.Bmw,
  CosmeticSeries.Bugatti,
  CosmeticSeries.Chevrolet,
  CosmeticSeries.Chrysler,
  CosmeticSeries.Defender,
  CosmeticSeries.Dodge,
  CosmeticSeries.Ferrari,
  CosmeticSeries.Ford,
  CosmeticSeries.Hyundai,
  CosmeticSeries.Jeep,
  CosmeticSeries.Lamborghini,
  CosmeticSeries.Maserati,
  CosmeticSeries.McLaren,
  CosmeticSeries.Mercedes,
  CosmeticSeries.Nissan,
  CosmeticSeries.Pontiac,
  CosmeticSeries.Porsche,
  CosmeticSeries.Ram,
  CosmeticSeries.Rivian,
  CosmeticSeries.Tesla,
] as CosmeticSeries[];

export function isCosmeticSeries(value: unknown): value is CosmeticSeries {
  return typeof value === 'string' && (COSMETIC_SERIES as string[]).includes(value);
}

export const COSMETIC_TYPE_BACKEND = {
  outfit: 'AthenaCharacter',
  backpack: 'AthenaBackpack',
  pickaxe: 'AthenaPickaxe',
  glider: 'AthenaGlider',
  contrail: 'AthenaSkyDiveContrail',
  emote: 'AthenaDance',
  emoji: 'AthenaEmoji',
  spray: 'AthenaSpray',
  toy: 'AthenaToy',
  wrap: 'AthenaItemWrap',
  loadingscreen: 'AthenaLoadingScreen',
  music: 'AthenaMusicPack',
  banner: 'BannerToken',
  pet: 'AthenaPet',
  petcarrier: 'AthenaPetCarrier',
  shoe: 'CosmeticShoes',
  sidekick: 'CosmeticCompanion',
  skin: 'VehicleCosmetics_Skin',
  body: 'VehicleCosmetics_Body',
  wheel: 'VehicleCosmetics_Wheel',
  booster: 'VehicleCosmetics_Booster',
  drifttrail: 'VehicleCosmetics_DriftTrail',
  guitar: 'SparksGuitar',
  bass: 'SparksBass',
  drum: 'SparksDrum',
  keyboard: 'SparksKeyboard',
  mic: 'SparksMic',
  aura: 'SparksAura',
  legoprop: 'JunoBuildingProp',
  legoset: 'JunoBuildingSet',
} as const;

export type CosmeticType = keyof typeof COSMETIC_TYPE_BACKEND;
export type CosmeticBackendType = (typeof COSMETIC_TYPE_BACKEND)[CosmeticType];

export const CosmeticType = Object.fromEntries(
  Object.keys(COSMETIC_TYPE_BACKEND).map((key) => [key, key]),
) as { [K in CosmeticType]: K };

export const COSMETIC_TYPES = Object.keys(COSMETIC_TYPE_BACKEND) as CosmeticType[];

export function isCosmeticType(value: unknown): value is CosmeticType {
  return typeof value === 'string' && value in COSMETIC_TYPE_BACKEND;
}

export function toBackendType(type: CosmeticType): CosmeticBackendType {
  return COSMETIC_TYPE_BACKEND[type];
}

export function fromBackendType(backendType: string): CosmeticType | null {
  const match = COSMETIC_TYPES.find((type) => COSMETIC_TYPE_BACKEND[type] === backendType);
  return match ?? null;
}

export const ResponseFlags = {
  None: 0,
  Paths: 1 << 0,
  GameplayTags: 1 << 1,
  ShopHistory: 1 << 2,
} as const;

export type ResponseFlagName = keyof typeof ResponseFlags;
export type ResponseFlag = (typeof ResponseFlags)[ResponseFlagName];

export const ALL_RESPONSE_FLAGS =
  ResponseFlags.Paths | ResponseFlags.GameplayTags | ResponseFlags.ShopHistory;

export function parseFlags(value: number | string): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.trunc(value) : 0;
  }

  const normalized = value.trim().toLowerCase();
  const parsed = normalized.startsWith('0x')
    ? Number.parseInt(normalized.slice(2), 16)
    : Number.parseInt(normalized, 10);

  return Number.isNaN(parsed) ? 0 : parsed;
}

export function combineFlags(...flags: Array<number | string>): number {
  return flags.reduce<number>((total, flag) => total | parseFlags(flag), 0);
}

export function hasFlag(value: number | string, flag: number | string): boolean {
  const target = parseFlags(flag);
  return target !== 0 && (parseFlags(value) & target) === target;
}

export function listFlags(value: number | string): ResponseFlagName[] {
  const parsed = parseFlags(value);
  return (Object.keys(ResponseFlags) as ResponseFlagName[]).filter(
    (name) => ResponseFlags[name] !== 0 && hasFlag(parsed, ResponseFlags[name]),
  );
}

export function formatFlags(value: number | string): string {
  return `0x${(parseFlags(value) >>> 0).toString(16)}`;
}
