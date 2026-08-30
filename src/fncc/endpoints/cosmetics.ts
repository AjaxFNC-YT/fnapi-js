import { FnccEndpoint } from './base.js';
import { FnccRoutes } from '../routes.js';
import type { QueryParams } from '../../core/types.js';
import type { FnccBaseOptions, FnccCosmeticSearchOptions } from '../options.js';
import type {
  FnccCosmetic,
  FnccCosmeticCategories,
  FnccCosmeticSearchResponse,
  FnccCosmeticsByCategory,
} from '../types.js';

export class FnccCosmeticsEndpoint extends FnccEndpoint {
  async all(options?: FnccBaseOptions): Promise<FnccCosmeticsByCategory> {
    return this.fetchData<FnccCosmeticsByCategory>(FnccRoutes.cosmetics(), options);
  }

  async categories(options?: FnccBaseOptions): Promise<FnccCosmeticCategories> {
    return this.fetchData<FnccCosmeticCategories>(FnccRoutes.cosmeticsCategories(), options);
  }

  async category(category: string, options?: FnccBaseOptions): Promise<FnccCosmetic[]> {
    this.requireString(category, 'category');
    return this.fetchData<FnccCosmetic[]>(FnccRoutes.cosmeticsCategory(category), options);
  }

  async get(category: string, id: string, options?: FnccBaseOptions): Promise<FnccCosmetic> {
    this.requireString(category, 'category');
    this.requireString(id, 'id');
    return this.fetchData<FnccCosmetic>(FnccRoutes.cosmetic(category, id), options);
  }

  async search(
    category: string,
    options?: FnccCosmeticSearchOptions,
  ): Promise<FnccCosmeticSearchResponse> {
    this.requireString(category, 'category');
    return this.fetchRaw<FnccCosmeticSearchResponse>(
      FnccRoutes.cosmeticsCategorySearch(category),
      options,
      this.searchQuery(options),
    );
  }

  private searchQuery(options: FnccCosmeticSearchOptions | undefined): QueryParams {
    const query: QueryParams = {};
    if (options?.name !== undefined) query['name'] = options.name;
    if (options?.description !== undefined) query['description'] = options.description;
    if (options?.id !== undefined) query['id'] = options.id;
    if (options?.artist !== undefined) query['artist'] = options.artist;
    if (options?.album !== undefined) query['album'] = options.album;
    if (options?.type !== undefined) query['type'] = options.type;
    if (options?.rarity !== undefined) query['rarity'] = options.rarity;
    if (options?.series !== undefined) query['series'] = options.series;
    if (options?.set !== undefined) query['set'] = options.set;
    if (options?.introduction !== undefined) query['introduction'] = options.introduction;
    if (options?.matchMethod !== undefined) query['matchMethod'] = options.matchMethod;
    if (options?.limit !== undefined) query['limit'] = options.limit;
    if (options?.offset !== undefined) query['offset'] = options.offset;
    return query;
  }
}
