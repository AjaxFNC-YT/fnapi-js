import { describe, it, expect } from 'vitest';
import {
  AccountType,
  ACCOUNT_TYPES,
  isAccountType,
  CosmeticType,
  COSMETIC_TYPES,
  COSMETIC_TYPE_BACKEND,
  isCosmeticType,
  toBackendType,
  fromBackendType,
  KeyFormat,
  KEY_FORMATS,
  isKeyFormat,
  Language,
  LANGUAGES,
  isLanguage,
  MatchMethod,
  MATCH_METHODS,
  isMatchMethod,
  Rarity,
  RARITIES,
  isRarity,
  BackendRarity,
  BACKEND_RARITIES,
  isBackendRarity,
  CosmeticSeries,
  COSMETIC_SERIES,
  VEHICLE_SERIES,
  isCosmeticSeries,
  ResponseFlags,
  ALL_RESPONSE_FLAGS,
  parseFlags,
  combineFlags,
  hasFlag,
  listFlags,
  formatFlags,
  StatsImage,
  STATS_IMAGES,
  isStatsImage,
  TimeWindow,
  TIME_WINDOWS,
  isTimeWindow,
} from '../../src/fortnite/enums.js';
describe('AccountType', () => {
  it('holds the expected wire values', () => {
    expect(AccountType).toEqual({
      Epic: 'epic',
      Psn: 'psn',
      Xbl: 'xbl',
    });
  });

  it('exposes every value through ACCOUNT_TYPES', () => {
    expect(ACCOUNT_TYPES).toEqual(Object.values(AccountType));
    expect(ACCOUNT_TYPES).toHaveLength(3);
  });

  it('guards valid values', () => {
    for (const value of ACCOUNT_TYPES) {
      expect(isAccountType(value)).toBe(true);
    }
  });

  it('rejects garbage, wrong case, and non-strings', () => {
    expect(isAccountType('Epic')).toBe(false);
    expect(isAccountType('steam')).toBe(false);
    expect(isAccountType('')).toBe(false);
    expect(isAccountType(1)).toBe(false);
    expect(isAccountType(null)).toBe(false);
    expect(isAccountType(undefined)).toBe(false);
    expect(isAccountType(['epic'])).toBe(false);
    expect(isAccountType({ type: 'epic' })).toBe(false);
  });
});

describe('KeyFormat', () => {
  it('holds the expected wire values', () => {
    expect(KeyFormat).toEqual({
      Hex: 'hex',
      Base64: 'base64',
    });
  });

  it('exposes every value through KEY_FORMATS', () => {
    expect(KEY_FORMATS).toEqual(Object.values(KeyFormat));
    expect(KEY_FORMATS).toHaveLength(2);
  });

  it('guards valid values', () => {
    for (const value of KEY_FORMATS) {
      expect(isKeyFormat(value)).toBe(true);
    }
  });

  it('rejects garbage, wrong case, and non-strings', () => {
    expect(isKeyFormat('Hex')).toBe(false);
    expect(isKeyFormat('base32')).toBe(false);
    expect(isKeyFormat(64)).toBe(false);
    expect(isKeyFormat(null)).toBe(false);
    expect(isKeyFormat(undefined)).toBe(false);
  });
});

describe('Language', () => {
  it('holds the expected wire values', () => {
    expect(Language).toEqual({
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
    });
  });

  it('uses the exact regional wire codes', () => {
    expect(Language.SpanishLatinAmerica).toBe('es-419');
    expect(Language.PortugueseBrazil).toBe('pt-BR');
    expect(Language.ChineseSimplified).toBe('zh-Hans');
    expect(Language.ChineseTraditional).toBe('zh-Hant');
  });

  it('exposes every value through LANGUAGES', () => {
    expect(LANGUAGES).toEqual(Object.values(Language));
    expect(LANGUAGES).toHaveLength(18);
  });

  it('guards valid values', () => {
    for (const value of LANGUAGES) {
      expect(isLanguage(value)).toBe(true);
    }
  });

  it('rejects garbage, wrong case, and non-strings', () => {
    expect(isLanguage('EN')).toBe(false);
    expect(isLanguage('pt-br')).toBe(false);
    expect(isLanguage('zh-hans')).toBe(false);
    expect(isLanguage('es-420')).toBe(false);
    expect(isLanguage('klingon')).toBe(false);
    expect(isLanguage(419)).toBe(false);
    expect(isLanguage(null)).toBe(false);
    expect(isLanguage(undefined)).toBe(false);
  });
});

