import type {
  Aes,
  Banner,
  BannerColor,
  AllCosmetics,
  BeanCosmetic,
  BrCosmetic,
  CarCosmetic,
  InstrumentCosmetic,
  LegoCosmetic,
  LegoKitCosmetic,
  NewCosmetics,
  TrackCosmetic,
  CreatorCode,
  GameMap,
  GameModeNews,
  News,
  Playlist,
  Shop,
  ShopEntry,
  BrStats,
  GameModeStats,
} from '../../src/fortnite/types.js';
export const aesFixture: Aes = {
  build: '++Fortnite+Release-41.30-CL-56430492',
  mainKey: 'a738f2342c2e90dc3377b06f089214dce13db08fb3b74e8ecc817308d5d39e6d',
  dynamicKeys: [
    {
      pakFilename: 'pakchunk1006-WindowsClient.ucas',
      pakGuid: '3AE64B8EFF45E9F5A32208648302B353',
      key: '788f326dee7eeb624b771308bf8b0087afef2340090e5c03b65571ce5767d236',
    },
    {
      pakFilename: 'pakchunk1007-WindowsClient.ucas',
      pakGuid: '7B5631A5A34395005B477A7DAB20808E',
      key: '52a1a04796d189e30aebc9161eba4df13259bfa78ce6dd99e83c0c1876c011a9',
    },
  ],
};

export const brCosmeticFixture: BrCosmetic = {
  id: 'CID_028_Athena_Commando_F',
  name: 'Renegade Raider',
  description: 'Rare outfit from the wasteland.',
  type: { value: 'outfit', displayValue: 'Outfit', backendValue: 'AthenaCharacter' },
  rarity: { value: 'rare', displayValue: 'Rare', backendValue: 'EFortRarity::Rare' },
  series: null,
  set: null,
  introduction: {
    chapter: '1',
    season: '1',
    text: 'Introduced in Chapter 1, Season 1.',
    backendValue: 1,
  },
  images: {
    smallIcon: 'https://fortnite-api.com/images/cosmetics/br/cid_028/smallicon.png',
    icon: 'https://fortnite-api.com/images/cosmetics/br/cid_028/icon.png',
    featured: 'https://fortnite-api.com/images/cosmetics/br/cid_028/featured.png',
  },
  variants: null,
  gameplayTags: ['Cosmetics.Source.ItemShop'],
  metaTags: null,
  showcaseVideo: null,
  path: 'FortniteGame/Content/Athena/Items/Cosmetics/Characters/CID_028_Athena_Commando_F',
  added: '2019-10-11T00:00:00Z',
  shopHistory: ['2018-06-10T00:00:00Z'],
};

export const secondBrCosmeticFixture: BrCosmetic = {
  ...brCosmeticFixture,
  id: 'CID_029_Athena_Commando_F_Halloween',
  name: 'Ghoul Trooper',
  rarity: { value: 'epic', displayValue: 'Epic', backendValue: 'EFortRarity::Epic' },
};

export const trackFixture: TrackCosmetic = {
  id: 'SID_Placeholder_1',
  devName: 'Placeholder Track',
  title: 'Placeholder',
  artist: 'Test Artist',
  album: null,
  releaseYear: 2024,
  bpm: 120,
  duration: 180,
  difficulty: {
    vocals: 1,
    guitar: 2,
    bass: 3,
    plasticBass: 4,
    drums: 5,
    plasticDrums: 6,
  },
  albumArt: 'https://fortnite-api.com/images/tracks/placeholder.png',
  added: '2024-01-01T00:00:00Z',
};

export const instrumentFixture: InstrumentCosmetic = {
  id: 'Sparks_Guitar_Placeholder',
  name: 'Test Guitar',
  description: 'A guitar.',
  type: { value: 'guitar', displayValue: 'Guitar', backendValue: 'SparksGuitar' },
  rarity: { value: 'rare', displayValue: 'Rare', backendValue: 'EFortRarity::Rare' },
  images: {
    small: 'https://fortnite-api.com/images/instruments/small.png',
    large: 'https://fortnite-api.com/images/instruments/large.png',
  },
  added: '2024-01-01T00:00:00Z',
};

