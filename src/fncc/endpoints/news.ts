import { FnccEndpoint } from './base.js';
import { FnccRoutes } from '../routes.js';
import type { FnccBaseOptions } from '../options.js';
import type { FnccNewsFeed, FnccNewsResponse } from '../types.js';

export class FnccNewsEndpoint extends FnccEndpoint {
  async all(options?: FnccBaseOptions): Promise<FnccNewsResponse> {
    return this.fetchRaw<FnccNewsResponse>(FnccRoutes.news(), options);
  }

  async feed(feed: string, options?: FnccBaseOptions): Promise<FnccNewsFeed> {
    this.requireString(feed, 'feed');
    return this.fetchData<FnccNewsFeed>(FnccRoutes.newsFeed(feed), options);
  }
}