describe('MatchMethod', () => {
  it('holds the expected wire values', () => {
    expect(MatchMethod).toEqual({
      Full: 'full',
      Contains: 'contains',
      Starts: 'starts',
      Ends: 'ends',
    });
  });

  it('exposes every value through MATCH_METHODS', () => {
    expect(MATCH_METHODS).toEqual(Object.values(MatchMethod));
    expect(MATCH_METHODS).toHaveLength(4);
  });

  it('guards valid values', () => {
    for (const value of MATCH_METHODS) {
      expect(isMatchMethod(value)).toBe(true);
    }
  });

  it('rejects garbage, wrong case, and non-strings', () => {
    expect(isMatchMethod('Full')).toBe(false);
    expect(isMatchMethod('startsWith')).toBe(false);
    expect(isMatchMethod(0)).toBe(false);
    expect(isMatchMethod(null)).toBe(false);
    expect(isMatchMethod(undefined)).toBe(false);
  });
});

describe('Rarity', () => {
  it('holds the expected wire values', () => {
    expect(Rarity).toEqual({
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
    });
  });

  it('exposes every value through RARITIES', () => {
    expect(RARITIES).toEqual(Object.values(Rarity));
    expect(RARITIES).toHaveLength(17);
  });

  it('guards valid values', () => {
    for (const value of RARITIES) {
      expect(isRarity(value)).toBe(true);
    }
  });

  it('rejects garbage, wrong case, and non-strings', () => {
    expect(isRarity('Legendary')).toBe(false);
    expect(isRarity('gamingLegends')).toBe(false);
    expect(isRarity('starWars')).toBe(false);
    expect(isRarity('ultra')).toBe(false);
    expect(isRarity(5)).toBe(false);
    expect(isRarity(null)).toBe(false);
    expect(isRarity(undefined)).toBe(false);
  });

  it('rejects rarities the api never returns', () => {
    expect(isRarity('transcendent')).toBe(false);
    expect(isRarity('exotic')).toBe(false);
  });
});

describe('BackendRarity', () => {
  it('holds every EFortRarity value the api returns', () => {
    expect(BackendRarity).toEqual({
      Common: 'EFortRarity::Common',
      Uncommon: 'EFortRarity::Uncommon',
      Rare: 'EFortRarity::Rare',
      Epic: 'EFortRarity::Epic',
      Legendary: 'EFortRarity::Legendary',
      Mythic: 'EFortRarity::Mythic',
      Unattainable: 'EFortRarity::Unattainable',
    });
  });

  it('exposes every value through BACKEND_RARITIES', () => {
    expect(BACKEND_RARITIES).toEqual(Object.values(BackendRarity));
    expect(BACKEND_RARITIES).toHaveLength(7);
  });

  it('guards valid values and rejects bare rarity names', () => {
    for (const value of BACKEND_RARITIES) {
      expect(isBackendRarity(value)).toBe(true);
    }

    expect(isBackendRarity('mythic')).toBe(false);
    expect(isBackendRarity('EFortRarity::Transcendent')).toBe(false);
    expect(isBackendRarity(null)).toBe(false);
  });
});

