import { FnccEndpoint } from './base.js';
import { FnccRoutes } from '../routes.js';
import { ValidationError } from '../../core/errors.js';
import type { QueryParams } from '../../core/types.js';
import type {
  FnccAssetPathsOptions,
  FnccAssetsListOptions,
  FnccBaseOptions,
  FnccPageOptions,
} from '../options.js';
import type {
  FnccArchive,
  FnccAssetEntry,
  FnccAssetPackage,
  FnccFixedPath,
  FnccPage,
} from '../types.js';

export class FnccAssetsEndpoint extends FnccEndpoint {
  async list(options?: FnccAssetsListOptions): Promise<FnccPage<FnccAssetEntry>> {
    return this.fetchRaw<FnccPage<FnccAssetEntry>>(
      FnccRoutes.assets(),
      options,
      this.listQuery(options),
    );
  }

  async search(
    query: string,
    options?: FnccPageOptions,
  ): Promise<FnccPage<FnccAssetEntry>> {
    this.requireString(query, 'query');
    const params: QueryParams = { q: query };
    if (options?.offset !== undefined) params['offset'] = options.offset;
    if (options?.limit !== undefined) params['limit'] = options.limit;
    return this.fetchRaw<FnccPage<FnccAssetEntry>>(FnccRoutes.assetsSearch(), options, params);
  }

  async paths(options?: FnccAssetPathsOptions): Promise<FnccPage<string>> {
    return this.fetchRaw<FnccPage<string>>(FnccRoutes.assetsPaths(), options, this.pathsQuery(options));
  }

  pathsTextUrl(options?: FnccAssetPathsOptions): string {
    return this.buildUrl(FnccRoutes.assetsPaths(), { ...this.pathsQuery(options), format: 'text' });
  }

  async fixPath(path: string, options?: FnccBaseOptions): Promise<FnccFixedPath> {
    this.requireString(path, 'path');
    return this.fetchRaw<FnccFixedPath>(FnccRoutes.assetsFixPath(), options, { path });
  }

  async fixPaths(paths: string[], options?: FnccBaseOptions): Promise<FnccFixedPath[]> {
    if (!Array.isArray(paths) || paths.length === 0) {
      throw new ValidationError('"paths" must be a non-empty array of strings', 'paths');
    }
    paths.forEach((path, index) => this.requireString(path, `paths[${index}]`));
    return this.postRaw<FnccFixedPath[]>(FnccRoutes.assetsFixPath(), paths, options);
  }

  async exports(path: string, options?: FnccBaseOptions): Promise<string[]> {
    this.requireString(path, 'path');
    return this.fetchRaw<string[]>(FnccRoutes.assetsExports(), options, { path });
  }

  async json<T = unknown>(path: string, name?: string, options?: FnccBaseOptions): Promise<T> {
    this.requireString(path, 'path');
    const params: QueryParams = { path };
    if (name !== undefined) params['name'] = this.requireString(name, 'name');
    return this.fetchRaw<T>(FnccRoutes.assetsJson(), options, params);
  }

  async package(path: string, options?: FnccBaseOptions): Promise<FnccAssetPackage> {
    this.requireString(path, 'path');
    return this.fetchRaw<FnccAssetPackage>(FnccRoutes.assetsPackage(), options, { path });
  }

  async archives(options?: FnccBaseOptions): Promise<FnccArchive[]> {
    return this.fetchRaw<FnccArchive[]>(FnccRoutes.assetsArchives(), options);
  }

  rawUrl(path: string): string {
    this.requireString(path, 'path');
    return this.buildUrl(FnccRoutes.assetsRaw(), { path });
  }

  private listQuery(options: FnccAssetsListOptions | undefined): QueryParams {
    const query: QueryParams = {};
    if (options?.prefix !== undefined) query['prefix'] = options.prefix;
    if (options?.extension !== undefined) query['extension'] = options.extension;
    if (options?.offset !== undefined) query['offset'] = options.offset;
    if (options?.limit !== undefined) query['limit'] = options.limit;
    return query;
  }

  private pathsQuery(options: FnccAssetPathsOptions | undefined): QueryParams {
    const query: QueryParams = {};
    if (options?.q !== undefined) query['q'] = options.q;
    if (options?.prefix !== undefined) query['prefix'] = options.prefix;
    if (options?.extension !== undefined) query['extension'] = options.extension;
    if (options?.offset !== undefined) query['offset'] = options.offset;
    if (options?.limit !== undefined) query['limit'] = options.limit;
    return query;
  }
}
