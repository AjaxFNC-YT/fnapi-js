import { AesEndpoint } from './endpoints/aes.js';
import { BannersEndpoint } from './endpoints/banners.js';
import type { ClientDefaults } from './endpoints/base.js';
import { CosmeticsEndpoint } from './endpoints/cosmetics.js';
import { CreatorCodeEndpoint } from './endpoints/creatorCode.js';
import { MapEndpoint } from './endpoints/map.js';
import { NewsEndpoint } from './endpoints/news.js';
import { PlaylistsEndpoint } from './endpoints/playlists.js';
import { ShopEndpoint } from './endpoints/shop.js';
import { StatsEndpoint } from './endpoints/stats.js';
import type { Language } from './enums.js';
import { RestClient } from './rest.js';
import type { FortniteAPIOptions } from './options.js';

export class FortniteAPI {
  public readonly rest: RestClient;
  public readonly aes: AesEndpoint;
  public readonly banners: BannersEndpoint;
  public readonly cosmetics: CosmeticsEndpoint;
  public readonly creatorCode: CreatorCodeEndpoint;
  public readonly sac: CreatorCodeEndpoint;
  public readonly map: MapEndpoint;
  public readonly news: NewsEndpoint;
  public readonly playlists: PlaylistsEndpoint;
  public readonly shop: ShopEndpoint;
  public readonly stats: StatsEndpoint;

  private readonly defaults: ClientDefaults;

  constructor(options: FortniteAPIOptions = {}) {
    this.rest = new RestClient(options);
    this.defaults = {};

    if (options.language !== undefined) this.defaults.language = options.language;
    if (options.responseFlags !== undefined) this.defaults.responseFlags = options.responseFlags;

    this.aes = new AesEndpoint(this.rest, this.defaults);
    this.banners = new BannersEndpoint(this.rest, this.defaults);
    this.cosmetics = new CosmeticsEndpoint(this.rest, this.defaults);
    this.creatorCode = new CreatorCodeEndpoint(this.rest, this.defaults);
    this.sac = this.creatorCode;
    this.map = new MapEndpoint(this.rest, this.defaults);
    this.news = new NewsEndpoint(this.rest, this.defaults);
    this.playlists = new PlaylistsEndpoint(this.rest, this.defaults);
    this.shop = new ShopEndpoint(this.rest, this.defaults);
    this.stats = new StatsEndpoint(this.rest, this.defaults);
  }

  get apiKey(): string | null {
    return this.rest.apiKey;
  }

  get language(): Language | undefined {
    return this.defaults.language;
  }

  get baseUrl(): string {
    return this.rest.baseUrl;
  }

  setApiKey(apiKey: string | null): this {
    this.rest.apiKey = apiKey;
    return this;
  }

  setLanguage(language: Language | undefined): this {
    this.defaults.language = language;
    return this;
  }

  setResponseFlags(responseFlags: number | string | undefined): this {
    this.defaults.responseFlags = responseFlags;
    return this;
  }

  setHeader(name: string, value: string): this {
    this.rest.setHeader(name, value);
    return this;
  }

  clearCache(): this {
    this.rest.cache.clear();
    return this;
  }
}
