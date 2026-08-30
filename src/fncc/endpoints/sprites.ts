import { FnccEndpoint } from './base.js';
import { FnccRoutes } from '../routes.js';
import type { QueryParams } from '../../core/types.js';
import type { FnccSpritesOptions, FnccBaseOptions } from '../options.js';
import type { FnccSprite, FnccSpritesResponse } from '../types.js';

export class FnccSpritesEndpoint extends FnccEndpoint {
  async list(options?: FnccSpritesOptions): Promise<FnccSpritesResponse> {
    return this.fetchRaw<FnccSpritesResponse>(
      FnccRoutes.sprites(),
      options,
      this.listQuery(options),
    );
  }

  async get(id: string, options?: FnccBaseOptions): Promise<FnccSprite> {
    this.requireString(id, 'id');
    return this.fetchData<FnccSprite>(FnccRoutes.sprite(id), options);
  }

  private listQuery(options: FnccSpritesOptions | undefined): QueryParams {
    const query: QueryParams = {};
    if (options?.enabled !== undefined) query['enabled'] = options.enabled;
    if (options?.library !== undefined) query['library'] = options.library;
    return query;
  }
}
