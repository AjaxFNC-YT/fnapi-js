import { FnccEndpoint } from './base.js';
import { FnccRoutes } from '../routes.js';
import type { FnccBaseOptions } from '../options.js';
import type { FnccCloudStorageFile } from '../types.js';

export class FnccCloudStorageEndpoint extends FnccEndpoint {
  async list(options?: FnccBaseOptions): Promise<FnccCloudStorageFile[]> {
    return this.fetchData<FnccCloudStorageFile[]>(FnccRoutes.cloudstorage(), options);
  }

  async file(filename: string, options?: FnccBaseOptions): Promise<string> {
    this.requireString(filename, 'filename');
    return this.fetchRaw<string>(FnccRoutes.cloudstorageFile(filename), options);
  }
}
