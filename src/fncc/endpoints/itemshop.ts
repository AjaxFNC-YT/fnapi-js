import { FnccEndpoint } from './base.js';
import { FnccRoutes } from '../routes.js';
import type { QueryParams } from '../../core/types.js';
import type { FnccBaseOptions, FnccItemShopOptions } from '../options.js';
import type { FnccItemShop, FnccItemShopSections } from '../types.js';

export class FnccItemShopEndpoint extends FnccEndpoint {
  async current(options?: FnccItemShopOptions): Promise<FnccItemShop> {
    const query: QueryParams = {};
    if (options?.section !== undefined) query['section'] = options.section;
    return this.fetchRaw<FnccItemShop>(FnccRoutes.itemshop(), options, query);
  }

  async sections(options?: FnccBaseOptions): Promise<FnccItemShopSections> {
    return this.fetchRaw<FnccItemShopSections>(FnccRoutes.itemshopSections(), options);
  }
}
