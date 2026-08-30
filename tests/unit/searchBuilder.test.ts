import { describe, expect, it } from 'vitest';
import { CosmeticSearchBuilder, normalizeSearchParams } from '../../src/fortnite/search.js';
import { FortniteAPI } from '../../src/fortnite/client.js';
import { Language, MatchMethod, Rarity } from '../../src/fortnite/enums.js';
import type { CosmeticSearchParams } from '../../src/fortnite/options.js';
import { brCosmeticFixture } from '../helpers/fixtures.js';
import { createMockFetch, envelope } from '../helpers/mockFetch.js';
const JANUARY_2024_SECONDS = 1704067200;
const JANUARY_2024_MS = JANUARY_2024_SECONDS * 1000;
const JANUARY_2024_ISO = '2024-01-01T00:00:00.000Z';

const setterCases: Array<{
  name: string;
  apply: (builder: CosmeticSearchBuilder) => CosmeticSearchBuilder;
  expected: CosmeticSearchParams;
}> = [
  { name: 'language', apply: (b) => b.language(Language.German), expected: { language: 'de' } },
  {
    name: 'searchLanguage',
    apply: (b) => b.searchLanguage(Language.French),
    expected: { searchLanguage: 'fr' },
  },
  {
    name: 'matchMethod',
    apply: (b) => b.matchMethod(MatchMethod.Contains),
    expected: { matchMethod: 'contains' },
  },
  { name: 'id', apply: (b) => b.id('CID_028'), expected: { id: 'CID_028' } },
  { name: 'name', apply: (b) => b.name('Renegade Raider'), expected: { name: 'Renegade Raider' } },
  {
    name: 'description',
    apply: (b) => b.description('Rare outfit'),
    expected: { description: 'Rare outfit' },
  },
  { name: 'type', apply: (b) => b.type('outfit'), expected: { type: 'outfit' } },
  { name: 'displayType', apply: (b) => b.displayType('Outfit'), expected: { displayType: 'Outfit' } },
  {
    name: 'backendType',
    apply: (b) => b.backendType('AthenaCharacter'),
    expected: { backendType: 'AthenaCharacter' },
  },
  { name: 'rarity', apply: (b) => b.rarity(Rarity.Rare), expected: { rarity: 'rare' } },
  {
    name: 'displayRarity',
    apply: (b) => b.displayRarity('Rare'),
    expected: { displayRarity: 'Rare' },
  },
  {
    name: 'backendRarity',
    apply: (b) => b.backendRarity('EFortRarity::Rare'),
    expected: { backendRarity: 'EFortRarity::Rare' },
  },
  { name: 'hasSeries', apply: (b) => b.hasSeries(), expected: { hasSeries: true } },
  { name: 'series', apply: (b) => b.series('Marvel Series'), expected: { series: 'Marvel Series' } },
  {
    name: 'backendSeries',
    apply: (b) => b.backendSeries('MarvelSeries'),
    expected: { backendSeries: 'MarvelSeries' },
  },
  { name: 'hasSet', apply: (b) => b.hasSet(), expected: { hasSet: true } },
  { name: 'set', apply: (b) => b.set('Renegade'), expected: { set: 'Renegade' } },
  {
    name: 'setText',
    apply: (b) => b.setText('Part of the Renegade set.'),
    expected: { setText: 'Part of the Renegade set.' },
  },
  { name: 'backendSet', apply: (b) => b.backendSet('Renegade'), expected: { backendSet: 'Renegade' } },
  { name: 'hasIntroduction', apply: (b) => b.hasIntroduction(), expected: { hasIntroduction: true } },
  {
    name: 'backendIntroduction',
    apply: (b) => b.backendIntroduction(1),
    expected: { backendIntroduction: 1 },
  },
  {
    name: 'introductionChapter',
    apply: (b) => b.introductionChapter('1'),
    expected: { introductionChapter: '1' },
  },
  {
    name: 'introductionSeason',
    apply: (b) => b.introductionSeason(1),
    expected: { introductionSeason: 1 },
  },
  {
    name: 'hasFeaturedImage',
    apply: (b) => b.hasFeaturedImage(),
    expected: { hasFeaturedImage: true },
  },
  { name: 'hasVariants', apply: (b) => b.hasVariants(), expected: { hasVariants: true } },
  { name: 'hasGameplayTags', apply: (b) => b.hasGameplayTags(), expected: { hasGameplayTags: true } },
  {
    name: 'gameplayTag',
    apply: (b) => b.gameplayTag('Cosmetics.Source.ItemShop'),
    expected: { gameplayTag: 'Cosmetics.Source.ItemShop' },
  },
  { name: 'hasMetaTags', apply: (b) => b.hasMetaTags(), expected: { hasMetaTags: true } },
  { name: 'metaTag', apply: (b) => b.metaTag('Meta.Tag'), expected: { metaTag: 'Meta.Tag' } },
  {
    name: 'hasDynamicPakId',
    apply: (b) => b.hasDynamicPakId(),
    expected: { hasDynamicPakId: true },
  },
  {
    name: 'dynamicPakId',
    apply: (b) => b.dynamicPakId('PakId_1'),
    expected: { dynamicPakId: 'PakId_1' },
  },
  {
    name: 'added',
    apply: (b) => b.added(JANUARY_2024_SECONDS),
    expected: { added: JANUARY_2024_SECONDS },
  },
  {
    name: 'addedSince',
    apply: (b) => b.addedSince(JANUARY_2024_ISO),
    expected: { addedSince: JANUARY_2024_ISO },
  },
  { name: 'unseenFor', apply: (b) => b.unseenFor(30), expected: { unseenFor: 30 } },
  {
    name: 'lastAppearance',
    apply: (b) => b.lastAppearance(JANUARY_2024_MS),
    expected: { lastAppearance: JANUARY_2024_MS },
  },
];

