export const FNCC_BASE_URL = 'https://prod.fn-api.cc';

export const FnccRoutes = {
  status: () => '/v1/status',
  statusDownload: () => '/v1/status/download',
  statusMaintenance: () => '/v1/status/maintenance',
  statusParser: () => '/v1/status/parser',

  aes: () => '/v1/aes',
  mappings: () => '/v1/mappings',
  version: () => '/v1/version',

  cosmetics: () => '/v1/cosmetics',
  cosmeticsCategories: () => '/v1/cosmetics/categories',
  cosmeticsTypes: () => '/v1/cosmetics/types',
  cosmeticsCategory: (category: string) => `/v1/cosmetics/${encodeURIComponent(category)}`,
  cosmeticsCategorySearch: (category: string) =>
    `/v1/cosmetics/${encodeURIComponent(category)}/search`,
  cosmetic: (category: string, id: string) =>
    `/v1/cosmetics/${encodeURIComponent(category)}/${encodeURIComponent(id)}`,

  rarities: () => '/v1/rarities',

  banners: () => '/v1/banners',
  bannerColors: () => '/v1/banners/colors',

  sprites: () => '/v1/sprites',
  sprite: (id: string) => `/v1/sprites/${encodeURIComponent(id)}`,

  search: () => '/v1/search',
  searchContent: () => '/v1/search/content',

  assets: () => '/v1/assets',
  assetsSearch: () => '/v1/assets/search',
  assetsPaths: () => '/v1/assets/paths',
  assetsFixPath: () => '/v1/assets/fix-path',
  assetsExports: () => '/v1/assets/exports',
  assetsJson: () => '/v1/assets/json',
  assetsRaw: () => '/v1/assets/raw',
  assetsPackage: () => '/v1/assets/package',
  assetsArchives: () => '/v1/assets/archives',

  images: () => '/v1/images',

  anticheat: () => '/v1/anticheat',
  anticheatFile: (name: string) => `/v1/anticheat/files/${encodeURIComponent(name)}`,

  cloudstorage: () => '/v1/cloudstorage',
  cloudstorageFile: (filename: string) => `/v1/cloudstorage/${encodeURIComponent(filename)}`,

  discovery: () => '/v1/discovery',
  discoverySurface: (surface: string) => `/v1/discovery/${encodeURIComponent(surface)}`,

  fish: () => '/v1/fish',
  fishById: (id: string) => `/v1/fish/${encodeURIComponent(id)}`,

  itemshop: () => '/v1/itemshop',
  itemshopSections: () => '/v1/itemshop/sections',

  lightswitch: () => '/v1/lightswitch',
  lightswitchService: (service: string) => `/v1/lightswitch/${encodeURIComponent(service)}`,

  lookup: () => '/v1/lookup',

  mnemonic: () => '/v1/mnemonic',
  mnemonicByKey: (mnemonic: string) => `/v1/mnemonic/${encodeURIComponent(mnemonic)}`,

  news: () => '/v1/news',
  newsFeed: (feed: string) => `/v1/news/${encodeURIComponent(feed)}`,

  playlists: () => '/v1/playlists',
  playlist: (id: string) => `/v1/playlists/${encodeURIComponent(id)}`,

  weapons: () => '/v1/weapons',
  weaponsCategories: () => '/v1/weapons/categories',
  weapon: (id: string) => `/v1/weapons/${encodeURIComponent(id)}`,

  lootpools: () => '/v1/lootpool',
  lootpoolsAll: () => '/v1/lootpool/all',
  lootpoolSearch: () => '/v1/lootpool/search',
  lootpoolItem: (item: string) => `/v1/lootpool/items/${encodeURIComponent(item)}`,
  lootpool: (id: string) => `/v1/lootpool/${encodeURIComponent(id)}`,
  lootpoolContainers: (id: string) => `/v1/lootpool/${encodeURIComponent(id)}/containers`,
  lootpoolContainer: (id: string, container: string) =>
    `/v1/lootpool/${encodeURIComponent(id)}/containers/${encodeURIComponent(container)}`,

  shorten: () => '/v1/shorten',
  shortenStats: () => '/v1/shorten/stats',

  seasons: () => '/v1/seasons',
  season: (season: string) => `/v1/seasons/${encodeURIComponent(season)}`,

  battlepasses: () => '/v1/battlepasses',
  battlepass: (pass: string) => `/v1/battlepasses/${encodeURIComponent(pass)}`,

  bundles: () => '/v1/bundles',
  bundle: (id: string) => `/v1/bundles/${encodeURIComponent(id)}`,

  modes: () => '/v1/modes',
  mode: (id: string) => `/v1/modes/${encodeURIComponent(id)}`,

  quests: () => '/v1/quests',
  questCategories: () => '/v1/quests/categories',
  questBundles: () => '/v1/quests/bundles',
  questsStw: () => '/v1/quests/stw',
  questLookup: () => '/v1/quests/lookup',
  quest: (templateId: string) => `/v1/quests/${encodeURIComponent(templateId)}`,
} as const;
