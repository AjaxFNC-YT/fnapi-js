import { DillyEndpoint } from './base.js';
import { DillyRoutes } from '../routes.js';
import type { DillyBaseOptions } from '../options.js';
import type { DillyVersion } from '../types.js';

export class DillyCommonEndpoint extends DillyEndpoint {
  async versions(options?: DillyBaseOptions): Promise<DillyVersion[]> {
    return this.fetchRaw<DillyVersion[]>(DillyRoutes.versions(), options);
  }
}