export const carFixture: CarCosmetic = {
  id: 'Body_Placeholder',
  vehicleId: 'Vehicle_Placeholder',
  name: 'Test Body',
  description: 'A car body.',
  type: { value: 'body', displayValue: 'Body', backendValue: 'VehicleCosmetics_Body' },
  rarity: { value: 'epic', displayValue: 'Epic', backendValue: 'EFortRarity::Epic' },
  images: {
    small: 'https://fortnite-api.com/images/cars/small.png',
    large: 'https://fortnite-api.com/images/cars/large.png',
  },
  added: '2024-01-01T00:00:00Z',
};

export const legoFixture: LegoCosmetic = {
  id: 'Lego_Placeholder',
  cosmeticId: 'CID_028_Athena_Commando_F',
  images: {
    small: 'https://fortnite-api.com/images/lego/small.png',
    large: 'https://fortnite-api.com/images/lego/large.png',
    wide: 'https://fortnite-api.com/images/lego/wide.png',
  },
  added: '2024-01-01T00:00:00Z',
};

export const legoKitFixture: LegoKitCosmetic = {
  id: 'LegoKit_Placeholder',
  name: 'Test Kit',
  type: { value: 'legoset', displayValue: 'Build', backendValue: 'JunoBuildingSet' },
  images: {
    small: 'https://fortnite-api.com/images/legokits/small.png',
    large: 'https://fortnite-api.com/images/legokits/large.png',
    wide: 'https://fortnite-api.com/images/legokits/wide.png',
  },
  added: '2024-01-01T00:00:00Z',
};

export const beanFixture: BeanCosmetic = {
  id: 'Bean_Placeholder',
  cosmeticId: 'CID_028_Athena_Commando_F',
  name: 'Test Bean',
  gender: 'Female',
  images: {
    small: 'https://fortnite-api.com/images/beans/small.png',
    large: 'https://fortnite-api.com/images/beans/large.png',
  },
  added: '2024-01-01T00:00:00Z',
};

export const allCosmeticsFixture: AllCosmetics = {
  br: [brCosmeticFixture, secondBrCosmeticFixture],
  tracks: [trackFixture],
  instruments: [instrumentFixture],
  cars: [carFixture],
  lego: [legoFixture],
  legoKits: [legoKitFixture],
  beans: [beanFixture],
};

export const newCosmeticsFixture: NewCosmetics = {
  date: '2026-07-30T08:00:00Z',
  build: '++Fortnite+Release-41.30-CL-56430492',
  previousBuild: '++Fortnite+Release-41.20-CL-55550516',
  hashes: { all: 'hash-all', br: 'hash-br' },
  lastAdditions: { all: '2026-07-30T08:00:00Z', br: '2026-07-30T08:00:00Z' },
  items: { br: [brCosmeticFixture] },
};

export const bannerFixture: Banner = {
  id: 'standardbanner1',
  devName: 'Standard Banner 1',
  name: 'Standard Banner',
  description: 'A standard banner.',
  category: null,
  fullUsageRights: true,
  images: {
    smallIcon: 'https://fortnite-api.com/images/banners/small.png',
    icon: 'https://fortnite-api.com/images/banners/icon.png',
  },
};

export const bannerColorFixture: BannerColor = {
  id: 'defaultcolor1',
  color: '#ffffff',
  category: 'Standard',
  subCategoryGroup: 1,
};

export const creatorCodeFixture: CreatorCode = {
  code: 'ninja',
  account: { id: '4735ce9132924caf8a5b17789b40f79c', name: 'Ninja' },
  status: 'ACTIVE',
  verified: false,
};

export const mapFixture: GameMap = {
  images: {
    blank: 'https://fortnite-api.com/images/map.png',
    pois: 'https://fortnite-api.com/images/map-pois.png',
  },
  pois: [
    { id: 'Athena.Location.POI.Placeholder', name: 'Test POI', location: { x: 1, y: 2, z: 3 } },
    { id: 'Athena.Location.POI.Second', name: 'Second POI', location: { x: 4, y: 5, z: 6 } },
  ],
};

