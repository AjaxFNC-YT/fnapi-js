import { FnccEndpoint } from './base.js';
import { FnccRoutes } from '../routes.js';
import type { FnccBaseOptions } from '../options.js';
import type { FnccAntiCheat } from '../types.js';

export class FnccAntiCheatEndpoint extends FnccEndpoint {
  async info(options?: FnccBaseOptions): Promise<FnccAntiCheat> {
    return this.fetchData<FnccAntiCheat>(FnccRoutes.anticheat(), options);
  }

  async file(name: string, options?: FnccBaseOptions): Promise<string> {
    this.requireString(name, 'name');
    return this.fetchRaw<string>(FnccRoutes.anticheatFile(name), options);
  }

  fileUrl(name: string): string {
    this.requireString(name, 'name');
    return this.buildUrl(FnccRoutes.anticheatFile(name));
  }
}