describe('CosmeticSeries', () => {
  it('holds every series backend value the api returns', () => {
    expect(COSMETIC_SERIES).toHaveLength(37);
    expect(COSMETIC_SERIES).toEqual(Object.values(CosmeticSeries));
  });

  it('maps the non-obvious backend names', () => {
    expect(CosmeticSeries.Dark).toBe('CUBESeries');
    expect(CosmeticSeries.Icon).toBe('CreatorCollabSeries');
    expect(CosmeticSeries.GamingLegends).toBe('PlatformSeries');
    expect(CosmeticSeries.StarWars).toBe('ColumbusSeries');
    expect(CosmeticSeries.Puma).toBe('KittySeries');
    expect(CosmeticSeries.Dc).toBe('DCUSeries');
  });

  it('separates the vehicle-only variants of shared series', () => {
    expect(CosmeticSeries.DcVehicles).toBe('Series_DC');
    expect(CosmeticSeries.GamingLegendsVehicles).toBe('Series_GamingLegends');
    expect(CosmeticSeries.Dc).not.toBe(CosmeticSeries.DcVehicles);
  });

  it('exposes the vehicle manufacturer series', () => {
    expect(VEHICLE_SERIES).toHaveLength(21);
    expect(VEHICLE_SERIES).toContain(CosmeticSeries.Lamborghini);
    expect(VEHICLE_SERIES).toContain(CosmeticSeries.Ferrari);
    expect(VEHICLE_SERIES).toContain(CosmeticSeries.Tesla);
    expect(VEHICLE_SERIES).not.toContain(CosmeticSeries.Marvel);

    for (const series of VEHICLE_SERIES) {
      expect(isCosmeticSeries(series)).toBe(true);
    }
  });

  it('has unique backend values', () => {
    expect(new Set(COSMETIC_SERIES).size).toBe(COSMETIC_SERIES.length);
  });

  it('guards valid values', () => {
    for (const value of COSMETIC_SERIES) {
      expect(isCosmeticSeries(value)).toBe(true);
    }

    expect(isCosmeticSeries('MARVEL SERIES')).toBe(false);
    expect(isCosmeticSeries('marvelseries')).toBe(false);
    expect(isCosmeticSeries(null)).toBe(false);
  });
});

describe('StatsImage', () => {
  it('holds the expected wire values', () => {
    expect(StatsImage).toEqual({
      All: 'all',
      KeyboardMouse: 'keyboardMouse',
      Gamepad: 'gamepad',
      Touch: 'touch',
      None: 'none',
    });
  });

  it('exposes every value through STATS_IMAGES', () => {
    expect(STATS_IMAGES).toEqual(Object.values(StatsImage));
    expect(STATS_IMAGES).toHaveLength(5);
  });

  it('guards valid values', () => {
    for (const value of STATS_IMAGES) {
      expect(isStatsImage(value)).toBe(true);
    }
  });

  it('rejects garbage, wrong case, and non-strings', () => {
    expect(isStatsImage('keyboardmouse')).toBe(false);
    expect(isStatsImage('KeyboardMouse')).toBe(false);
    expect(isStatsImage('mouse')).toBe(false);
    expect(isStatsImage(true)).toBe(false);
    expect(isStatsImage(null)).toBe(false);
    expect(isStatsImage(undefined)).toBe(false);
  });
});

describe('TimeWindow', () => {
  it('holds the expected wire values', () => {
    expect(TimeWindow).toEqual({
      Lifetime: 'lifetime',
      Season: 'season',
    });
  });

  it('exposes every value through TIME_WINDOWS', () => {
    expect(TIME_WINDOWS).toEqual(Object.values(TimeWindow));
    expect(TIME_WINDOWS).toHaveLength(2);
  });

  it('guards valid values', () => {
    for (const value of TIME_WINDOWS) {
      expect(isTimeWindow(value)).toBe(true);
    }
  });

  it('rejects garbage, wrong case, and non-strings', () => {
    expect(isTimeWindow('Lifetime')).toBe(false);
    expect(isTimeWindow('alltime')).toBe(false);
    expect(isTimeWindow(0)).toBe(false);
    expect(isTimeWindow(null)).toBe(false);
    expect(isTimeWindow(undefined)).toBe(false);
  });
});

