import { RestClient } from '../fortnite/rest.js';
import { FNCC_BASE_URL } from './routes.js';
import type { FnccAPIOptions } from './options.js';
import { FnccStatusEndpoint } from './endpoints/status.js';
import { FnccGameEndpoint } from './endpoints/game.js';
import { FnccCosmeticsEndpoint } from './endpoints/cosmetics.js';
import { FnccBannersEndpoint } from './endpoints/banners.js';
import { FnccSpritesEndpoint } from './endpoints/sprites.js';
import { FnccSearchEndpoint } from './endpoints/search.js';
import { FnccAssetsEndpoint } from './endpoints/assets.js';
import { FnccImagesEndpoint } from './endpoints/images.js';
import { FnccAntiCheatEndpoint } from './endpoints/anticheat.js';
import { FnccCloudStorageEndpoint } from './endpoints/cloudstorage.js';
import { FnccDiscoveryEndpoint } from './endpoints/discovery.js';
import { FnccFishEndpoint } from './endpoints/fish.js';
import { FnccItemShopEndpoint } from './endpoints/itemshop.js';
import { FnccLightswitchEndpoint } from './endpoints/lightswitch.js';
import { FnccLookupEndpoint } from './endpoints/lookup.js';
import { FnccMnemonicEndpoint } from './endpoints/mnemonic.js';
import { FnccNewsEndpoint } from './endpoints/news.js';
import { FnccPlaylistsEndpoint } from './endpoints/playlists.js';
import { FnccWeaponsEndpoint } from './endpoints/weapons.js';
import { FnccRaritiesEndpoint } from './endpoints/rarities.js';
import { FnccLootPoolEndpoint } from './endpoints/lootpool.js';
import { FnccSeasonsEndpoint } from './endpoints/seasons.js';
import { FnccBattlePassesEndpoint } from './endpoints/battlepasses.js';
import { FnccBundlesEndpoint } from './endpoints/bundles.js';
import { FnccModesEndpoint } from './endpoints/modes.js';
import { FnccShortenEndpoint } from './endpoints/shorten.js';
import { FnccQuestsEndpoint } from './endpoints/quests.js';

export class FnccAPI {
  public readonly rest: RestClient;

  public readonly status: FnccStatusEndpoint;
  public readonly game: FnccGameEndpoint;
  public readonly cosmetics: FnccCosmeticsEndpoint;
  public readonly banners: FnccBannersEndpoint;
  public readonly sprites: FnccSpritesEndpoint;
  public readonly search: FnccSearchEndpoint;
  public readonly assets: FnccAssetsEndpoint;
  public readonly images: FnccImagesEndpoint;
  public readonly anticheat: FnccAntiCheatEndpoint;
  public readonly cloudstorage: FnccCloudStorageEndpoint;
  public readonly discovery: FnccDiscoveryEndpoint;
  public readonly fish: FnccFishEndpoint;
  public readonly itemshop: FnccItemShopEndpoint;
  public readonly lightswitch: FnccLightswitchEndpoint;
  public readonly lookup: FnccLookupEndpoint;
  public readonly mnemonic: FnccMnemonicEndpoint;
  public readonly news: FnccNewsEndpoint;
  public readonly playlists: FnccPlaylistsEndpoint;
  public readonly weapons: FnccWeaponsEndpoint;
  public readonly rarities: FnccRaritiesEndpoint;
  public readonly lootpool: FnccLootPoolEndpoint;
  public readonly seasons: FnccSeasonsEndpoint;
  public readonly battlepasses: FnccBattlePassesEndpoint;
  public readonly bundles: FnccBundlesEndpoint;
  public readonly modes: FnccModesEndpoint;
  public readonly shorten: FnccShortenEndpoint;
  public readonly quests: FnccQuestsEndpoint;

  constructor(options: FnccAPIOptions = {}) {
    this.rest = new RestClient({
      baseUrl: options.baseUrl ?? FNCC_BASE_URL,
      timeout: options.timeout,
      headers: options.headers,
      query: options.query,
      retry: options.retry,
      cache: options.cache,
      fetch: options.fetch,
      userAgent: options.userAgent,
    });

    this.status = new FnccStatusEndpoint(this.rest);
    this.game = new FnccGameEndpoint(this.rest);
    this.cosmetics = new FnccCosmeticsEndpoint(this.rest);
    this.banners = new FnccBannersEndpoint(this.rest);
    this.sprites = new FnccSpritesEndpoint(this.rest);
    this.search = new FnccSearchEndpoint(this.rest);
    this.assets = new FnccAssetsEndpoint(this.rest);
    this.images = new FnccImagesEndpoint(this.rest);
    this.anticheat = new FnccAntiCheatEndpoint(this.rest);
    this.cloudstorage = new FnccCloudStorageEndpoint(this.rest);
    this.discovery = new FnccDiscoveryEndpoint(this.rest);
    this.fish = new FnccFishEndpoint(this.rest);
    this.itemshop = new FnccItemShopEndpoint(this.rest);
    this.lightswitch = new FnccLightswitchEndpoint(this.rest);
    this.lookup = new FnccLookupEndpoint(this.rest);
    this.mnemonic = new FnccMnemonicEndpoint(this.rest);
    this.news = new FnccNewsEndpoint(this.rest);
    this.playlists = new FnccPlaylistsEndpoint(this.rest);
    this.weapons = new FnccWeaponsEndpoint(this.rest);
    this.rarities = new FnccRaritiesEndpoint(this.rest);
    this.lootpool = new FnccLootPoolEndpoint(this.rest);
    this.seasons = new FnccSeasonsEndpoint(this.rest);
    this.battlepasses = new FnccBattlePassesEndpoint(this.rest);
    this.bundles = new FnccBundlesEndpoint(this.rest);
    this.modes = new FnccModesEndpoint(this.rest);
    this.shorten = new FnccShortenEndpoint(this.rest);
    this.quests = new FnccQuestsEndpoint(this.rest);
  }

  version(...args: Parameters<FnccGameEndpoint['version']>) {
    return this.game.version(...args);
  }

  aes(...args: Parameters<FnccGameEndpoint['aes']>) {
    return this.game.aes(...args);
  }

  mappings(...args: Parameters<FnccGameEndpoint['mappings']>) {
    return this.game.mappings(...args);
  }
}