const booleanCases: Array<{
  name: string;
  key: keyof CosmeticSearchParams;
  withDefault: (builder: CosmeticSearchBuilder) => CosmeticSearchBuilder;
  withFalse: (builder: CosmeticSearchBuilder) => CosmeticSearchBuilder;
}> = [
  {
    name: 'hasSeries',
    key: 'hasSeries',
    withDefault: (b) => b.hasSeries(),
    withFalse: (b) => b.hasSeries(false),
  },
  { name: 'hasSet', key: 'hasSet', withDefault: (b) => b.hasSet(), withFalse: (b) => b.hasSet(false) },
  {
    name: 'hasIntroduction',
    key: 'hasIntroduction',
    withDefault: (b) => b.hasIntroduction(),
    withFalse: (b) => b.hasIntroduction(false),
  },
  {
    name: 'hasFeaturedImage',
    key: 'hasFeaturedImage',
    withDefault: (b) => b.hasFeaturedImage(),
    withFalse: (b) => b.hasFeaturedImage(false),
  },
  {
    name: 'hasVariants',
    key: 'hasVariants',
    withDefault: (b) => b.hasVariants(),
    withFalse: (b) => b.hasVariants(false),
  },
  {
    name: 'hasGameplayTags',
    key: 'hasGameplayTags',
    withDefault: (b) => b.hasGameplayTags(),
    withFalse: (b) => b.hasGameplayTags(false),
  },
  {
    name: 'hasMetaTags',
    key: 'hasMetaTags',
    withDefault: (b) => b.hasMetaTags(),
    withFalse: (b) => b.hasMetaTags(false),
  },
  {
    name: 'hasDynamicPakId',
    key: 'hasDynamicPakId',
    withDefault: (b) => b.hasDynamicPakId(),
    withFalse: (b) => b.hasDynamicPakId(false),
  },
];

const dateCases: Array<{ label: string; value: number | string | Date }> = [
  { label: 'a Date', value: new Date(JANUARY_2024_ISO) },
  { label: 'an ISO string', value: JANUARY_2024_ISO },
  { label: 'a millisecond epoch', value: JANUARY_2024_MS },
  { label: 'a second epoch', value: JANUARY_2024_SECONDS },
];

describe('CosmeticSearchBuilder setters', () => {
  for (const setter of setterCases) {
    it(`${setter.name}() stores the value and returns the builder`, () => {
      const builder = new CosmeticSearchBuilder();

      expect(setter.apply(builder)).toBe(builder);
      expect(builder.toParams()).toEqual(setter.expected);
    });
  }

  it('chains setters into a single params object', () => {
    const builder = new CosmeticSearchBuilder()
      .name('Renegade Raider')
      .rarity(Rarity.Rare)
      .type('outfit')
      .matchMethod(MatchMethod.Full)
      .unseenFor(30);

    expect(builder.toParams()).toEqual({
      name: 'Renegade Raider',
      rarity: 'rare',
      type: 'outfit',
      matchMethod: 'full',
      unseenFor: 30,
    });
  });
});

describe('CosmeticSearchBuilder boolean setters', () => {
  for (const booleanCase of booleanCases) {
    it(`${booleanCase.name}() defaults to true and respects an explicit false`, () => {
      expect(booleanCase.withDefault(new CosmeticSearchBuilder()).toParams()[booleanCase.key]).toBe(
        true,
      );
      expect(booleanCase.withFalse(new CosmeticSearchBuilder()).toParams()[booleanCase.key]).toBe(
        false,
      );
    });
  }
});

describe('CosmeticSearchBuilder.toParams', () => {
  it('returns a copy that does not affect the builder', () => {
    const builder = new CosmeticSearchBuilder().name('Renegade Raider').unseenFor(30);
    const params = builder.toParams();

    params.name = 'Ghoul Trooper';
    delete params.unseenFor;

    expect(builder.toParams()).toEqual({ name: 'Renegade Raider', unseenFor: 30 });
  });
});