describe('CosmeticType', () => {
  it('maps types to their backend counterparts', () => {
    expect(COSMETIC_TYPE_BACKEND.outfit).toBe('AthenaCharacter');
    expect(COSMETIC_TYPE_BACKEND.emote).toBe('AthenaDance');
    expect(COSMETIC_TYPE_BACKEND.pet).toBe('AthenaPet');
    expect(COSMETIC_TYPE_BACKEND.petcarrier).toBe('AthenaPetCarrier');
    expect(COSMETIC_TYPE_BACKEND.shoe).toBe('CosmeticShoes');
    expect(COSMETIC_TYPE_BACKEND.legoset).toBe('JunoBuildingSet');
    expect(COSMETIC_TYPE_BACKEND.backpack).toBe('AthenaBackpack');
    expect(COSMETIC_TYPE_BACKEND.banner).toBe('BannerToken');
    expect(COSMETIC_TYPE_BACKEND.drifttrail).toBe('VehicleCosmetics_DriftTrail');
    expect(COSMETIC_TYPE_BACKEND.aura).toBe('SparksAura');
  });

  it('lists every key in COSMETIC_TYPES', () => {
    expect(COSMETIC_TYPES).toEqual(Object.keys(COSMETIC_TYPE_BACKEND));
    expect(COSMETIC_TYPES).toHaveLength(30);
    expect(COSMETIC_TYPES).toContain('outfit');
    expect(COSMETIC_TYPES).toContain('legoprop');
  });

  it('maps every key to itself', () => {
    expect(CosmeticType.outfit).toBe('outfit');
    for (const type of COSMETIC_TYPES) {
      expect(CosmeticType[type]).toBe(type);
    }
    expect(Object.keys(CosmeticType)).toEqual(COSMETIC_TYPES);
  });

  it('guards valid values', () => {
    for (const type of COSMETIC_TYPES) {
      expect(isCosmeticType(type)).toBe(true);
    }
  });

  it('rejects garbage, wrong case, and non-strings', () => {
    expect(isCosmeticType('Outfit')).toBe(false);
    expect(isCosmeticType('AthenaCharacter')).toBe(false);
    expect(isCosmeticType('hoverboard')).toBe(false);
    expect(isCosmeticType('')).toBe(false);
    expect(isCosmeticType(7)).toBe(false);
    expect(isCosmeticType(null)).toBe(false);
    expect(isCosmeticType(undefined)).toBe(false);
    expect(isCosmeticType({ outfit: true })).toBe(false);
  });

  it('converts to backend types', () => {
    expect(toBackendType('outfit')).toBe('AthenaCharacter');
    expect(toBackendType('emote')).toBe('AthenaDance');
    expect(toBackendType('legoset')).toBe('JunoBuildingSet');
  });

  it('round-trips every type through the backend mapping', () => {
    expect(new Set(Object.values(COSMETIC_TYPE_BACKEND)).size).toBe(COSMETIC_TYPES.length);
    for (const type of COSMETIC_TYPES) {
      expect(fromBackendType(toBackendType(type))).toBe(type);
    }
  });

  it('returns null for unknown backend values', () => {
    expect(fromBackendType('AthenaHoverboard')).toBeNull();
    expect(fromBackendType('athenacharacter')).toBeNull();
    expect(fromBackendType('outfit')).toBeNull();
    expect(fromBackendType('')).toBeNull();
  });
});

