import { DillyEndpoint } from './base.js';
import { DillyRoutes } from '../routes.js';
import type { DillyPakOptions, DillyVersionOptions } from '../options.js';
import type { DillyAesCosmeticsResponse, DillyAesResponse } from '../types.js';

export class DillyAesEndpoint extends DillyEndpoint {
  async keys(options?: DillyVersionOptions): Promise<DillyAesResponse> {
    return this.fetchRaw<DillyAesResponse>(DillyRoutes.aes(), options, this.versionQuery(options));
  }

  async forPak(pakId: string, options?: DillyPakOptions): Promise<DillyAesResponse> {
    this.requireString(pakId, 'pakId');
    return this.fetchRaw<DillyAesResponse>(
      DillyRoutes.aesForPak(pakId),
      options,
      this.versionQuery(options),
    );
  }

  async cosmetics(pakId: string, options?: DillyPakOptions): Promise<DillyAesCosmeticsResponse> {
    this.requireString(pakId, 'pakId');
    return this.fetchRaw<DillyAesCosmeticsResponse>(
      DillyRoutes.aesCosmetics(pakId),
      options,
      this.versionQuery(options),
    );
  }
}