describe('CosmeticSearchBuilder.build', () => {
  for (const dateCase of dateCases) {
    it(`converts added from ${dateCase.label} to unix seconds`, () => {
      const query = new CosmeticSearchBuilder().added(dateCase.value).build();

      expect(query).toEqual({ added: JANUARY_2024_SECONDS });
    });

    it(`converts addedSince from ${dateCase.label} to unix seconds`, () => {
      const query = new CosmeticSearchBuilder().addedSince(dateCase.value).build();

      expect(query).toEqual({ addedSince: JANUARY_2024_SECONDS });
    });

    it(`converts lastAppearance from ${dateCase.label} to unix seconds`, () => {
      const query = new CosmeticSearchBuilder().lastAppearance(dateCase.value).build();

      expect(query).toEqual({ lastAppearance: JANUARY_2024_SECONDS });
    });
  }

  it('passes non-date params through untouched', () => {
    const query = new CosmeticSearchBuilder()
      .name('Renegade Raider')
      .rarity(Rarity.Rare)
      .backendIntroduction(1)
      .hasVariants(false)
      .unseenFor(30)
      .build();

    expect(query).toEqual({
      name: 'Renegade Raider',
      rarity: 'rare',
      backendIntroduction: 1,
      hasVariants: false,
      unseenFor: 30,
    });
  });

  it('drops undefined and null params', () => {
    const query = CosmeticSearchBuilder.from({
      name: 'Renegade Raider',
      description: undefined,
      set: null as unknown as string,
      added: undefined,
    }).build();

    expect(query).toEqual({ name: 'Renegade Raider' });
    expect(Object.keys(query)).toEqual(['name']);
  });
});

describe('CosmeticSearchBuilder.from and merge', () => {
  it('from() seeds the builder with the given params', () => {
    const builder = CosmeticSearchBuilder.from({ name: 'Renegade Raider', hasSeries: true });

    expect(builder).toBeInstanceOf(CosmeticSearchBuilder);
    expect(builder.toParams()).toEqual({ name: 'Renegade Raider', hasSeries: true });
  });

  it('merge() adds params, overrides existing keys and returns the builder', () => {
    const builder = new CosmeticSearchBuilder().name('Renegade Raider').unseenFor(30);

    expect(builder.merge({ name: 'Ghoul Trooper', rarity: Rarity.Epic })).toBe(builder);
    expect(builder.toParams()).toEqual({
      name: 'Ghoul Trooper',
      rarity: 'epic',
      unseenFor: 30,
    });
  });

  it('from() does not keep a reference to the source params', () => {
    const source: CosmeticSearchParams = { name: 'Renegade Raider' };
    const builder = CosmeticSearchBuilder.from(source);

    source.name = 'Ghoul Trooper';

    expect(builder.toParams()).toEqual({ name: 'Renegade Raider' });
  });
});

describe('normalizeSearchParams', () => {
  it('matches the builder output for the same params', () => {
    const params: CosmeticSearchParams = {
      name: 'Renegade Raider',
      rarity: Rarity.Rare,
      hasSeries: false,
      added: new Date(JANUARY_2024_ISO),
      addedSince: JANUARY_2024_MS,
      lastAppearance: JANUARY_2024_ISO,
      unseenFor: 30,
    };

    expect(normalizeSearchParams(params)).toEqual(CosmeticSearchBuilder.from(params).build());
  });

  it('converts date params to unix seconds and drops empty values', () => {
    const query = normalizeSearchParams({
      added: new Date(JANUARY_2024_ISO),
      addedSince: JANUARY_2024_MS,
      lastAppearance: JANUARY_2024_SECONDS,
      name: 'Renegade Raider',
      description: undefined,
      set: null as unknown as string,
    });

    expect(query).toEqual({
      added: JANUARY_2024_SECONDS,
      addedSince: JANUARY_2024_SECONDS,
      lastAppearance: JANUARY_2024_SECONDS,
      name: 'Renegade Raider',
    });
  });
});

describe('CosmeticSearchBuilder with the client', () => {
  it('produces the same query as the equivalent plain object', async () => {
    const mock = createMockFetch({ body: envelope(brCosmeticFixture) });
    const client = new FortniteAPI({ fetch: mock.fetch, retry: false });

    const params: CosmeticSearchParams = {
      name: 'Renegade Raider',
      rarity: Rarity.Rare,
      matchMethod: MatchMethod.Full,
      hasVariants: false,
      addedSince: JANUARY_2024_ISO,
    };

    await client.cosmetics.search(params);
    const objectRequest = mock.lastRequest();
    const objectPath = objectRequest.path;
    const objectQuery = objectRequest.query.toString();

    await client.cosmetics.search(CosmeticSearchBuilder.from(params));
    const builderRequest = mock.lastRequest();

    expect(builderRequest.path).toBe(objectPath);
    expect(builderRequest.query.toString()).toBe(objectQuery);
    expect(builderRequest.query.get('addedSince')).toBe(String(JANUARY_2024_SECONDS));
  });
});
