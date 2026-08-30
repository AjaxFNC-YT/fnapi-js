import { RestClient } from '../fortnite/rest.js';
import { DILLY_BASE_URL } from './routes.js';
import type { DillyAPIOptions } from './options.js';
import { DillyAesEndpoint } from './endpoints/aes.js';
import { DillyBackupEndpoint } from './endpoints/backup.js';
import { DillyCloudStorageEndpoint } from './endpoints/cloudStorage.js';
import { DillyCommonEndpoint } from './endpoints/common.js';
import { DillyCosmeticEndpoint } from './endpoints/cosmetic.js';
import { DillyExportEndpoint } from './endpoints/export.js';
import { DillyManifestEndpoint } from './endpoints/manifest.js';
import { DillyMappingEndpoint } from './endpoints/mapping.js';

export class DillyAPI {
  public readonly rest: RestClient;

  public readonly aes: DillyAesEndpoint;
  public readonly backups: DillyBackupEndpoint;
  public readonly cloudStorage: DillyCloudStorageEndpoint;
  public readonly common: DillyCommonEndpoint;
  public readonly cosmetics: DillyCosmeticEndpoint;
  public readonly exports: DillyExportEndpoint;
  public readonly manifests: DillyManifestEndpoint;
  public readonly mappings: DillyMappingEndpoint;

  constructor(options: DillyAPIOptions = {}) {
    this.rest = new RestClient({
      baseUrl: options.baseUrl ?? DILLY_BASE_URL,
      timeout: options.timeout,
      headers: options.headers,
      query: options.query,
      retry: options.retry,
      cache: options.cache,
      fetch: options.fetch,
      userAgent: options.userAgent,
    });

    this.aes = new DillyAesEndpoint(this.rest);
    this.backups = new DillyBackupEndpoint(this.rest);
    this.cloudStorage = new DillyCloudStorageEndpoint(this.rest);
    this.common = new DillyCommonEndpoint(this.rest);
    this.cosmetics = new DillyCosmeticEndpoint(this.rest);
    this.exports = new DillyExportEndpoint(this.rest);
    this.manifests = new DillyManifestEndpoint(this.rest);
    this.mappings = new DillyMappingEndpoint(this.rest);
  }

  versions(...args: Parameters<DillyCommonEndpoint['versions']>) {
    return this.common.versions(...args);
  }
}
