import { FnccEndpoint } from './base.js';
import { FnccRoutes } from '../routes.js';
import type { QueryParams } from '../../core/types.js';
import type { FnccImageOptions } from '../options.js';

export class FnccImagesEndpoint extends FnccEndpoint {
  url(options: FnccImageOptions): string {
    this.requireString(options?.path, 'path');
    const query: QueryParams = { path: options.path };
    if (options.name !== undefined) query['name'] = options.name;
    if (options.format !== undefined) query['format'] = options.format;
    if (options.maxSize !== undefined) query['maxSize'] = options.maxSize;
    return this.buildUrl(FnccRoutes.images(), query);
  }
}
