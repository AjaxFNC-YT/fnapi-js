import { FnccEndpoint } from './base.js';
import { FnccRoutes } from '../routes.js';
import type { FnccBaseOptions } from '../options.js';
import type { FnccDiscoveryResponse, FnccDiscoverySurface } from '../types.js';

export class FnccDiscoveryEndpoint extends FnccEndpoint {
  async all(options?: FnccBaseOptions): Promise<FnccDiscoveryResponse> {
    return this.fetchRaw<FnccDiscoveryResponse>(FnccRoutes.discovery(), options);
  }

  async surface(surface: string, options?: FnccBaseOptions): Promise<FnccDiscoverySurface> {
    this.requireString(surface, 'surface');
    return this.fetchData<FnccDiscoverySurface>(FnccRoutes.discoverySurface(surface), options);
  }
}
