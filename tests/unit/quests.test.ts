import { describe, expect, it, vi } from 'vitest';
import { RateLimitError, ValidationError } from '../../src/core/errors.js';
import { QuestBook, QuestCatalog, type QuestAssetSource } from '../../src/quests.js';
import type { EpicAuthSession } from '../../src/epic/session.js';
import type { QuestProgressResponse } from '../../src/epic/quests.js';

const text = (value: string) => ({ SourceString: value, LocalizedString: value });

function questDisplay(templateId: string, name: string, tags: string[], extra: { count?: number; sort?: number; visible?: boolean } = {}) {
  const id = templateId.split(':')[1]!;
  return [
    {
      Type: 'FortQuestDisplayDataAsset',
      Properties: {
        TemplateId: templateId,
        OwnedGameplayTags: tags,
        Objectives: [{ ObjectiveId: `${id}_OBJ0`, Description: text(name), Count: extra.count ?? 10 }],
        ExtensionData: [
          { bIsVisibleToPlayers: extra.visible ?? true, QuestVisiblityData: { bIsVisibleWhenClaimed: false } },
          { DisplayName: text(name), Description: text(name), QuestType: 'EFortQuestType::Athena', SortPriority: extra.sort ?? 0 },
        ],
      },
    },
  ];
}

const ASSETS: Record<string, unknown> = {
  'QuestDisplayData/Content/BR/QuestDisplayData_quest_weekly_a': questDisplay('Quest:quest_weekly_a', 'Outlast players', ['QuestCategory.BR.Weekly.01'], { count: 20, sort: 2 }),
  'QuestDisplayData/Content/BR/QuestDisplayData_quest_weekly_b': questDisplay('Quest:quest_weekly_b', 'Deal damage', ['QuestCategory.BR.Weekly.01'], { count: 5, sort: 1 }),
  'QuestDisplayData/Content/Sparks/QuestDisplayData_quest_jam': questDisplay('Quest:quest_jam', 'Play songs', ['QuestCategory.Sparks.Jam.Daily']),
  'QuestDisplayData/Content/BR/QuestDisplayData_quest_hidden': questDisplay('Quest:quest_hidden', 'Granter', ['QuestCategory.BR.Weekly.01'], { visible: false }),
  'QuestDisplayData/Content/BR/QuestDisplayData_quest_loose': questDisplay('Quest:quest_loose', 'Loose quest', ['QuestCategory.Nothing']),
  'Cats/QC_Weekly': [
    {
      Type: 'QuestCategoryData',
      Name: 'QC_Weekly',
      Properties: {
        DisplayName: text('Weekly'),
        SortOrder: 20,
        IncludeTags: ['QuestCategory.BR.Weekly'],
        DefaultHeaderName: text('This Week'),
        AdditionalHeaders: [{ HeaderName: text('Week 1'), HeaderTag: { TagName: 'QuestCategory.BR.Weekly.01' }, HeaderSortOrder: 5 }],
      },
    },
  ],
  'Cats/QC_Jam': [
    { Type: 'QuestCategoryData', Name: 'QC_Jam', Properties: { DisplayName: text('Jam Stage'), SortOrder: 10, IncludeTags: ['QuestCategory.Sparks.Jam'] } },
  ],
  'Cats/QC_Disabled': [
    { Type: 'QuestCategoryData', Name: 'QC_Disabled', Properties: { DisplayName: text('Off'), bCategoryEnabled: false, IncludeTags: ['QuestCategory.BR'] } },
  ],
  'SaveTheWorld/Content/Quests/Daily_Kill': [
    {
      Type: 'FortQuestItemDefinition_Campaign',
      Properties: {
        ItemName: text('Husk Hunter'),
        ItemDescription: text('Eliminate husks'),
        Category: { RowName: 'DailyQuests' },
        Objectives: [{ BackendName: 'Daily_Kill_Obj', Description: text('Eliminate 100 husks'), Count: 100 }],
      },
    },
  ],
  'FortniteGame/Content/Quests/QuestCategoryTable': [
    { Rows: { DailyQuests: { Name: text('Daily Quests'), SortPriority: 500 }, MainQuests: { Name: text('Main Quests'), SortPriority: 960 } } },
  ],
};

function assetSource(): QuestAssetSource & { json: ReturnType<typeof vi.fn>; search: ReturnType<typeof vi.fn> } {
  const paths = Object.keys(ASSETS).map((path) => `${path}.uasset`);
  return {
    search: vi.fn(async (query: string) => {
      const items = paths.filter((path) => path.includes(query)).map((path) => ({ path }));
      return { total: items.length, items };
    }),
    json: vi.fn(async (path: string) => {
      if (!(path in ASSETS)) throw new Error(`missing ${path}`);
      return ASSETS[path];
    }),
  } as never;
}

