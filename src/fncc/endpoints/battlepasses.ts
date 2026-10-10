import { FnccEndpoint } from './base.js';
import { FnccRoutes } from '../routes.js';
import type { FnccBaseOptions } from '../options.js';
import type { FnccBattlePass } from '../types.js';

export class FnccBattlePassesEndpoint extends FnccEndpoint {
  async list(options?: FnccBaseOptions): Promise<FnccBattlePass[]> {
    return this.fetchData<FnccBattlePass[]>(FnccRoutes.battlepasses(), options);
  }

  async get(pass: string | number, options?: FnccBaseOptions): Promise<FnccBattlePass> {
    const key = typeof pass === 'number' ? String(pass) : this.requireString(pass, 'pass');
    return this.fetchData<FnccBattlePass>(FnccRoutes.battlepass(key), options);
  }
}
