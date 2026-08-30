import { Routes } from '../routes.js';
import type { FlagOptions } from '../options.js';
import type { Shop, ShopEntry } from '../types.js';
import { BaseEndpoint } from './base.js';

function entryCosmeticIds(entry: ShopEntry): string[] {
  return [
    ...(entry.brItems ?? []).map((item) => item.id),
    ...(entry.tracks ?? []).map((item) => item.id),
    ...(entry.instruments ?? []).map((item) => item.id),
    ...(entry.cars ?? []).map((item) => item.id),
    ...(entry.legoKits ?? []).map((item) => item.id),
  ];
}

export class ShopEndpoint extends BaseEndpoint {
  get(options?: FlagOptions): Promise<Shop> {
    return this.fetchData<Shop>(Routes.shop(), options, this.baseQuery(options));
  }

  async entries(options?: FlagOptions): Promise<ShopEntry[]> {
    const shop = await this.get(options);
    return shop.entries;
  }

  async sections(options?: FlagOptions): Promise<Map<string, ShopEntry[]>> {
    const entries = await this.entries(options);
    const sections = new Map<string, ShopEntry[]>();

    for (const entry of entries) {
      const key = entry.layout?.name ?? entry.layoutId ?? 'unknown';
      const bucket = sections.get(key);
      if (bucket) {
        bucket.push(entry);
      } else {
        sections.set(key, [entry]);
      }
    }

    return sections;
  }

  async byOfferId(offerId: string, options?: FlagOptions): Promise<ShopEntry | null> {
    this.requireString(offerId, 'offerId');
    const entries = await this.entries(options);
    return entries.find((entry) => entry.offerId === offerId) ?? null;
  }

  async containing(cosmeticId: string, options?: FlagOptions): Promise<ShopEntry[]> {
    this.requireString(cosmeticId, 'cosmeticId');
    const entries = await this.entries(options);
    return entries.filter((entry) => entryCosmeticIds(entry).includes(cosmeticId));
  }

  async isInShop(cosmeticId: string, options?: FlagOptions): Promise<boolean> {
    const matches = await this.containing(cosmeticId, options);
    return matches.length > 0;
  }
}