export const brNewsFixture: GameModeNews = {
  hash: 'br-hash',
  date: '2026-07-30T08:00:00Z',
  image: null,
  motds: [
    {
      id: 'motd-1',
      title: 'Test MOTD',
      tabTitle: 'Test',
      body: 'Body text',
      image: 'https://fortnite-api.com/images/news/motd.png',
      tileImage: 'https://fortnite-api.com/images/news/tile.png',
      sortingPriority: 10,
      hidden: false,
    },
  ],
};

export const newsFixture: News = {
  br: brNewsFixture,
  stw: {
    hash: 'stw-hash',
    date: '2026-07-30T08:00:00Z',
    messages: [
      {
        title: 'STW Message',
        body: 'Body',
        image: 'https://fortnite-api.com/images/news/stw.png',
      },
    ],
  },
};

export const playlistFixture: Playlist = {
  id: 'playlist_defaultsolo',
  name: 'Solo',
  subName: null,
  description: 'Solo battle royale.',
  gameType: 'BR',
  ratingType: 'br',
  minPlayers: 1,
  maxPlayers: 100,
  maxTeams: 100,
  maxTeamSize: 1,
  maxSquads: 100,
  maxSquadSize: 1,
  isDefault: true,
  isTournament: false,
  isLimitedTimeMode: false,
  isLargeTeamGame: false,
  accumulateToProfileStats: true,
  images: { showcase: null, missionIcon: null },
  path: 'FortniteGame/Content/Athena/Playlists/Playlist_DefaultSolo',
  added: '2019-10-11T00:00:00Z',
};

export const shopEntryFixture: ShopEntry = {
  regularPrice: 1500,
  finalPrice: 1500,
  devName: '[VIRTUAL]1 x Renegade Raider for 1500 MtxCurrency',
  offerId: 'v2:/offer-1',
  inDate: '2026-08-19T00:00:00Z',
  outDate: '2026-08-20T23:59:59Z',
  giftable: true,
  refundable: true,
  sortPriority: 0,
  layoutId: 'Outfits.1',
  layout: {
    id: 'Outfits',
    name: 'Outfits',
    index: 0,
    rank: 0,
    showIneligibleOffers: 'always',
    useWidePreview: false,
    displayType: 'tileGroup',
  },
  tileSize: 'Size_1_x_1',
  brItems: [brCosmeticFixture],
};

export const secondShopEntryFixture: ShopEntry = {
  ...shopEntryFixture,
  offerId: 'v2:/offer-2',
  layoutId: 'Emotes.1',
  layout: { ...shopEntryFixture.layout!, id: 'Emotes', name: 'Emotes' },
  brItems: [secondBrCosmeticFixture],
};

export const shopFixture: Shop = {
  hash: 'shop-hash',
  date: '2026-08-19T00:00:00Z',
  vbuckIcon: 'https://fortnite-api.com/images/vbuck.png',
  entries: [shopEntryFixture, secondShopEntryFixture],
};

const gameModeStatsFixture: GameModeStats = {
  score: 1000,
  scorePerMin: 1.5,
  scorePerMatch: 10,
  wins: 5,
  top10: 20,
  top25: 40,
  kills: 100,
  killsPerMin: 0.5,
  killsPerMatch: 1.2,
  deaths: 80,
  kd: 1.25,
  matches: 85,
  winRate: 5.88,
  minutesPlayed: 600,
  playersOutlived: 900,
  lastModified: '2026-08-01T00:00:00Z',
};

export const statsFixture: BrStats = {
  account: { id: '4735ce9132924caf8a5b17789b40f79c', name: 'Ninja' },
  battlePass: { level: 100, progress: 50 },
  image: null,
  stats: {
    all: {
      overall: gameModeStatsFixture,
      solo: gameModeStatsFixture,
      duo: gameModeStatsFixture,
      trio: null,
      squad: gameModeStatsFixture,
      ltm: null,
    },
    keyboardMouse: null,
    gamepad: null,
    touch: null,
  },
};
