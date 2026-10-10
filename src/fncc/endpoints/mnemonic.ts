import { FnccEndpoint } from './base.js';
import { FnccRoutes } from '../routes.js';
import type { QueryParams } from '../../core/types.js';
import type { FnccBaseOptions, FnccMnemonicListOptions } from '../options.js';
import type { FnccMnemonic, FnccMnemonicRelated } from '../types.js';

type RawRecord = Record<string, unknown>;

function asRecord(value: unknown): RawRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as RawRecord) : {};
}

function text(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) return value;
  }
  return null;
}

function recordOrNull(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as RawRecord) : null;
}

export function normalizeMnemonic(raw: unknown): FnccMnemonic {
  const link = asRecord(raw);
  const metadata = asRecord(link['metadata']);
  const images = asRecord(link['images']);
  const imageUrls = asRecord(metadata['image_urls']);
  const matchmaking = asRecord(link['matchmaking']);
  const plugins = matchmaking['plugins'];
  return {
    mnemonic: text(link['mnemonic']) ?? '',
    linkType: text(link['linkType']) ?? '',
    creator: text(link['creator'], link['creatorName']) ?? '',
    title: text(link['title'], metadata['title']),
    description: text(link['description'], metadata['tagline'], metadata['description']),
    image: text(link['image'], metadata['image_url'], imageUrls['url']),
    images: {
      full: text(images['full'], imageUrls['url'], metadata['image_url']),
      medium: text(images['medium'], imageUrls['url_m']),
      small: text(images['small'], imageUrls['url_s']),
      tiny: text(images['tiny'], imageUrls['url_xs']),
    },
    parentExperience: text(link['parentExperience'], metadata['parent_set']),
    matchmakingId: text(link['matchmakingId']),
    matchmaking: {
      v1: recordOrNull(matchmaking['v1']) ?? recordOrNull(metadata['matchmaking']),
      v2: recordOrNull(matchmaking['v2']) ?? recordOrNull(metadata['matchmakingV2']),
      v3: recordOrNull(matchmaking['v3']) ?? recordOrNull(metadata['matchmakingV3']),
      plugins: Array.isArray(plugins) ? (plugins as string[]) : null,
    },
    metadata,
  };
}

export class FnccMnemonicEndpoint extends FnccEndpoint {
  async list(options?: FnccMnemonicListOptions): Promise<FnccMnemonic[]> {
    const query: QueryParams = {};
    if (options?.type !== undefined) query['type'] = options.type;
    const links = await this.fetchData<unknown[]>(FnccRoutes.mnemonic(), options, query);
    return links.map(normalizeMnemonic);
  }

  async get(mnemonic: string, options?: FnccBaseOptions): Promise<FnccMnemonic> {
    this.requireString(mnemonic, 'mnemonic');
    return normalizeMnemonic(await this.fetchData<unknown>(FnccRoutes.mnemonicByKey(mnemonic), options));
  }

  async related(mnemonic: string, options?: FnccBaseOptions): Promise<FnccMnemonicRelated> {
    this.requireString(mnemonic, 'mnemonic');
    return this.fetchData<FnccMnemonicRelated>(FnccRoutes.mnemonicByKey(mnemonic), options, { related: true });
  }
}
