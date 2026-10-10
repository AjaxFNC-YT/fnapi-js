import { FnccEndpoint } from './base.js';
import { FnccRoutes } from '../routes.js';
import { ValidationError } from '../../core/errors.js';
import type { FnccBaseOptions } from '../options.js';
import type { FnccShortenStats, FnccShortLink } from '../types.js';

export class FnccShortenEndpoint extends FnccEndpoint {
  async create(url: string, options?: FnccBaseOptions): Promise<FnccShortLink> {
    this.requireString(url, 'url');
    if (!/^https?:\/\//i.test(url)) {
      throw new ValidationError('"url" must be an http or https url', 'url');
    }
    return this.postData<FnccShortLink>(FnccRoutes.shorten(), { url }, options);
  }

  async stats(options?: FnccBaseOptions): Promise<FnccShortenStats> {
    return this.fetchData<FnccShortenStats>(FnccRoutes.shortenStats(), options);
  }
}
