import { FnccEndpoint } from './base.js';
import { FnccRoutes } from '../routes.js';
import type { FnccBaseOptions } from '../options.js';
import type { FnccSeason } from '../types.js';

export class FnccSeasonsEndpoint extends FnccEndpoint {
  async list(options?: FnccBaseOptions): Promise<FnccSeason[]> {
    return this.fetchData<FnccSeason[]>(FnccRoutes.seasons(), options);
  }

  async get(season: string | number, options?: FnccBaseOptions): Promise<FnccSeason> {
    const key = typeof season === 'number' ? String(season) : this.requireString(season, 'season');
    return this.fetchData<FnccSeason>(FnccRoutes.season(key), options);
  }

  async current(options?: FnccBaseOptions): Promise<FnccSeason> {
    return this.get('current', options);
  }
}
