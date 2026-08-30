import { FnccEndpoint } from './base.js';
import { FnccRoutes } from '../routes.js';
import type { FnccBaseOptions } from '../options.js';
import type { FnccAntiCheat, FnccAntiCheatFileContent } from '../types.js';

export class FnccAntiCheatEndpoint extends FnccEndpoint {
  async info(options?: FnccBaseOptions): Promise<FnccAntiCheat> {
    return this.fetchData<FnccAntiCheat>(FnccRoutes.anticheat(), options);
  }

  async file(name: string, options?: FnccBaseOptions): Promise<FnccAntiCheatFileContent> {
    this.requireString(name, 'name');
    return this.fetchData<FnccAntiCheatFileContent>(FnccRoutes.anticheatFile(name), options);
  }
}
