import { FnccEndpoint } from './base.js';
import { FnccRoutes } from '../routes.js';
import { ValidationError } from '../../core/errors.js';
import type { QueryParams } from '../../core/types.js';
import type { FnccBaseOptions, FnccCosmeticSearchOptions } from '../options.js';
import type {
  FnccBean,
  FnccCatalogItem,
  FnccCosmetic,
  FnccCosmeticCategories,
  FnccCosmeticSearchAllResponse,
  FnccCosmeticSearchResponse,
  FnccCosmeticsByCategory,
  FnccCosmeticType,
  FnccTrack,
} from '../types.js';

const SEARCH_KEYS = [
  'search',
  'name',
  'description',
  'id',
  'artist',
  'album',
  'type',
  'rarity',
  'series',
  'set',
  'introduction',
  'matchMethod',
  'limit',
  'offset',
] as const;

const FILTER_KEYS = SEARCH_KEYS.filter((key) => key !== 'matchMethod' && key !== 'limit' && key !== 'offset');

export class FnccCosmeticsEndpoint extends FnccEndpoint {
  async all(options?: FnccBaseOptions): Promise<FnccCosmeticsByCategory> {
    return this.fetchData<FnccCosmeticsByCategory>(FnccRoutes.cosmetics(), options);
  }

  async searchAll(options: FnccCosmeticSearchOptions): Promise<FnccCosmeticSearchAllResponse> {
    if (!FILTER_KEYS.some((key) => options?.[key] !== undefined)) {
      throw new ValidationError(
        'searchAll needs at least one filter; without one the API returns every cosmetic (use all())',
        'options',
      );
    }
    return this.fetchRaw<FnccCosmeticSearchAllResponse>(
      FnccRoutes.cosmetics(),
      options,
      this.searchQuery(options),
    );
  }

  async categories(options?: FnccBaseOptions): Promise<FnccCosmeticCategories> {
    return this.fetchData<FnccCosmeticCategories>(FnccRoutes.cosmeticsCategories(), options);
  }

  async types(options?: FnccBaseOptions): Promise<FnccCosmeticType[]> {
    return this.fetchData<FnccCosmeticType[]>(FnccRoutes.cosmeticsTypes(), options);
  }

  category(category: 'tracks', options?: FnccBaseOptions): Promise<FnccTrack[]>;
  category(category: 'beans', options?: FnccBaseOptions): Promise<FnccBean[]>;
  category(category: string, options?: FnccBaseOptions): Promise<FnccCosmetic[]>;
  async category(category: string, options?: FnccBaseOptions): Promise<FnccCatalogItem[]> {
    this.requireString(category, 'category');
    return this.fetchData<FnccCatalogItem[]>(FnccRoutes.cosmeticsCategory(category), options);
  }

  get(category: 'tracks', id: string, options?: FnccBaseOptions): Promise<FnccTrack>;
  get(category: 'beans', id: string, options?: FnccBaseOptions): Promise<FnccBean>;
  get(category: string, id: string, options?: FnccBaseOptions): Promise<FnccCosmetic>;
  async get(category: string, id: string, options?: FnccBaseOptions): Promise<FnccCatalogItem> {
    this.requireString(category, 'category');
    this.requireString(id, 'id');
    return this.fetchData<FnccCatalogItem>(FnccRoutes.cosmetic(category, id), options);
  }

  search(
    category: 'tracks',
    options?: FnccCosmeticSearchOptions,
  ): Promise<FnccCosmeticSearchResponse<FnccTrack>>;
  search(
    category: 'beans',
    options?: FnccCosmeticSearchOptions,
  ): Promise<FnccCosmeticSearchResponse<FnccBean>>;
  search(category: string, options?: FnccCosmeticSearchOptions): Promise<FnccCosmeticSearchResponse>;
  async search(
    category: string,
    options?: FnccCosmeticSearchOptions,
  ): Promise<FnccCosmeticSearchResponse<FnccCatalogItem>> {
    this.requireString(category, 'category');
    return this.fetchRaw<FnccCosmeticSearchResponse<FnccCatalogItem>>(
      FnccRoutes.cosmeticsCategorySearch(category),
      options,
      this.searchQuery(options),
    );
  }

  private searchQuery(options: FnccCosmeticSearchOptions | undefined): QueryParams {
    const query: QueryParams = {};
    for (const key of SEARCH_KEYS) {
      const value = options?.[key];
      if (value !== undefined) query[key] = value;
    }
    return query;
  }
}
