import { NotFoundError } from '../../core/errors.js';
import { Routes } from '../routes.js';
import type { QueryParams } from '../../core/types.js';
import type { StatsByIdOptions, StatsLookupOptions } from '../options.js';
import type { BrStats } from '../types.js';
import { BaseEndpoint } from './base.js';

export class StatsEndpoint extends BaseEndpoint {
  async byName(name: string, options?: StatsLookupOptions): Promise<BrStats> {
    this.requireApiKey('player stats');
    this.requireString(name, 'name');

    const query: QueryParams = { name };
    if (options?.accountType) query['accountType'] = options.accountType;
    if (options?.timeWindow) query['timeWindow'] = options.timeWindow;
    if (options?.image) query['image'] = options.image;

    return this.fetchData<BrStats>(Routes.stats(), options, query);
  }

  async byId(accountId: string, options?: StatsByIdOptions): Promise<BrStats> {
    this.requireApiKey('player stats');
    this.requireString(accountId, 'accountId');

    const query: QueryParams = {};
    if (options?.timeWindow) query['timeWindow'] = options.timeWindow;
    if (options?.image) query['image'] = options.image;

    return this.fetchData<BrStats>(Routes.statsByAccountId(accountId), options, query);
  }

  async findByName(name: string, options?: StatsLookupOptions): Promise<BrStats | null> {
    try {
      return await this.byName(name, options);
    } catch (error) {
      if (error instanceof NotFoundError) return null;
      throw error;
    }
  }

  async findById(accountId: string, options?: StatsByIdOptions): Promise<BrStats | null> {
    try {
      return await this.byId(accountId, options);
    } catch (error) {
      if (error instanceof NotFoundError) return null;
      throw error;
    }
  }
}
