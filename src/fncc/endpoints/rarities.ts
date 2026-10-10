import { FnccEndpoint } from './base.js';
import { FnccRoutes } from '../routes.js';
import type { FnccBaseOptions } from '../options.js';
import type { FnccRarityTier } from '../types.js';

export class FnccRaritiesEndpoint extends FnccEndpoint {
  async list(options?: FnccBaseOptions): Promise<FnccRarityTier[]> {
    return this.fetchData<FnccRarityTier[]>(FnccRoutes.rarities(), options);
  }
}
