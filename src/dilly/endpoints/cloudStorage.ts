import { DillyEndpoint } from './base.js';
import { DillyRoutes } from '../routes.js';
import type { QueryParams } from '../../core/types.js';
import type { DillyHotfixOptions } from '../options.js';
import type { DillyHotfixes } from '../types.js';

export class DillyCloudStorageEndpoint extends DillyEndpoint {
  async hotfixes(options?: DillyHotfixOptions): Promise<DillyHotfixes> {
    const query: QueryParams = {};
    if (options?.lang !== undefined) query['lang'] = options.lang;
    return this.fetchRaw<DillyHotfixes>(DillyRoutes.hotfixes(), options, query);
  }
}
