import { Routes } from '../routes.js';
import type { Aes } from '../types.js';
import type { AesOptions } from '../options.js';
import { BaseEndpoint } from './base.js';

export class AesEndpoint extends BaseEndpoint {
  get(options?: AesOptions): Promise<Aes> {
    const query = options?.keyFormat ? { keyFormat: options.keyFormat } : {};
    return this.fetchData<Aes>(Routes.aes(), options, query);
  }

  async mainKey(options?: AesOptions): Promise<string | null> {
    const aes = await this.get(options);
    return aes.mainKey;
  }

  async dynamicKey(pakGuid: string, options?: AesOptions): Promise<string | null> {
    this.requireString(pakGuid, 'pakGuid');
    const aes = await this.get(options);
    const match = aes.dynamicKeys.find(
      (entry) => entry.pakGuid.toLowerCase() === pakGuid.toLowerCase(),
    );
    return match?.key ?? null;
  }
}