describe('ResponseFlags', () => {
  it('uses single-bit values', () => {
    expect(ResponseFlags.None).toBe(0);
    expect(ResponseFlags.Paths).toBe(1);
    expect(ResponseFlags.GameplayTags).toBe(2);
    expect(ResponseFlags.ShopHistory).toBe(4);
  });

  it('combines every flag into ALL_RESPONSE_FLAGS', () => {
    expect(ALL_RESPONSE_FLAGS).toBe(7);
  });

  describe('parseFlags', () => {
    it('passes numbers through', () => {
      expect(parseFlags(0)).toBe(0);
      expect(parseFlags(5)).toBe(5);
      expect(parseFlags(ALL_RESPONSE_FLAGS)).toBe(7);
    });

    it('truncates floats and rejects non-finite numbers', () => {
      expect(parseFlags(2.9)).toBe(2);
      expect(parseFlags(-2.9)).toBe(-2);
      expect(parseFlags('2.9')).toBe(2);
      expect(parseFlags(Number.NaN)).toBe(0);
      expect(parseFlags(Number.POSITIVE_INFINITY)).toBe(0);
    });

    it('parses hex strings in either case', () => {
      expect(parseFlags('0x7')).toBe(7);
      expect(parseFlags('0X7')).toBe(7);
      expect(parseFlags('0xFF')).toBe(255);
      expect(parseFlags('0Xff')).toBe(255);
    });

    it('parses decimal strings', () => {
      expect(parseFlags('7')).toBe(7);
      expect(parseFlags('0')).toBe(0);
    });

    it('ignores surrounding whitespace', () => {
      expect(parseFlags('  7  ')).toBe(7);
      expect(parseFlags('\t0x7\n')).toBe(7);
    });

    it('falls back to zero for garbage', () => {
      expect(parseFlags('garbage')).toBe(0);
      expect(parseFlags('')).toBe(0);
      expect(parseFlags('   ')).toBe(0);
      expect(parseFlags('0x')).toBe(0);
    });
  });

  describe('combineFlags', () => {
    it('ors numbers and hex strings together', () => {
      expect(combineFlags()).toBe(0);
      expect(combineFlags(ResponseFlags.Paths, ResponseFlags.ShopHistory)).toBe(5);
      expect(combineFlags('0x1', 2, '0X4')).toBe(7);
      expect(combineFlags('1', '2', '4')).toBe(7);
      expect(combineFlags(ResponseFlags.None, 'garbage')).toBe(0);
      expect(combineFlags(ResponseFlags.Paths, ResponseFlags.Paths)).toBe(1);
    });
  });

  describe('hasFlag', () => {
    it('detects set bits', () => {
      expect(hasFlag(7, ResponseFlags.Paths)).toBe(true);
      expect(hasFlag(7, ResponseFlags.GameplayTags)).toBe(true);
      expect(hasFlag(7, ResponseFlags.ShopHistory)).toBe(true);
      expect(hasFlag('0x5', ResponseFlags.ShopHistory)).toBe(true);
      expect(hasFlag('0x5', '0x1')).toBe(true);
    });

    it('detects unset bits', () => {
      expect(hasFlag(5, ResponseFlags.GameplayTags)).toBe(false);
      expect(hasFlag(0, ResponseFlags.Paths)).toBe(false);
      expect(hasFlag('garbage', ResponseFlags.Paths)).toBe(false);
    });

    it('never matches the zero flag', () => {
      expect(hasFlag(7, ResponseFlags.None)).toBe(false);
      expect(hasFlag(0, 0)).toBe(false);
      expect(hasFlag(7, '0x0')).toBe(false);
      expect(hasFlag(7, 'garbage')).toBe(false);
    });
  });

  describe('listFlags', () => {
    it('lists the matching flag names', () => {
      expect(listFlags(ALL_RESPONSE_FLAGS)).toEqual(['Paths', 'GameplayTags', 'ShopHistory']);
      expect(listFlags(5)).toEqual(['Paths', 'ShopHistory']);
      expect(listFlags('0x2')).toEqual(['GameplayTags']);
    });

    it('never includes None', () => {
      expect(listFlags(0)).toEqual([]);
      expect(listFlags('garbage')).toEqual([]);
      expect(listFlags(ALL_RESPONSE_FLAGS)).not.toContain('None');
    });
  });

  describe('formatFlags', () => {
    it('produces lowercase hex with a 0x prefix', () => {
      expect(formatFlags(0)).toBe('0x0');
      expect(formatFlags(ALL_RESPONSE_FLAGS)).toBe('0x7');
      expect(formatFlags(255)).toBe('0xff');
      expect(formatFlags('0XFF')).toBe('0xff');
      expect(formatFlags('garbage')).toBe('0x0');
    });
  });
});
