import { Routes } from '../routes.js';
import type { Banner, BannerColor } from '../types.js';
import type { BaseOptions, LanguageOptions } from '../options.js';
import { BaseEndpoint } from './base.js';

export class BannersEndpoint extends BaseEndpoint {
  all(options?: LanguageOptions): Promise<Banner[]> {
    return this.fetchData<Banner[]>(Routes.banners(), options, this.languageQuery(options));
  }

  colors(options?: BaseOptions): Promise<BannerColor[]> {
    return this.fetchData<BannerColor[]>(Routes.bannerColors(), options, {});
  }

  async byId(bannerId: string, options?: LanguageOptions): Promise<Banner | null> {
    this.requireString(bannerId, 'bannerId');
    const banners = await this.all(options);
    return banners.find((banner) => banner.id === bannerId) ?? null;
  }

  async colorById(colorId: string, options?: BaseOptions): Promise<BannerColor | null> {
    this.requireString(colorId, 'colorId');
    const colors = await this.colors(options);
    return colors.find((color) => color.id === colorId) ?? null;
  }
}
