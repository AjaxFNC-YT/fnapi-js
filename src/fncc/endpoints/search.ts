import { FnccEndpoint } from './base.js';
import { FnccRoutes } from '../routes.js';
import type { QueryParams } from '../../core/types.js';
import type { FnccContentSearchOptions, FnccPageOptions } from '../options.js';
import type { FnccContentSearchResult, FnccPage, FnccSearchHit } from '../types.js';

export class FnccSearchEndpoint extends FnccEndpoint {
  async paths(query: string, options?: FnccPageOptions): Promise<FnccPage<FnccSearchHit>> {
    this.requireString(query, 'query');
    return this.fetchRaw<FnccPage<FnccSearchHit>>(
      FnccRoutes.search(),
      options,
      this.pageQuery(query, options),
    );
  }

  async content(
    query: string,
    options?: FnccContentSearchOptions,
  ): Promise<FnccContentSearchResult> {
    this.requireString(query, 'query');
    return this.fetchRaw<FnccContentSearchResult>(
      FnccRoutes.searchContent(),
      options,
      this.contentQuery(query, options),
    );
  }

  private pageQuery(query: string, options: FnccPageOptions | undefined): QueryParams {
    const params: QueryParams = { q: query };
    if (options?.offset !== undefined) params['offset'] = options.offset;
    if (options?.limit !== undefined) params['limit'] = options.limit;
    return params;
  }

  private contentQuery(query: string, options: FnccContentSearchOptions | undefined): QueryParams {
    const params: QueryParams = { q: query };
    if (options?.prefix !== undefined) params['prefix'] = options.prefix;
    if (options?.extension !== undefined) params['extension'] = options.extension;
    if (options?.limit !== undefined) params['limit'] = options.limit;
    if (options?.maxFiles !== undefined) params['maxFiles'] = options.maxFiles;
    if (options?.timeBudgetMs !== undefined) params['timeBudgetMs'] = options.timeBudgetMs;
    if (options?.ignoreCase !== undefined) params['ignoreCase'] = options.ignoreCase;
    return params;
  }
}
