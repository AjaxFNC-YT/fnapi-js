import { FnccEndpoint } from './base.js';
import { FnccRoutes } from '../routes.js';
import type { FnccBaseOptions } from '../options.js';
import type { FnccAes, FnccMappings, FnccVersion } from '../types.js';

export class FnccGameEndpoint extends FnccEndpoint {
  async version(options?: FnccBaseOptions): Promise<FnccVersion> {
    return this.fetchRaw<FnccVersion>(FnccRoutes.version(), options);
  }

  async aes(options?: FnccBaseOptions): Promise<FnccAes> {
    return this.fetchRaw<FnccAes>(FnccRoutes.aes(), options);
  }

  async mappings(options?: FnccBaseOptions): Promise<FnccMappings> {
    return this.fetchRaw<FnccMappings>(FnccRoutes.mappings(), options);
  }
}
