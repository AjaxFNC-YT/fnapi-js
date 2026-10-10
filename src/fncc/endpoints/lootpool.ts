import { FnccEndpoint } from './base.js';
import { FnccRoutes } from '../routes.js';
import type { QueryParams } from '../../core/types.js';
import type { FnccBaseOptions, FnccLootSearchOptions } from '../options.js';
import type {
  FnccLootContainer,
  FnccLootHit,
  FnccLootPool,
  FnccLootPoolContainers,
  FnccLootPoolSummary,
  FnccLootPoolWithContainers,
  FnccLootSearchResponse,
} from '../types.js';

const SEARCH_KEYS = [
  'q',
  'item',
  'container',
  'experience',
  'map',
  'rarity',
  'zeroBuild',
  'ranked',
  'minChance',
  'limit',
  'offset',
] as const;

export class FnccLootPoolEndpoint extends FnccEndpoint {
  async list(options?: FnccBaseOptions): Promise<FnccLootPoolSummary[]> {
    return this.fetchData<FnccLootPoolSummary[]>(FnccRoutes.lootpools(), options);
  }

  async all(options?: FnccBaseOptions): Promise<FnccLootPoolWithContainers[]> {
    return this.fetchData<FnccLootPoolWithContainers[]>(FnccRoutes.lootpoolsAll(), options);
  }

  async search(options?: FnccLootSearchOptions): Promise<FnccLootSearchResponse> {
    const query: QueryParams = {};
    for (const key of SEARCH_KEYS) {
      const value = options?.[key];
      if (value !== undefined) query[key] = value;
    }
    return this.fetchRaw<FnccLootSearchResponse>(FnccRoutes.lootpoolSearch(), options, query);
  }

  async item(itemId: string, options?: FnccBaseOptions): Promise<FnccLootHit[]> {
    this.requireString(itemId, 'itemId');
    return this.fetchData<FnccLootHit[]>(FnccRoutes.lootpoolItem(itemId), options);
  }

  async get(id: string, options?: FnccBaseOptions): Promise<FnccLootPool> {
    this.requireString(id, 'id');
    return this.fetchData<FnccLootPool>(FnccRoutes.lootpool(id), options);
  }

  async containers(id: string, options?: FnccBaseOptions): Promise<FnccLootPoolContainers> {
    this.requireString(id, 'id');
    return this.fetchData<FnccLootPoolContainers>(FnccRoutes.lootpoolContainers(id), options);
  }

  async container(id: string, container: string, options?: FnccBaseOptions): Promise<FnccLootContainer> {
    this.requireString(id, 'id');
    this.requireString(container, 'container');
    return this.fetchData<FnccLootContainer>(FnccRoutes.lootpoolContainer(id, container), options);
  }
}
