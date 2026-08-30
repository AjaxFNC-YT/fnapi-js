import { FnccEndpoint } from './base.js';
import { FnccRoutes } from '../routes.js';
import type { QueryParams } from '../../core/types.js';
import type { FnccMnemonicListOptions, FnccMnemonicOptions } from '../options.js';
import type { FnccMnemonic } from '../types.js';

export class FnccMnemonicEndpoint extends FnccEndpoint {
  async list(options?: FnccMnemonicListOptions): Promise<FnccMnemonic[]> {
    const query: QueryParams = {};
    if (options?.type !== undefined) query['type'] = options.type;
    return this.fetchData<FnccMnemonic[]>(FnccRoutes.mnemonic(), options, query);
  }

  async get(mnemonic: string, options?: FnccMnemonicOptions): Promise<FnccMnemonic> {
    this.requireString(mnemonic, 'mnemonic');
    const query: QueryParams = {};
    if (options?.related !== undefined) query['related'] = options.related;
    return this.fetchData<FnccMnemonic>(FnccRoutes.mnemonicByKey(mnemonic), options, query);
  }
}
