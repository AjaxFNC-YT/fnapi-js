import { FnccEndpoint } from './base.js';
import { FnccRoutes } from '../routes.js';
import type { FnccBaseOptions } from '../options.js';
import type { FnccLightswitchResponse, FnccLightswitchService } from '../types.js';

export class FnccLightswitchEndpoint extends FnccEndpoint {
  async all(options?: FnccBaseOptions): Promise<FnccLightswitchResponse> {
    return this.fetchRaw<FnccLightswitchResponse>(FnccRoutes.lightswitch(), options);
  }

  async service(service: string, options?: FnccBaseOptions): Promise<FnccLightswitchService> {
    this.requireString(service, 'service');
    return this.fetchData<FnccLightswitchService>(FnccRoutes.lightswitchService(service), options);
  }
}