function progress(): QuestProgressResponse {
  const quest = (templateId: string, itemId: string, quantity: number, state = 'Active') => ({
    templateId,
    itemId,
    state,
    objectives: [{ statName: `${templateId.split(':')[1]}_obj0`, quantity, stage: -1 }],
    challengeBundleId: 'bundle-1',
    expiryTime: null,
    productTags: [],
  });
  return {
    questProgress: {
      quests: [
        quest('Quest:quest_weekly_a', 'q-a', 5),
        quest('Quest:quest_weekly_b', 'q-b', 5),
        quest('Quest:quest_jam', 'q-jam', 0),
        quest('Quest:quest_hidden', 'q-hidden', 0),
        quest('Quest:quest_loose', 'q-loose', 1),
        quest('Quest:quest_done', 'q-done', 1, 'Claimed'),
      ],
      challengeBundles: [
        {
          itemId: 'bundle-1',
          templateId: 'ChallengeBundle:bundle_weekly',
          challengeScheduleId: 'schedule-1',
          attributes: { num_granted_bundle_quests: 2, num_quests_completed: 1, grantedquestinstanceids: ['q-a', 'q-b'] },
        },
      ],
      challengeBundleSchedules: [
        { itemId: 'schedule-1', templateId: 'ChallengeBundleSchedule:schedule_weekly', attributes: { unlock_epoch: '2026-10-01T00:00:00Z' } },
      ],
      trackedQuests: ['Quest:quest_weekly_a'],
    },
    tokens: [],
    accountXp: { seasonNumber: 42, seasonLevel: 212, seasonXp: 100, seasonBegin: '2026-08-13T13:00:00Z', restedXp: 0 },
  };
}

function mockSession() {
  const fns = {
    questProgress: vi.fn(async () => progress()),
    queryProfile: vi.fn(async () => ({
      profileChanges: [
        {
          profile: {
            items: {
              'stw-1': { templateId: 'Quest:daily_kill', attributes: { quest_state: 'Active', completion_daily_kill_obj: 40 } },
              'stw-2': { templateId: 'Quest:unknown_quest', attributes: { quest_state: 'Active', completion_thing: 2 } },
              'stw-3': { templateId: 'Quest:old_one', attributes: { quest_state: 'Claimed' } },
              'hero-1': { templateId: 'Hero:hid_x', attributes: {} },
            },
            stats: { attributes: { quest_manager: { dailyQuestRerolls: 1 } } },
          },
        },
      ],
    })),
    claimQuestReward: vi.fn(async () => ({})),
    rerollDailyQuest: vi.fn(async () => ({})),
    trackQuests: vi.fn(async () => ({})),
  };
  return { session: fns as unknown as EpicAuthSession, ...fns };
}

