import { ValidationError } from '../../core/errors.js';
import type { QueryParams } from '../../core/types.js';
import { FnccEndpoint } from './base.js';
import { FnccRoutes } from '../routes.js';
import type {
  FnccQuestCatalogOptions,
  FnccQuestFilterOptions,
  FnccQuestTextOptions,
} from '../options.js';
import type {
  FnccQuestBundles,
  FnccQuestCatalog,
  FnccQuestCategories,
  FnccQuestEntry,
  FnccQuestLookup,
  FnccStwQuests,
} from '../types.js';

export const FNCC_QUEST_LOOKUP_LIMIT = 1000;

export class FnccQuestsEndpoint extends FnccEndpoint {
  async catalog(options?: FnccQuestCatalogOptions): Promise<FnccQuestCatalog> {
    const query = filterQuery(options);
    if (options?.sections?.length) query['sections'] = options.sections.join(',');
    if (options?.ids?.length) query['ids'] = options.ids.join(',');
    return this.fetchData<FnccQuestCatalog>(FnccRoutes.quests(), options, query);
  }

  async categories(options?: FnccQuestFilterOptions): Promise<FnccQuestCategories> {
    return this.fetchData<FnccQuestCategories>(FnccRoutes.questCategories(), options, filterQuery(options));
  }

  async bundles(options?: FnccQuestFilterOptions): Promise<FnccQuestBundles> {
    return this.fetchData<FnccQuestBundles>(FnccRoutes.questBundles(), options, filterQuery(options));
  }

  async stw(options?: FnccQuestTextOptions): Promise<FnccStwQuests> {
    return this.fetchData<FnccStwQuests>(FnccRoutes.questsStw(), options, textQuery(options));
  }

  async get(templateId: string, options?: FnccQuestTextOptions): Promise<FnccQuestEntry> {
    this.requireString(templateId, 'templateId');
    return this.fetchData<FnccQuestEntry>(FnccRoutes.quest(templateId), options, textQuery(options));
  }

  async lookup(templateIds: string[], options?: FnccQuestTextOptions): Promise<FnccQuestLookup> {
    if (!Array.isArray(templateIds) || templateIds.length === 0) {
      throw new ValidationError('"templateIds" must be a non-empty array of quest template ids', 'templateIds');
    }
    templateIds.forEach((id, index) => this.requireString(id, `templateIds[${index}]`));
    const query = textQuery(options);
    const pages: FnccQuestLookup[] = [];
    for (let index = 0; index < templateIds.length; index += FNCC_QUEST_LOOKUP_LIMIT) {
      const ids = templateIds.slice(index, index + FNCC_QUEST_LOOKUP_LIMIT);
      pages.push(await this.postData<FnccQuestLookup>(FnccRoutes.questLookup(), { ids }, options, query));
    }
    const [first] = pages as [FnccQuestLookup, ...FnccQuestLookup[]];
    return {
      ...first,
      quests: Object.assign({}, ...pages.map((page) => page.quests)),
      stwQuests: Object.assign({}, ...pages.map((page) => page.stwQuests)),
      missing: pages.flatMap((page) => page.missing),
    };
  }
}

function textQuery(options?: FnccQuestTextOptions): QueryParams {
  const query: QueryParams = {};
  if (options?.lang) query['lang'] = options.lang;
  if (options?.rewards !== undefined) query['rewards'] = options.rewards;
  return query;
}

function filterQuery(options?: FnccQuestFilterOptions): QueryParams {
  const query = textQuery(options);
  if (options?.includeDisabled !== undefined) query['includeDisabled'] = options.includeDisabled;
  if (options?.excludeHidden !== undefined) query['excludeHidden'] = options.excludeHidden;
  if (options?.mode !== undefined) query['mode'] = Array.isArray(options.mode) ? options.mode.join(',') : options.mode;
  return query;
}
