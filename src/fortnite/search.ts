import type {
  CosmeticSeries,
  CosmeticType,
  Language,
  MatchMethod,
  BackendRarity,
  Rarity,
} from './enums.js';
import type { CosmeticSearchParams } from './options.js';
import type { QueryParams } from '../core/types.js';
import { toUnixSeconds } from '../core/utils.js';

const DATE_KEYS = new Set(['added', 'addedSince', 'lastAppearance']);

export function normalizeSearchParams(params: CosmeticSearchParams): QueryParams {
  const query: QueryParams = {};

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;

    if (DATE_KEYS.has(key)) {
      query[key] = toUnixSeconds(value as number | string | Date);
      continue;
    }

    query[key] = value as QueryParams[string];
  }

  return query;
}

export class CosmeticSearchBuilder {
  private readonly params: CosmeticSearchParams = {};

  static from(params: CosmeticSearchParams): CosmeticSearchBuilder {
    return new CosmeticSearchBuilder().merge(params);
  }

  merge(params: CosmeticSearchParams): this {
    Object.assign(this.params, params);
    return this;
  }

  language(language: Language): this {
    this.params.language = language;
    return this;
  }

  searchLanguage(language: Language): this {
    this.params.searchLanguage = language;
    return this;
  }

  matchMethod(method: MatchMethod): this {
    this.params.matchMethod = method;
    return this;
  }

  id(id: string): this {
    this.params.id = id;
    return this;
  }

  name(name: string): this {
    this.params.name = name;
    return this;
  }

  description(description: string): this {
    this.params.description = description;
    return this;
  }

  type(type: CosmeticType | (string & {})): this {
    this.params.type = type;
    return this;
  }

  displayType(displayType: string): this {
    this.params.displayType = displayType;
    return this;
  }

  backendType(backendType: string): this {
    this.params.backendType = backendType;
    return this;
  }

  rarity(rarity: Rarity | (string & {})): this {
    this.params.rarity = rarity;
    return this;
  }

  displayRarity(displayRarity: string): this {
    this.params.displayRarity = displayRarity;
    return this;
  }

  backendRarity(backendRarity: BackendRarity | (string & {})): this {
    this.params.backendRarity = backendRarity;
    return this;
  }

  hasSeries(hasSeries = true): this {
    this.params.hasSeries = hasSeries;
    return this;
  }

  series(series: string): this {
    this.params.series = series;
    return this;
  }

  backendSeries(backendSeries: CosmeticSeries | (string & {})): this {
    this.params.backendSeries = backendSeries;
    return this;
  }

  hasSet(hasSet = true): this {
    this.params.hasSet = hasSet;
    return this;
  }

  set(set: string): this {
    this.params.set = set;
    return this;
  }

  setText(setText: string): this {
    this.params.setText = setText;
    return this;
  }

  backendSet(backendSet: string): this {
    this.params.backendSet = backendSet;
    return this;
  }

  hasIntroduction(hasIntroduction = true): this {
    this.params.hasIntroduction = hasIntroduction;
    return this;
  }

  backendIntroduction(backendIntroduction: number): this {
    this.params.backendIntroduction = backendIntroduction;
    return this;
  }

  introductionChapter(chapter: string | number): this {
    this.params.introductionChapter = chapter;
    return this;
  }

  introductionSeason(season: string | number): this {
    this.params.introductionSeason = season;
    return this;
  }

  hasFeaturedImage(hasFeaturedImage = true): this {
    this.params.hasFeaturedImage = hasFeaturedImage;
    return this;
  }

  hasVariants(hasVariants = true): this {
    this.params.hasVariants = hasVariants;
    return this;
  }

  hasGameplayTags(hasGameplayTags = true): this {
    this.params.hasGameplayTags = hasGameplayTags;
    return this;
  }

  gameplayTag(tag: string): this {
    this.params.gameplayTag = tag;
    return this;
  }

  hasMetaTags(hasMetaTags = true): this {
    this.params.hasMetaTags = hasMetaTags;
    return this;
  }

  metaTag(tag: string): this {
    this.params.metaTag = tag;
    return this;
  }

  hasDynamicPakId(hasDynamicPakId = true): this {
    this.params.hasDynamicPakId = hasDynamicPakId;
    return this;
  }

  dynamicPakId(dynamicPakId: string): this {
    this.params.dynamicPakId = dynamicPakId;
    return this;
  }

  added(value: number | string | Date): this {
    this.params.added = value;
    return this;
  }

  addedSince(value: number | string | Date): this {
    this.params.addedSince = value;
    return this;
  }

  unseenFor(days: number): this {
    this.params.unseenFor = days;
    return this;
  }

  lastAppearance(value: number | string | Date): this {
    this.params.lastAppearance = value;
    return this;
  }

  toParams(): CosmeticSearchParams {
    return { ...this.params };
  }

  build(): QueryParams {
    return normalizeSearchParams(this.params);
  }
}
