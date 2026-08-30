import { DillyEndpoint } from './base.js';
import { DillyRoutes } from '../routes.js';
import type { QueryParams } from '../../core/types.js';
import type {
  DillyExportOptions,
  DillyExportPathOptions,
  DillySearchOptions,
  DillyVersionOptions,
} from '../options.js';
import type {
  DillyExport,
  DillyExportBundlesResponse,
  DillyExportCosmeticsResponse,
  DillyExportDisplayAssetsResponse,
  DillyExportOfferPopupsResponse,
  DillyExportSearchResponse,
  DillyExportSeasonsResponse,
  DillyExportSeriesResponse,
  DillyExportSetsResponse,
} from '../types.js';

export class DillyExportEndpoint extends DillyEndpoint {
  async get<T = unknown>(options: DillyExportOptions): Promise<DillyExport<T>> {
    this.requireString(options?.path, 'path');
    return this.fetchRaw<DillyExport<T>>(DillyRoutes.export(), options, this.exportQuery(options));
  }

  async ini<T = unknown>(options: DillyExportPathOptions): Promise<DillyExport<T>> {
    this.requireString(options?.path, 'path');
    return this.fetchRaw<DillyExport<T>>(
      DillyRoutes.exportIni(),
      options,
      this.pathQuery(options),
    );
  }

  async parsed<T = unknown>(options: DillyExportPathOptions): Promise<DillyExport<T>> {
    this.requireString(options?.path, 'path');
    return this.fetchRaw<DillyExport<T>>(
      DillyRoutes.exportParsed(),
      options,
      this.pathQuery(options),
    );
  }

  async download<T = unknown>(options: DillyExportPathOptions): Promise<DillyExport<T>> {
    this.requireString(options?.path, 'path');
    return this.fetchRaw<DillyExport<T>>(
      DillyRoutes.exportDownload(),
      options,
      this.pathQuery(options),
    );
  }

  async seasons(options?: DillyVersionOptions): Promise<DillyExportSeasonsResponse> {
    return this.fetchRaw<DillyExportSeasonsResponse>(
      DillyRoutes.exportSeasons(),
      options,
      this.versionQuery(options),
    );
  }

  async cosmetics(options?: DillyVersionOptions): Promise<DillyExportCosmeticsResponse> {
    return this.fetchRaw<DillyExportCosmeticsResponse>(
      DillyRoutes.exportCosmetics(),
      options,
      this.versionQuery(options),
    );
  }

  async cosmeticsNew(options?: DillyVersionOptions): Promise<DillyExportCosmeticsResponse> {
    return this.fetchRaw<DillyExportCosmeticsResponse>(
      DillyRoutes.exportCosmeticsNew(),
      options,
      this.versionQuery(options),
    );
  }

  async cosmeticsAll(options?: DillyVersionOptions): Promise<DillyExportCosmeticsResponse> {
    return this.fetchRaw<DillyExportCosmeticsResponse>(
      DillyRoutes.exportCosmeticsAll(),
      options,
      this.versionQuery(options),
    );
  }

  async cosmeticsSeries(options?: DillyVersionOptions): Promise<DillyExportSeriesResponse> {
    return this.fetchRaw<DillyExportSeriesResponse>(
      DillyRoutes.exportCosmeticsSeries(),
      options,
      this.versionQuery(options),
    );
  }

  async cosmeticsSets(options?: DillyVersionOptions): Promise<DillyExportSetsResponse> {
    return this.fetchRaw<DillyExportSetsResponse>(
      DillyRoutes.exportCosmeticsSets(),
      options,
      this.versionQuery(options),
    );
  }

  async offerPopups(options?: DillyVersionOptions): Promise<DillyExportOfferPopupsResponse> {
    return this.fetchRaw<DillyExportOfferPopupsResponse>(
      DillyRoutes.exportOfferPopups(),
      options,
      this.versionQuery(options),
    );
  }

  async displayAssets(options?: DillyVersionOptions): Promise<DillyExportDisplayAssetsResponse> {
    return this.fetchRaw<DillyExportDisplayAssetsResponse>(
      DillyRoutes.exportDisplayAssets(),
      options,
      this.versionQuery(options),
    );
  }

  async displayAssetsParsed<T = unknown>(
    options?: DillyVersionOptions,
  ): Promise<DillyExport<T>> {
    return this.fetchRaw<DillyExport<T>>(
      DillyRoutes.exportDisplayAssetsParsed(),
      options,
      this.versionQuery(options),
    );
  }

  async bundles(options?: DillyVersionOptions): Promise<DillyExportBundlesResponse> {
    return this.fetchRaw<DillyExportBundlesResponse>(
      DillyRoutes.exportBundles(),
      options,
      this.versionQuery(options),
    );
  }

  async search(options: DillySearchOptions): Promise<DillyExportSearchResponse> {
    this.requireString(options?.query, 'query');
    const query: QueryParams = { query: options.query };
    if (options.new !== undefined) query['new'] = options.new;
    return this.fetchRaw<DillyExportSearchResponse>(DillyRoutes.exportSearch(), options, query);
  }

  private pathQuery(options: DillyExportPathOptions): QueryParams {
    const query = this.versionQuery(options);
    query['path'] = options.path;
    return query;
  }

  private exportQuery(options: DillyExportOptions): QueryParams {
    const query = this.pathQuery(options);
    if (options.raw !== undefined) query['raw'] = options.raw;
    return query;
  }
}
