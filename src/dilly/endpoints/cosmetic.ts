import { DillyEndpoint } from './base.js';
import { DillyRoutes } from '../routes.js';
import type { QueryParams } from '../../core/types.js';
import type { DillyBaseOptions, DillyCosmeticsOptions } from '../options.js';
import type { DillyBundlesResponse, DillyCosmeticsResponse } from '../types.js';

export class DillyCosmeticEndpoint extends DillyEndpoint {
  async list(options?: DillyCosmeticsOptions): Promise<DillyCosmeticsResponse> {
    return this.fetchRaw<DillyCosmeticsResponse>(
      DillyRoutes.cosmetics(),
      options,
      this.cosmeticQuery(options),
    );
  }

  async listNew(options?: DillyCosmeticsOptions): Promise<DillyCosmeticsResponse> {
    return this.fetchRaw<DillyCosmeticsResponse>(
      DillyRoutes.cosmeticsNew(),
      options,
      this.cosmeticQuery(options),
    );
  }

  async bundles(options?: DillyBaseOptions): Promise<DillyBundlesResponse> {
    return this.fetchRaw<DillyBundlesResponse>(DillyRoutes.cosmeticsBundles(), options);
  }

  async bundlesFrom(fromDate: string, options?: DillyBaseOptions): Promise<DillyBundlesResponse> {
    this.requireString(fromDate, 'fromDate');
    return this.fetchRaw<DillyBundlesResponse>(
      DillyRoutes.cosmeticsBundlesFrom(fromDate),
      options,
    );
  }

  private cosmeticQuery(options: DillyCosmeticsOptions | undefined): QueryParams {
    const query: QueryParams = {};
    if (options?.type !== undefined) query['Type'] = options.type;
    return query;
  }
}
