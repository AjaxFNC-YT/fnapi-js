import { Routes } from '../routes.js';
import type { GameModeNews, News } from '../types.js';
import type { LanguageOptions } from '../options.js';
import { BaseEndpoint } from './base.js';

export class NewsEndpoint extends BaseEndpoint {
  all(options?: LanguageOptions): Promise<News> {
    return this.fetchData<News>(Routes.news(), options, this.languageQuery(options));
  }

  br(options?: LanguageOptions): Promise<GameModeNews> {
    return this.fetchData<GameModeNews>(Routes.newsBr(), options, this.languageQuery(options));
  }

  stw(options?: LanguageOptions): Promise<GameModeNews> {
    return this.fetchData<GameModeNews>(Routes.newsStw(), options, this.languageQuery(options));
  }
}