describe('QuestBook battle royale & modes', () => {
  it('groups visible quests into game categories and headers in game order', async () => {
    const { session } = mockSession();
    const log = await new QuestBook(session, new QuestCatalog(assetSource())).log();

    expect(log.enriched).toBe(true);
    expect(log.categories.map((category) => category.name)).toEqual(['Jam Stage', 'Weekly']);
    const weekly = log.categories[1]!;
    expect(weekly).toMatchObject({ mode: 'battle-royale', product: 'BR', sortOrder: 20 });
    expect(weekly.headers.map((header) => header.name)).toEqual(['Week 1']);
    expect(weekly.quests.map((quest) => quest.name)).toEqual(['Outlast players', 'Deal damage']);
    expect(log.categories[0]?.mode).toBe('festival');
    expect(log.uncategorized.map((quest) => quest.name)).toEqual(['Loose quest']);
    expect(log.quests.some((quest) => quest.templateId === 'Quest:quest_hidden')).toBe(false);
    expect(log.quests.some((quest) => quest.claimed)).toBe(false);
    expect(log.xp?.seasonLevel).toBe(212);
  });

  it('works out objective progress, completion, tracking and bundle context', async () => {
    const { session } = mockSession();
    const log = await new QuestBook(session, new QuestCatalog(assetSource())).log();
    const outlast = log.quests.find((quest) => quest.id === 'q-a')!;
    expect(outlast).toMatchObject({
      profile: 'athena',
      state: 'active',
      completed: false,
      progress: 0.25,
      tracked: true,
      bundleTemplateId: 'ChallengeBundle:bundle_weekly',
      scheduleTemplateId: 'ChallengeBundleSchedule:schedule_weekly',
      objectives: [{ description: 'Outlast players', progress: 5, target: 20, completed: false }],
    });
    const damage = log.quests.find((quest) => quest.id === 'q-b')!;
    expect(damage.completed).toBe(true);
    expect(damage.progress).toBe(1);
    expect(log.bundles[0]).toMatchObject({ completed: 1, total: 2, scheduleTemplateId: 'ChallengeBundleSchedule:schedule_weekly' });
  });

  it('filters by mode and can include claimed and hidden quests', async () => {
    const { session } = mockSession();
    const book = new QuestBook(session, new QuestCatalog(assetSource()));
    const festival = await book.log({ mode: 'festival' });
    expect(festival.categories.map((category) => category.name)).toEqual(['Jam Stage']);
    expect(festival.quests.map((quest) => quest.id)).toEqual(['q-jam']);
    expect(festival.uncategorized).toEqual([]);

    const everything = await book.log({ includeClaimed: true, includeHidden: true });
    expect(everything.quests.map((quest) => quest.id)).toContain('q-hidden');
    expect(everything.quests.find((quest) => quest.id === 'q-done')).toMatchObject({ claimed: true, completed: true, name: null, visible: false });
  });

  it('returns raw progress without a catalog and refuses enrich without one', async () => {
    const { session } = mockSession();
    const log = await new QuestBook(session).log();
    expect(log.enriched).toBe(false);
    expect(log.categories).toEqual([]);
    expect(log.quests).toHaveLength(5);
    expect(log.quests[0]?.name).toBeNull();
    await expect(new QuestBook(session).log({ enrich: true })).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('QuestBook save the world', () => {
  it('groups campaign quests by the STW category table', async () => {
    const { session } = mockSession();
    const log = await new QuestBook(session, new QuestCatalog(assetSource())).stw();
    expect(log.categories).toHaveLength(1);
    expect(log.categories[0]).toMatchObject({ id: 'DailyQuests', name: 'Daily Quests', sortPriority: 500 });
    expect(log.categories[0]?.quests[0]).toMatchObject({
      id: 'stw-1',
      profile: 'campaign',
      name: 'Husk Hunter',
      progress: 0.4,
      objectives: [{ id: 'daily_kill_obj', description: 'Eliminate 100 husks', progress: 40, target: 100 }],
    });
    expect(log.uncategorized.map((quest) => quest.id)).toEqual(['stw-2']);
    expect(log.uncategorized[0]?.objectives).toEqual([
      { id: 'thing', description: null, progress: 2, target: null, completed: false, stage: null, stageCount: null },
    ]);
    expect(log.quests.some((quest) => quest.id === 'stw-3')).toBe(false);
    expect(log.dailies.map((quest) => quest.id)).toEqual(['stw-1']);
    expect(log.dailyRerolls).toBe(1);
  });
});

describe('QuestBook actions', () => {
  it('claims, rerolls and tracks on the right profile', async () => {
    const { session, claimQuestReward, rerollDailyQuest, trackQuests } = mockSession();
    const book = new QuestBook(session, new QuestCatalog(assetSource()));
    const stw = await book.stw();
    const quest = stw.quests[0]!;
    await book.claim(quest, { selectedRewardIndex: 1 });
    expect(claimQuestReward).toHaveBeenCalledWith('stw-1', { selectedRewardIndex: 1, profile: 'campaign' });
    await book.reroll(quest);
    expect(rerollDailyQuest).toHaveBeenCalledWith('stw-1', { profile: 'campaign' });
    await book.track(['Quest:quest_weekly_a']);
    expect(trackQuests).toHaveBeenCalledWith(['Quest:quest_weekly_a'], {});
  });
});

describe('QuestCatalog', () => {
  it('caches lookups so a second log does no asset requests', async () => {
    const { session } = mockSession();
    const assets = assetSource();
    const book = new QuestBook(session, new QuestCatalog(assets));
    await book.log();
    const calls = assets.json.mock.calls.length + assets.search.mock.calls.length;
    await book.log();
    expect(assets.json.mock.calls.length + assets.search.mock.calls.length).toBe(calls);
  });

  it('exports a snapshot that restores without any asset source', async () => {
    const { session } = mockSession();
    const catalog = new QuestCatalog(assetSource());
    const first = await new QuestBook(session, catalog).log();
    const snapshot = JSON.parse(JSON.stringify(await catalog.export()));
    expect(snapshot.version).toBe(1);
    const restored = await new QuestBook(session, QuestCatalog.from(snapshot)).log();
    expect(restored.categories.map((category) => category.name)).toEqual(first.categories.map((category) => category.name));
    expect(restored.quests.map((quest) => quest.name)).toEqual(first.quests.map((quest) => quest.name));
    expect(() => QuestCatalog.from({ version: 2 } as never)).toThrow(ValidationError);
  });

  it('waits out fn-api.cc rate limits instead of dropping data', async () => {
    vi.useFakeTimers();
    try {
      const { session } = mockSession();
      const assets = assetSource();
      const real = assets.json.getMockImplementation()!;
      let limited = false;
      assets.json.mockImplementation(async (path: string) => {
        if (!limited && path.includes('quest_weekly_a')) {
          limited = true;
          throw new RateLimitError('slow down', { status: 429, retryAfter: 1000 } as never);
        }
        return real(path);
      });
      const pending = new QuestBook(session, new QuestCatalog(assets)).log();
      await vi.advanceTimersByTimeAsync(1000);
      const log = await pending;
      expect(log.quests.find((quest) => quest.id === 'q-a')?.name).toBe('Outlast players');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('QuestCatalog with the fn-api.cc quests endpoint', () => {
  const quest = (templateId: string, name: string, extra: Record<string, unknown> = {}) => ({
    templateId,
    name,
    description: name,
    flavorText: null,
    type: null,
    subtype: null,
    sortPriority: null,
    tags: ['QuestCategory.BR.Weekly.01'],
    visibleToPlayers: true,
    visibleWhen: {},
    allowPinning: true,
    objectives: {},
    rewards: null,
    path: 'p',
    ...extra,
  });
  const category = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
    id,
    name,
    description: null,
    sortOrder: 20,
    enabled: true,
    alwaysDisplay: false,
    includeTags: ['QuestCategory.BR.Weekly'],
    product: 'BR',
    mode: 'battle-royale',
    defaultHeader: { name: 'This Week', sortOrder: 0 },
    headers: [],
    path: 'p',
    ...extra,
  });

  function endpointCatalog() {
    return {
      build: '++Fortnite+Release-42.30-CL-1',
      generatedAt: 'now',
      lang: 'en',
      quests: {
        'quest:quest_weekly_a': quest('quest:quest_weekly_a', 'Outlast players', {
          sortPriority: 2,
          visibleWhen: { active: true, claimed: false },
          objectives: { quest_weekly_a_obj0: { description: 'Outlast players', hudDescription: null, count: 20 } },
        }),
        'quest:quest_hidden': quest('quest:quest_hidden', 'Granter', { visibleToPlayers: false }),
      },
      bundles: {},
      categories: [
        category('QC_Weekly', 'Weekly', {
          headers: [{ name: 'Week 1', description: null, tag: 'QuestCategory.BR.Weekly.01', sortOrder: 5 }],
        }),
        category('QC_Off', 'Off', { enabled: false, sortOrder: 1, includeTags: ['QuestCategory.BR'] }),
      ],
      stwQuests: {
        'quest:daily_kill': {
          templateId: 'quest:daily_kill',
          name: 'Husk Hunter',
          description: 'Eliminate husks',
          completionText: null,
          type: 'Optional',
          category: 'DailyQuests',
          objectives: { daily_kill_obj: { description: 'Eliminate 100 husks', hudDescription: null, count: 100 } },
          rewards: null,
          path: 'p',
        },
      },
      stwCategories: { dailyquests: { id: 'DailyQuests', name: 'Daily Quests', sortPriority: 500 } },
    } as never;
  }

  it('loads everything in one request and never touches assets', async () => {
    const { session } = mockSession();
    const source = { catalog: vi.fn(async () => endpointCatalog()) };
    const catalog = new QuestCatalog(source, { lang: 'de' });
    const book = new QuestBook(session, catalog);

    const log = await book.log();
    const stw = await book.stw();
    await book.log({ mode: 'battle-royale' });

    expect(source.catalog).toHaveBeenCalledTimes(1);
    expect(source.catalog).toHaveBeenCalledWith({ lang: 'de' });
    expect(catalog.build).toBe('++Fortnite+Release-42.30-CL-1');
    expect(log.categories.map((entry) => entry.name)).toEqual(['Weekly']);
    expect(log.categories[0]?.headers[0]?.name).toBe('Week 1');
    expect(log.quests.find((entry) => entry.id === 'q-a')).toMatchObject({ name: 'Outlast players', progress: 0.25 });
    expect(log.quests.some((entry) => entry.id === 'q-hidden')).toBe(false);
    expect(log.quests.some((entry) => entry.id === 'q-jam')).toBe(false);
    expect(stw.categories[0]).toMatchObject({ name: 'Daily Quests' });
    expect(stw.categories[0]?.quests[0]).toMatchObject({ name: 'Husk Hunter', progress: 0.4 });
  });

  it('retries after a failed load and reloads after refresh', async () => {
    const { session } = mockSession();
    const source = {
      catalog: vi.fn().mockRejectedValueOnce(new Error('down')).mockImplementation(async () => endpointCatalog()),
    };
    const catalog = new QuestCatalog(source);
    const book = new QuestBook(session, catalog);
    await expect(book.log()).rejects.toThrow('down');
    expect((await book.log()).categories).toHaveLength(1);
    catalog.refresh();
    expect(catalog.build).toBeNull();
    await book.log();
    expect(source.catalog).toHaveBeenCalledTimes(3);
  });

  it('round-trips a complete snapshot that needs no source', async () => {
    const { session } = mockSession();
    const catalog = new QuestCatalog({ catalog: async () => endpointCatalog() });
    const before = await new QuestBook(session, catalog).log();
    const snapshot = JSON.parse(JSON.stringify(await catalog.export()));
    expect(snapshot).toMatchObject({ complete: true, build: '++Fortnite+Release-42.30-CL-1' });

    const restored = QuestCatalog.from(snapshot);
    const after = await new QuestBook(session, restored).log();
    expect(after.quests.map((entry) => entry.name)).toEqual(before.quests.map((entry) => entry.name));
    expect(restored.build).toBe('++Fortnite+Release-42.30-CL-1');
  });
});

describe('QuestBook names the way the game does', () => {
  it('falls back to the description for untitled quests and hides quests kept out of categories', async () => {
    const entry = (templateId: string, itemId: string) => ({
      templateId,
      itemId,
      state: 'Active',
      objectives: [{ statName: `${templateId.split(':')[1]}_obj0`, quantity: 0, stage: -1 }],
      challengeBundleId: null,
      expiryTime: null,
      productTags: [],
    });
    const session = {
      questProgress: vi.fn(async () => ({
        questProgress: {
          quests: [entry('Quest:story_q01', 'q-story'), entry('Quest:tracker_q01', 'q-tracker'), entry('Quest:obj_only', 'q-obj')],
          challengeBundles: [],
          challengeBundleSchedules: [],
          trackedQuests: [],
        },
        tokens: [],
      })),
    } as unknown as EpicAuthSession;
    const base = {
      flavorText: null,
      type: null,
      subtype: null,
      sortPriority: null,
      tags: ['QuestCategory.BR.Story'],
      visibleToPlayers: true,
      visibleWhen: {},
      allowPinning: true,
      rewards: null,
      path: 'p',
    };
    const source = {
      catalog: async () =>
        ({
          build: 'b',
          generatedAt: 'g',
          lang: 'en',
          quests: {
            'quest:story_q01': {
              ...base,
              templateId: 'quest:story_q01',
              name: null,
              description: 'Talk to Bastian',
              completionText: 'Agreed to help Bastian!',
              objectives: { story_q01_obj0: { description: null, hudDescription: null, count: 1, displayStage: 1, displayMaxStage: 4 } },
            },
            'quest:tracker_q01': {
              ...base,
              templateId: 'quest:tracker_q01',
              name: null,
              description: null,
              includedInCategories: false,
              objectives: { tracker_q01_obj0: { description: null, hudDescription: null, count: 1 } },
            },
            'quest:obj_only': {
              ...base,
              templateId: 'quest:obj_only',
              name: null,
              description: null,
              objectives: { obj_only_obj0: { description: 'Search chests', hudDescription: null, count: 5 } },
            },
          },
          bundles: {},
          categories: [],
          stwQuests: {},
          stwCategories: {},
        }) as never,
    };

    const log = await new QuestBook(session, new QuestCatalog(source)).log();
    const story = log.quests.find((quest) => quest.id === 'q-story');
    expect(story?.name).toBe('Talk to Bastian');
    expect(story?.objectives[0]).toMatchObject({ description: 'Talk to Bastian', stage: 1, stageCount: 4 });
    expect(story?.completionText).toBe('Agreed to help Bastian!');
    expect(log.quests.find((quest) => quest.id === 'q-obj')?.name).toBe('Search chests');
    expect(log.quests.some((quest) => quest.id === 'q-tracker')).toBe(false);

    const everything = await new QuestBook(session, new QuestCatalog(source)).log({ includeHidden: true });
    expect(everything.quests.find((quest) => quest.id === 'q-tracker')).toMatchObject({ visible: false, name: null });
  });
});
