import { DillyEndpoint } from './base.js';
import { DillyRoutes } from '../routes.js';
import type { DillyBaseOptions } from '../options.js';
import type { DillyBackup } from '../types.js';

export class DillyBackupEndpoint extends DillyEndpoint {
  async list(options?: DillyBaseOptions): Promise<DillyBackup[]> {
    return this.fetchRaw<DillyBackup[]>(DillyRoutes.backups(), options);
  }
}
