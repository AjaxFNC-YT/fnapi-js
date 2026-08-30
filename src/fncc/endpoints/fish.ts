import { FnccEndpoint } from './base.js';
import { FnccRoutes } from '../routes.js';
import type { QueryParams } from '../../core/types.js';
import type { FnccBaseOptions, FnccFishOptions } from '../options.js';
import type { FnccFish } from '../types.js';

export class FnccFishEndpoint extends FnccEndpoint {
  async list(options?: FnccFishOptions): Promise<FnccFish[]> {
    return this.fetchData<FnccFish[]>(FnccRoutes.fish(), options, this.query(options));
  }

  async get(id: string, options?: FnccBaseOptions): Promise<FnccFish> {
    this.requireString(id, 'id');
    return this.fetchData<FnccFish>(FnccRoutes.fishById(id), options);
  }

  private query(options: FnccFishOptions | undefined): QueryParams {
    const query: QueryParams = {};
    if (options?.search !== undefined) query['search'] = options.search;
    if (options?.rarity !== undefined) query['rarity'] = options.rarity;
    if (options?.enabled !== undefined) query['enabled'] = options.enabled;
    if (options?.needsProFishingRod !== undefined) {
      query['needsProFishingRod'] = options.needsProFishingRod;
    }
    return query;
  }
}
