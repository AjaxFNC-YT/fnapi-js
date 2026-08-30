import { Routes } from '../routes.js';
import type { GameMap, Poi } from '../types.js';
import type { LanguageOptions } from '../options.js';
import { BaseEndpoint } from './base.js';

export class MapEndpoint extends BaseEndpoint {
  get(options?: LanguageOptions): Promise<GameMap> {
    return this.fetchData<GameMap>(Routes.map(), options, this.languageQuery(options));
  }

  async pois(options?: LanguageOptions): Promise<Poi[]> {
    const map = await this.get(options);
    return map.pois;
  }

  async poiById(poiId: string, options?: LanguageOptions): Promise<Poi | null> {
    this.requireString(poiId, 'poiId');
    const pois = await this.pois(options);
    return pois.find((poi) => poi.id === poiId) ?? null;
  }
}
