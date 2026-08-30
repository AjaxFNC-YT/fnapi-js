import { DillyEndpoint } from './base.js';
import { DillyRoutes } from '../routes.js';
import type { DillyBaseOptions } from '../options.js';
import type { DillyMapping } from '../types.js';

export class DillyMappingEndpoint extends DillyEndpoint {
  async list(options?: DillyBaseOptions): Promise<DillyMapping[]> {
    return this.fetchRaw<DillyMapping[]>(DillyRoutes.mappings(), options);
  }

  async legacy(options?: DillyBaseOptions): Promise<DillyMapping[]> {
    return this.fetchRaw<DillyMapping[]>(DillyRoutes.mappingsLegacy(), options);
  }
}
