import { FnccEndpoint } from './base.js';
import { FnccRoutes } from '../routes.js';
import type { QueryParams } from '../../core/types.js';
import type { FnccBaseOptions, FnccBundlesOptions } from '../options.js';
import type { FnccBundle, FnccBundlesResponse } from '../types.js';

export class FnccBundlesEndpoint extends FnccEndpoint {
  async list(options?: FnccBundlesOptions): Promise<FnccBundlesResponse> {
    const query: QueryParams = {};
    if (options?.q !== undefined) query['q'] = options.q;
    if (options?.item !== undefined) query['item'] = options.item;
    if (options?.seen !== undefined) query['seen'] = options.seen;
    if (options?.inShop !== undefined) query['inShop'] = options.inShop;
    if (options?.limit !== undefined) query['limit'] = options.limit;
    if (options?.offset !== undefined) query['offset'] = options.offset;
    return this.fetchRaw<FnccBundlesResponse>(FnccRoutes.bundles(), options, query);
  }

  async get(id: string, options?: FnccBaseOptions): Promise<FnccBundle> {
    this.requireString(id, 'id');
    return this.fetchData<FnccBundle>(FnccRoutes.bundle(id), options);
  }
}
