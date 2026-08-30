import { FnccEndpoint } from './base.js';
import { FnccRoutes } from '../routes.js';
import type { QueryParams } from '../../core/types.js';
import type { FnccLookupOptions } from '../options.js';
import type { FnccLookupResponse } from '../types.js';

export class FnccLookupEndpoint extends FnccEndpoint {
  async find(options?: FnccLookupOptions): Promise<FnccLookupResponse> {
    return this.fetchRaw<FnccLookupResponse>(FnccRoutes.lookup(), options, this.query(options));
  }

  async byName(name: string, options?: FnccLookupOptions): Promise<FnccLookupResponse> {
    this.requireString(name, 'name');
    return this.find({ ...options, name });
  }

  async byAccountId(accountId: string, options?: FnccLookupOptions): Promise<FnccLookupResponse> {
    this.requireString(accountId, 'accountId');
    return this.find({ ...options, accountId });
  }

  private query(options: FnccLookupOptions | undefined): QueryParams {
    const query: QueryParams = {};
    if (options?.accountId !== undefined) query['accountId'] = options.accountId;
    if (options?.name !== undefined) query['name'] = options.name;
    if (options?.platform !== undefined) query['platform'] = options.platform;
    if (options?.search !== undefined) query['search'] = options.search;
    return query;
  }
}
