import { CosmeticSearchBuilder, normalizeSearchParams } from '../search.js';
import { ValidationError, NotFoundError } from '../../core/errors.js';
import { Routes } from '../routes.js';
import type {
  AllCosmetics,
  BeanCosmetic,
  BrCosmetic,
  CarCosmetic,
  InstrumentCosmetic,
  LegoCosmetic,
  LegoKitCosmetic,
  NewCosmetics,
  TrackCosmetic,
} from '../types.js';
import type { CosmeticSearchOptions, CosmeticSearchParams, FlagOptions } from '../options.js';
import type { QueryParams } from '../../core/types.js';
import { BaseEndpoint } from './base.js';
export type CosmeticSearchInput = CosmeticSearchParams | CosmeticSearchBuilder;

function toSearchQuery(input: CosmeticSearchInput): QueryParams {
  if (input instanceof CosmeticSearchBuilder) {
    return input.build();
  }
  return normalizeSearchParams(input);
}

export class CosmeticsEndpoint extends BaseEndpoint {
  all(options?: FlagOptions): Promise<AllCosmetics> {
    return this.fetchData<AllCosmetics>(Routes.cosmetics(), options, this.baseQuery(options));
  }

  newCosmetics(options?: FlagOptions): Promise<NewCosmetics> {
    return this.fetchData<NewCosmetics>(Routes.cosmeticsNew(), options, this.baseQuery(options));
  }

  br(options?: FlagOptions): Promise<BrCosmetic[]> {
    return this.fetchData<BrCosmetic[]>(Routes.cosmeticsBr(), options, this.baseQuery(options));
  }

  tracks(options?: FlagOptions): Promise<TrackCosmetic[]> {
    return this.fetchData<TrackCosmetic[]>(
      Routes.cosmeticsTracks(),
      options,
      this.baseQuery(options),
    );
  }

  instruments(options?: FlagOptions): Promise<InstrumentCosmetic[]> {
    return this.fetchData<InstrumentCosmetic[]>(
      Routes.cosmeticsInstruments(),
      options,
      this.baseQuery(options),
    );
  }

  cars(options?: FlagOptions): Promise<CarCosmetic[]> {
    return this.fetchData<CarCosmetic[]>(Routes.cosmeticsCars(), options, this.baseQuery(options));
  }

  lego(options?: FlagOptions): Promise<LegoCosmetic[]> {
    return this.fetchData<LegoCosmetic[]>(Routes.cosmeticsLego(), options, this.baseQuery(options));
  }

  legoKits(options?: FlagOptions): Promise<LegoKitCosmetic[]> {
    return this.fetchData<LegoKitCosmetic[]>(
      Routes.cosmeticsLegoKits(),
      options,
      this.baseQuery(options),
    );
  }

  beans(options?: FlagOptions): Promise<BeanCosmetic[]> {
    return this.fetchData<BeanCosmetic[]>(Routes.cosmeticsBeans(), options, this.baseQuery(options));
  }

  async byId(cosmeticId: string, options?: FlagOptions): Promise<BrCosmetic> {
    this.requireString(cosmeticId, 'cosmeticId');
    return this.fetchData<BrCosmetic>(
      Routes.cosmeticById(cosmeticId),
      options,
      this.baseQuery(options),
    );
  }

  async byIds(cosmeticIds: string[], options?: FlagOptions): Promise<BrCosmetic[]> {
    if (!Array.isArray(cosmeticIds) || cosmeticIds.length === 0) {
      throw new ValidationError('"cosmeticIds" must be a non-empty array of ids', 'cosmeticIds');
    }

    for (const id of cosmeticIds) {
      this.requireString(id, 'cosmeticIds');
    }

    return this.fetchData<BrCosmetic[]>(
      Routes.cosmeticsSearchIds(),
      options,
      this.baseQuery(options, { id: cosmeticIds }),
    );
  }

  async search(input: CosmeticSearchInput, options?: CosmeticSearchOptions): Promise<BrCosmetic> {
    return this.fetchData<BrCosmetic>(
      Routes.cosmeticsSearch(),
      options,
      this.baseQuery(options, toSearchQuery(input)),
    );
  }

  async searchAll(
    input: CosmeticSearchInput,
    options?: CosmeticSearchOptions,
  ): Promise<BrCosmetic[]> {
    return this.fetchData<BrCosmetic[]>(
      Routes.cosmeticsSearchAll(),
      options,
      this.baseQuery(options, toSearchQuery(input)),
    );
  }

  async find(input: CosmeticSearchInput, options?: CosmeticSearchOptions): Promise<BrCosmetic | null> {
    try {
      return await this.search(input, options);
    } catch (error) {
      if (error instanceof NotFoundError) return null;
      throw error;
    }
  }

  async findById(cosmeticId: string, options?: FlagOptions): Promise<BrCosmetic | null> {
    try {
      return await this.byId(cosmeticId, options);
    } catch (error) {
      if (error instanceof NotFoundError) return null;
      throw error;
    }
  }
}
