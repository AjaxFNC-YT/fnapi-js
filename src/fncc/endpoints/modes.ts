import { FnccEndpoint } from './base.js';
import { FnccRoutes } from '../routes.js';
import type { FnccBaseOptions } from '../options.js';
import type { FnccMode, FnccModes } from '../types.js';

export class FnccModesEndpoint extends FnccEndpoint {
  async list(options?: FnccBaseOptions): Promise<FnccModes> {
    return this.fetchData<FnccModes>(FnccRoutes.modes(), options);
  }

  async get(id: string, options?: FnccBaseOptions): Promise<FnccMode> {
    this.requireString(id, 'id');
    return this.fetchData<FnccMode>(FnccRoutes.mode(id), options);
  }
}
