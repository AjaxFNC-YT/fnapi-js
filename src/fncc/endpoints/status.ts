import { FnccEndpoint } from './base.js';
import { FnccRoutes } from '../routes.js';
import type { FnccBaseOptions } from '../options.js';
import type { FnccDownload, FnccMaintenance, FnccParser, FnccStatus } from '../types.js';

export class FnccStatusEndpoint extends FnccEndpoint {
  async overview(options?: FnccBaseOptions): Promise<FnccStatus> {
    return this.fetchRaw<FnccStatus>(FnccRoutes.status(), options);
  }

  async download(options?: FnccBaseOptions): Promise<FnccDownload> {
    return this.fetchRaw<FnccDownload>(FnccRoutes.statusDownload(), options);
  }

  async maintenance(options?: FnccBaseOptions): Promise<FnccMaintenance> {
    return this.fetchRaw<FnccMaintenance>(FnccRoutes.statusMaintenance(), options);
  }

  async parser(options?: FnccBaseOptions): Promise<FnccParser> {
    return this.fetchRaw<FnccParser>(FnccRoutes.statusParser(), options);
  }
}
