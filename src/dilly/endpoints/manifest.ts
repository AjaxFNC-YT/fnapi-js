import { DillyEndpoint } from './base.js';
import { DillyRoutes } from '../routes.js';
import type { DillyBaseOptions } from '../options.js';
import type { DillyManifest } from '../types.js';

export class DillyManifestEndpoint extends DillyEndpoint {
  async list(options?: DillyBaseOptions): Promise<DillyManifest[]> {
    return this.fetchRaw<DillyManifest[]>(DillyRoutes.manifests(), options);
  }

  async get(manifestId: string, options?: DillyBaseOptions): Promise<DillyManifest> {
    this.requireString(manifestId, 'manifestId');
    return this.fetchRaw<DillyManifest>(DillyRoutes.manifest(manifestId), options);
  }
}
