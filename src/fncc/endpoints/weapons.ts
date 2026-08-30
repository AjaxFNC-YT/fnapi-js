import { FnccEndpoint } from './base.js';
import { FnccRoutes } from '../routes.js';
import type { QueryParams } from '../../core/types.js';
import type { FnccBaseOptions, FnccWeaponOptions, FnccWeaponsOptions } from '../options.js';
import type { FnccWeapon, FnccWeaponFilters, FnccWeaponsResponse } from '../types.js';

export class FnccWeaponsEndpoint extends FnccEndpoint {
  async list(options?: FnccWeaponsOptions): Promise<FnccWeaponsResponse> {
    return this.fetchRaw<FnccWeaponsResponse>(FnccRoutes.weapons(), options, this.query(options));
  }

  async categories(options?: FnccBaseOptions): Promise<FnccWeaponFilters> {
    return this.fetchData<FnccWeaponFilters>(FnccRoutes.weaponsCategories(), options);
  }

  async get(id: string, options?: FnccWeaponOptions): Promise<FnccWeapon> {
    this.requireString(id, 'id');
    const query: QueryParams = {};
    if (options?.includeRaw !== undefined) query['includeRaw'] = options.includeRaw;
    return this.fetchData<FnccWeapon>(FnccRoutes.weapon(id), options, query);
  }

  private query(options: FnccWeaponsOptions | undefined): QueryParams {
    const query: QueryParams = {};
    if (options?.search !== undefined) query['search'] = options.search;
    if (options?.category !== undefined) query['category'] = options.category;
    if (options?.rarity !== undefined) query['rarity'] = options.rarity;
    if (options?.ammo !== undefined) query['ammo'] = options.ammo;
    if (options?.trigger !== undefined) query['trigger'] = options.trigger;
    if (options?.type !== undefined) query['type'] = options.type;
    if (options?.tag !== undefined) query['tag'] = options.tag;
    if (options?.ranged !== undefined) query['ranged'] = options.ranged;
    if (options?.melee !== undefined) query['melee'] = options.melee;
    if (options?.hasIcon !== undefined) query['hasIcon'] = options.hasIcon;
    if (options?.hasStats !== undefined) query['hasStats'] = options.hasStats;
    if (options?.sort !== undefined) query['sort'] = options.sort;
    if (options?.order !== undefined) query['order'] = options.order;
    if (options?.limit !== undefined) query['limit'] = options.limit;
    if (options?.offset !== undefined) query['offset'] = options.offset;
    return query;
  }
}
