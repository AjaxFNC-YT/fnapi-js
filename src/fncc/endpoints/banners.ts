import { FnccEndpoint } from './base.js';
import { FnccRoutes } from '../routes.js';
import type { FnccBaseOptions } from '../options.js';
import type { FnccBanner, FnccBannerColor } from '../types.js';

export class FnccBannersEndpoint extends FnccEndpoint {
  async list(options?: FnccBaseOptions): Promise<FnccBanner[]> {
    return this.fetchData<FnccBanner[]>(FnccRoutes.banners(), options);
  }

  async colors(options?: FnccBaseOptions): Promise<FnccBannerColor[]> {
    return this.fetchData<FnccBannerColor[]>(FnccRoutes.bannerColors(), options);
  }
}
