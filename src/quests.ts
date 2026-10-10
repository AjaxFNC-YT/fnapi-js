import { RateLimitError, ValidationError } from './core/errors.js';
import { sleep } from './core/utils.js';
import type { MCPResponse } from './epic/mcp.js';
import type {
  ChallengeBundleEntry,
  ChallengeScheduleEntry,
  QuestAccountXp,
  QuestProgressEntry,
} from './epic/quests.js';
import type { EpicAuthSession } from './epic/session.js';
import type { FnccQuest, FnccQuestCatalog, FnccStwQuest } from './fncc/types.js';

export interface QuestAssetSource {
  search(query: string, options?: { offset?: number; limit?: number }): Promise<{ total: number; items: Array<{ path: string }> }>;
  json<T = unknown>(path: string): Promise<T>;
}

export interface QuestDataSource {
  catalog(options?: { lang?: string; signal?: AbortSignal }): Promise<FnccQuestCatalog>;
}

export const QuestMode = {
  BattleRoyale: 'battle-royale',
  Reload: 'reload',
  Lego: 'lego',
  Festival: 'festival',
  RocketRacing: 'rocket-racing',
  Og: 'og',
  FallGuys: 'fall-guys',
  Ballistic: 'ballistic',
  Arenas: 'arenas',
  SaveTheWorld: 'save-the-world',
} as const;

export type QuestMode = (typeof QuestMode)[keyof typeof QuestMode];

const MODE_BY_PRODUCT: Record<string, QuestMode> = {
  br: 'battle-royale',
  habanero: 'battle-royale',
  blastberry: 'reload',
  juno: 'lego',
  sparks: 'festival',
  delmar: 'rocket-racing',
  figment: 'og',
  pimlico: 'fall-guys',
  feral: 'ballistic',
  squareclub: 'arenas',
  stw: 'save-the-world',
};

export interface QuestObjective {
  id: string;
  description: string | null;
  progress: number;
  target: number | null;
  completed: boolean;
  stage: number | null;
  stageCount: number | null;
}

export interface Quest {
  id: string;
  templateId: string;
  profile: 'athena' | 'campaign';
  name: string | null;
  description: string | null;
  state: string;
  completed: boolean;
  claimed: boolean;
  progress: number | null;
  objectives: QuestObjective[];
  bundleTemplateId: string | null;
  scheduleTemplateId: string | null;
  expiresAt: string | null;
  tracked: boolean;
  visible: boolean;
  sortPriority: number | null;
  type: string | null;
  subtype: string | null;
  tags: string[];
  completionText: string | null;
}

export interface QuestHeader {
  name: string | null;
  sortOrder: number;
  quests: Quest[];
}

export interface QuestCategory {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  product: string | null;
  mode: QuestMode | null;
  includeTags: string[];
  headers: QuestHeader[];
  quests: Quest[];
}

export interface QuestBundle {
  id: string;
  templateId: string;
  scheduleTemplateId: string | null;
  questIds: string[];
  completed: number;
  total: number;
}

export interface QuestSchedule {
  id: string;
  templateId: string;
  unlockedAt: string | null;
  bundleIds: string[];
}

export interface QuestLog {
  categories: QuestCategory[];
  uncategorized: Quest[];
  quests: Quest[];
  bundles: QuestBundle[];
  schedules: QuestSchedule[];
  tracked: string[];
  xp: QuestAccountXp | null;
  enriched: boolean;
}

export interface QuestLogOptions {
  mode?: QuestMode | QuestMode[];
  includeClaimed?: boolean;
  includeHidden?: boolean;
  enrich?: boolean;
  signal?: AbortSignal;
}

export interface StwQuestCategory {
  id: string;
  name: string;
  sortPriority: number;
  quests: Quest[];
}

export interface StwQuestLog {
  categories: StwQuestCategory[];
  uncategorized: Quest[];
  quests: Quest[];
  dailies: Quest[];
  dailyRerolls: number;
  enriched: boolean;
}

export interface QuestCatalogOptions {
  lang?: string;
  concurrency?: number;
  maxRateLimitWaits?: number;
}

export interface QuestDisplay {
  name: string | null;
  description: string | null;
  objectives: Record<string, QuestDisplayObjective>;
  completionText?: string | null;
  sortPriority: number | null;
  type: string | null;
  subtype: string | null;
  tags: string[];
  visibleToPlayers: boolean;
  includedInCategories?: boolean;
  visibleWhen: { active?: boolean; completed?: boolean; claimed?: boolean };
  category: string | null;
}

export interface QuestDisplayObjective {
  description: string | null;
  count: number | null;
  stage?: number | null;
  stageCount?: number | null;
}

export interface QuestCategoryDefinition {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  includeTags: string[];
  defaultHeader: { name: string | null; sortOrder: number };
  headers: Array<{ name: string | null; tag: string; sortOrder: number }>;
}

export interface QuestCatalogSnapshot {
  version: 1;
  createdAt: string;
  build?: string | null;
  complete?: boolean;
  displayIndex?: Record<string, string>;
  stwIndex?: Record<string, string>;
  quests: Record<string, QuestDisplay | null>;
  stwQuests: Record<string, QuestDisplay | null>;
  categories?: QuestCategoryDefinition[];
  stwCategories?: Record<string, { name: string; sortPriority: number }>;
}

interface AssetExport {
  Type?: string;
  Name?: string;
  Properties?: Record<string, unknown>;
  Rows?: Record<string, Record<string, unknown>>;
}

const DISPLAY_DATA_ROOT = 'QuestDisplayData/Content/';
const STW_QUEST_ROOT = 'SaveTheWorld/Content/Quests/';
const STW_CATEGORY_TABLE = 'FortniteGame/Content/Quests/QuestCategoryTable';
const SEARCH_PAGE = 1000;
const DEFAULT_RATE_LIMIT_WAIT_MS = 15_000;

export class QuestCatalog {
  private readonly concurrency: number;
  private readonly maxRateLimitWaits: number;
  private displayIndex: Promise<Map<string, string>> | null = null;
  private stwIndex: Promise<Map<string, string>> | null = null;
  private categoryDefinitions: Promise<QuestCategoryDefinition[]> | null = null;
  private stwCategoryTable: Promise<Map<string, { name: string; sortPriority: number }>> | null = null;
  private readonly quests = new Map<string, Promise<QuestDisplay | null>>();
  private readonly stwQuests = new Map<string, Promise<QuestDisplay | null>>();
  private readonly assets: QuestAssetSource | undefined;
  private readonly data: QuestDataSource | undefined;
  private readonly lang: string | undefined;
  private loading: Promise<void> | null = null;
  private complete = false;
  private buildVersion: string | null = null;

  constructor(source?: QuestDataSource | QuestAssetSource, options: QuestCatalogOptions = {}) {
    this.data = source && 'catalog' in source ? source : undefined;
    this.assets = source && 'json' in source ? source : undefined;
    this.lang = options.lang;
    this.concurrency = Math.max(1, options.concurrency ?? 8);
    this.maxRateLimitWaits = Math.max(0, options.maxRateLimitWaits ?? 20);
  }

  static from(
    snapshot: QuestCatalogSnapshot,
    source?: QuestDataSource | QuestAssetSource,
    options?: QuestCatalogOptions,
  ): QuestCatalog {
    if (snapshot?.version !== 1) throw new ValidationError('Unsupported quest catalog snapshot', 'snapshot');
    const catalog = new QuestCatalog(source, options);
    catalog.complete = snapshot.complete === true;
    catalog.buildVersion = snapshot.build ?? null;
    if (catalog.complete) catalog.loading = Promise.resolve();
    if (snapshot.displayIndex) catalog.displayIndex = Promise.resolve(new Map(Object.entries(snapshot.displayIndex)));
    if (snapshot.stwIndex) catalog.stwIndex = Promise.resolve(new Map(Object.entries(snapshot.stwIndex)));
    if (snapshot.categories) catalog.categoryDefinitions = Promise.resolve(snapshot.categories);
    if (snapshot.stwCategories) catalog.stwCategoryTable = Promise.resolve(new Map(Object.entries(snapshot.stwCategories)));
    for (const [id, display] of Object.entries(snapshot.quests ?? {})) catalog.quests.set(id, Promise.resolve(display));
    for (const [id, display] of Object.entries(snapshot.stwQuests ?? {})) catalog.stwQuests.set(id, Promise.resolve(display));
    return catalog;
  }

  async export(): Promise<QuestCatalogSnapshot> {
    const settle = async <T>(entries: Map<string, Promise<T>>): Promise<Record<string, T>> =>
      Object.fromEntries(await Promise.all([...entries].map(async ([id, pending]) => [id, await pending] as const)));
    const record = async <T>(pending: Promise<Map<string, T>> | null): Promise<Record<string, T> | undefined> =>
      pending ? Object.fromEntries(await pending.catch(() => new Map<string, T>())) : undefined;
    const [quests, stwQuests, displayIndex, stwIndex, stwCategories, categories] = await Promise.all([
      settle(this.quests),
      settle(this.stwQuests),
      record(this.displayIndex),
      record(this.stwIndex),
      record(this.stwCategoryTable),
      this.categoryDefinitions?.catch(() => undefined),
    ]);
    return {
      version: 1,
      createdAt: new Date().toISOString(),
      build: this.buildVersion,
      complete: this.complete,
      ...(displayIndex ? { displayIndex } : {}),
      ...(stwIndex ? { stwIndex } : {}),
      quests,
      stwQuests,
      ...(categories ? { categories } : {}),
      ...(stwCategories ? { stwCategories } : {}),
    };
  }

  get size(): number {
    return this.quests.size + this.stwQuests.size;
  }

  get build(): string | null {
    return this.buildVersion;
  }

  refresh(): void {
    this.quests.clear();
    this.stwQuests.clear();
    this.displayIndex = null;
    this.stwIndex = null;
    this.categoryDefinitions = null;
    this.stwCategoryTable = null;
    this.loading = null;
    this.complete = false;
    this.buildVersion = null;
  }

  async questDisplays(templateIds: string[]): Promise<Map<string, QuestDisplay | null>> {
    if (await this.loadFromSource()) return known(this.quests, templateIds);
    return this.resolve(this.quests, templateIds, async (templateId) => {
      const index = await (this.displayIndex ??= this.index(DISPLAY_DATA_ROOT));
      const path = index.get(`questdisplaydata_${templateName(templateId)}`);
      return path ? parseQuestDisplay(await this.json(path)) : null;
    });
  }

  async stwDisplays(templateIds: string[]): Promise<Map<string, QuestDisplay | null>> {
    if (await this.loadFromSource()) return known(this.stwQuests, templateIds);
    return this.resolve(this.stwQuests, templateIds, async (templateId) => {
      const index = await (this.stwIndex ??= this.index(STW_QUEST_ROOT));
      const path = index.get(templateName(templateId));
      return path ? parseStwQuest(await this.json(path)) : null;
    });
  }

  async categories(): Promise<QuestCategoryDefinition[]> {
    if (await this.loadFromSource()) return (await this.categoryDefinitions) ?? [];
    return (this.categoryDefinitions ??= (async () => {
      const paths = (await this.searchAll('/QC_')).filter(
        (path) => path.endsWith('.uasset') && !path.includes('/SaveTheWorld/') && !path.includes('/HUD/'),
      );
      const loaded = await mapLimit(paths, this.concurrency, async (path) =>
        parseCategory(await this.json(path.slice(0, -'.uasset'.length))),
      );
      return loaded.filter((category): category is QuestCategoryDefinition => category !== null);
    })().catch((error: unknown) => {
      this.categoryDefinitions = null;
      throw error;
    }));
  }

  async stwCategories(): Promise<Map<string, { name: string; sortPriority: number }>> {
    if (await this.loadFromSource()) return (await this.stwCategoryTable) ?? new Map();
    return (this.stwCategoryTable ??= (async () => {
      const rows = (await this.json(STW_CATEGORY_TABLE)).find((entry) => entry.Rows)?.Rows ?? {};
      return new Map(
        Object.entries(rows).map(([rowName, row]) => [
          rowName.toLowerCase(),
          { name: text(row['Name']) ?? rowName, sortPriority: numberOr(row['SortPriority'], 0) },
        ]),
      );
    })().catch((error: unknown) => {
      this.stwCategoryTable = null;
      throw error;
    }));
  }

  private async loadFromSource(): Promise<boolean> {
    if (!this.data && !this.complete) return false;
    if (this.complete) return true;
    await (this.loading ??= this.data!.catalog(this.lang ? { lang: this.lang } : {}).then(
      (catalog) => this.fill(catalog),
      (error: unknown) => {
        this.loading = null;
        throw error;
      },
    ));
    return true;
  }

  private fill(catalog: FnccQuestCatalog): void {
    for (const [id, quest] of Object.entries(catalog.quests ?? {})) {
      this.quests.set(id.toLowerCase(), Promise.resolve(fromFnccQuest(quest)));
    }
    for (const [id, quest] of Object.entries(catalog.stwQuests ?? {})) {
      this.stwQuests.set(id.toLowerCase(), Promise.resolve(fromFnccStwQuest(quest)));
    }
    this.categoryDefinitions = Promise.resolve(
      (catalog.categories ?? [])
        .filter((category) => category.enabled !== false && category.includeTags.length > 0)
        .map((category) => ({
          id: category.id,
          name: category.name,
          description: category.description,
          sortOrder: category.sortOrder,
          includeTags: category.includeTags,
          defaultHeader: category.defaultHeader ?? { name: null, sortOrder: 0 },
          headers: (category.headers ?? []).map((header) => ({ name: header.name, tag: header.tag, sortOrder: header.sortOrder })),
        })),
    );
    this.stwCategoryTable = Promise.resolve(
      new Map(
        Object.values(catalog.stwCategories ?? {}).map((row) => [row.id.toLowerCase(), { name: row.name, sortPriority: row.sortPriority }]),
      ),
    );
    this.buildVersion = catalog.build ?? null;
    this.complete = true;
  }

  private async resolve(
    cache: Map<string, Promise<QuestDisplay | null>>,
    templateIds: string[],
    load: (templateId: string) => Promise<QuestDisplay | null>,
  ): Promise<Map<string, QuestDisplay | null>> {
    const unique = [...new Set(templateIds.map((id) => id.toLowerCase()))];
    const results = await mapLimit(unique, this.concurrency, (templateId) => {
      let pending = cache.get(templateId);
      if (!pending) {
        pending = load(templateId).catch(() => {
          cache.delete(templateId);
          return null;
        });
        cache.set(templateId, pending);
      }
      return pending;
    });
    return new Map(unique.map((templateId, index) => [templateId, results[index] ?? null]));
  }

  private async index(root: string): Promise<Map<string, string>> {
    const index = new Map<string, string>();
    for (const path of await this.searchAll(root)) {
      if (!path.endsWith('.uasset')) continue;
      const objectPath = path.slice(0, -'.uasset'.length);
      index.set(objectPath.slice(objectPath.lastIndexOf('/') + 1).toLowerCase(), objectPath);
    }
    return index;
  }

  private async searchAll(query: string): Promise<string[]> {
    const assets = this.requireAssets();
    const first = await this.patient(() => assets.search(query, { limit: SEARCH_PAGE, offset: 0 }));
    const offsets = Array.from({ length: Math.max(0, Math.ceil(first.total / SEARCH_PAGE) - 1) }, (_, index) => (index + 1) * SEARCH_PAGE);
    const pages = await mapLimit(offsets, this.concurrency, (offset) =>
      this.patient(() => assets.search(query, { limit: SEARCH_PAGE, offset })),
    );
    return [first, ...pages].flatMap((page) => page.items.map((item) => item.path));
  }

  private async json(path: string): Promise<AssetExport[]> {
    const assets = this.requireAssets();
    const exports = await this.patient(() => assets.json<AssetExport[]>(path));
    return Array.isArray(exports) ? exports : [];
  }

  private async patient<T>(task: () => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await task();
      } catch (error) {
        const wait = rateLimitWait(error);
        if (wait === null || attempt >= this.maxRateLimitWaits) throw error;
        await sleep(wait);
      }
    }
  }

  private requireAssets(): QuestAssetSource {
    if (!this.assets) {
      throw new ValidationError(
        'This quest catalog has no source; pass one (e.g. `new FnccAPI().quests`) to look up quests it has not cached.',
        'assets',
      );
    }
    return this.assets;
  }
}

export class QuestBook {
  constructor(
    private readonly session: EpicAuthSession,
    private readonly catalog?: QuestCatalog,
  ) {}

  async log(options: QuestLogOptions = {}): Promise<QuestLog> {
    const catalog = this.enrichWith(options.enrich);
    const response = await this.session.questProgress(options.signal ? { signal: options.signal } : {});
    const progress = response.questProgress;
    const tracked = new Set([...(progress.trackedQuests ?? []), ...(progress.trackedQuestIds ?? [])].map((id) => id.toLowerCase()));
    const bundles = new Map(progress.challengeBundles.map((bundle) => [bundle.itemId, bundle]));
    const schedules = new Map(progress.challengeBundleSchedules.map((schedule) => [schedule.itemId, schedule]));

    const wanted = progress.quests.filter((entry) => options.includeClaimed || entry.state.toLowerCase() !== 'claimed');
    const [displays, categories] = catalog
      ? await Promise.all([catalog.questDisplays(wanted.map((entry) => entry.templateId)), catalog.categories()])
      : [new Map<string, QuestDisplay | null>(), [] as QuestCategoryDefinition[]];

    let quests = wanted.map((entry) => {
      const bundle = entry.challengeBundleId ? bundles.get(entry.challengeBundleId) : undefined;
      const schedule = bundle ? schedules.get(bundle.challengeScheduleId) : undefined;
      const display = displays.get(entry.templateId.toLowerCase()) ?? null;
      const quest = toQuest(entry, display, {
        bundle,
        schedule,
        tracked: tracked.has(entry.templateId.toLowerCase()) || tracked.has(entry.itemId.toLowerCase()),
      });
      return catalog && !display ? { ...quest, visible: false } : quest;
    });
    if (catalog && !options.includeHidden) quests = quests.filter((quest) => quest.visible);

    const modes = options.mode === undefined ? null : new Set(Array.isArray(options.mode) ? options.mode : [options.mode]);
    const grouped = groupQuests(quests, categories, modes);
    return {
      categories: grouped.categories,
      uncategorized: modes ? [] : grouped.uncategorized,
      quests: modes ? uniqueQuests(grouped.categories.flatMap((category) => category.quests)) : quests,
      bundles: progress.challengeBundles.map((bundle) => toBundle(bundle, schedules)),
      schedules: progress.challengeBundleSchedules.map(toSchedule),
      tracked: [...tracked],
      xp: response.accountXp ?? null,
      enriched: catalog !== null,
    };
  }

  async stw(options: Omit<QuestLogOptions, 'mode'> = {}): Promise<StwQuestLog> {
    const catalog = this.enrichWith(options.enrich);
    const profile = await this.session.queryProfile<{
      profile?: {
        items?: Record<string, { templateId?: string; attributes?: Record<string, unknown> }>;
        stats?: { attributes?: { quest_manager?: { dailyQuestRerolls?: unknown } } };
      };
    }>('campaign', options.signal ? { signal: options.signal } : {});
    const items = Object.entries(profile.profileChanges[0]?.profile?.items ?? {}).filter(
      ([, item]) => typeof item.templateId === 'string' && item.templateId.startsWith('Quest:'),
    );
    const wanted = items.filter(
      ([, item]) => options.includeClaimed || String(item.attributes?.['quest_state'] ?? '').toLowerCase() !== 'claimed',
    );
    const [displays, table] = catalog
      ? await Promise.all([catalog.stwDisplays(wanted.map(([, item]) => item.templateId!)), catalog.stwCategories()])
      : [new Map<string, QuestDisplay | null>(), new Map<string, { name: string; sortPriority: number }>()];

    const quests = wanted
      .map(([id, item]) => toStwQuest(id, item.templateId!, item.attributes ?? {}, displays.get(item.templateId!.toLowerCase()) ?? null))
      .sort(compareQuests);
    const byCategory = new Map<string, StwQuestCategory>();
    const uncategorized: Quest[] = [];
    for (const quest of quests) {
      const categoryId = displays.get(quest.templateId.toLowerCase())?.category ?? null;
      const row = categoryId ? table.get(categoryId.toLowerCase()) : undefined;
      if (!categoryId || !row) {
        uncategorized.push(quest);
        continue;
      }
      const group = byCategory.get(categoryId) ?? { id: categoryId, name: row.name, sortPriority: row.sortPriority, quests: [] };
      group.quests.push(quest);
      byCategory.set(categoryId, group);
    }
    return {
      categories: [...byCategory.values()].sort((a, b) => b.sortPriority - a.sortPriority || a.name.localeCompare(b.name)),
      uncategorized,
      quests,
      dailies: quests.filter(
        (quest) =>
          !quest.claimed &&
          (/^quest:daily_/i.test(quest.templateId) ||
            displays.get(quest.templateId.toLowerCase())?.category?.toLowerCase() === 'dailyquests'),
      ),
      dailyRerolls: numberOr(profile.profileChanges[0]?.profile?.stats?.attributes?.quest_manager?.dailyQuestRerolls, 0),
      enriched: catalog !== null,
    };
  }

  claim(quest: Quest | string, options: { selectedRewardIndex?: number; signal?: AbortSignal } = {}): Promise<MCPResponse> {
    const target = typeof quest === 'string' ? { id: quest, profile: 'athena' as const } : quest;
    return this.session.claimQuestReward(target.id, { ...options, profile: target.profile });
  }

  reroll(quest: Quest | string, signal?: AbortSignal): Promise<MCPResponse> {
    const target = typeof quest === 'string' ? { id: quest, profile: 'campaign' as const } : quest;
    return this.session.rerollDailyQuest(target.id, { profile: target.profile, ...(signal ? { signal } : {}) });
  }

  track(quests: Array<Quest | string>, signal?: AbortSignal): Promise<MCPResponse> {
    return this.session.trackQuests(
      quests.map((quest) => (typeof quest === 'string' ? quest : quest.templateId)),
      signal ? { signal } : {},
    );
  }

  private enrichWith(enrich: boolean | undefined): QuestCatalog | null {
    if (enrich === false) return null;
    if (!this.catalog) {
      if (enrich) {
        throw new ValidationError(
          'Pass a QuestCatalog (e.g. `new QuestCatalog(new FnccAPI().quests)`) to the QuestBook to resolve quest names and categories.',
          'catalog',
        );
      }
      return null;
    }
    return this.catalog;
  }
}

async function known(
  cache: Map<string, Promise<QuestDisplay | null>>,
  templateIds: string[],
): Promise<Map<string, QuestDisplay | null>> {
  const unique = [...new Set(templateIds.map((id) => id.toLowerCase()))];
  const results = await Promise.all(unique.map((id) => cache.get(id) ?? Promise.resolve(null)));
  return new Map(unique.map((id, index) => [id, results[index] ?? null]));
}

function objectivesFrom(objectives: FnccQuest['objectives'] | undefined): QuestDisplay['objectives'] {
  return Object.fromEntries(
    Object.entries(objectives ?? {}).map(([id, objective]) => [
      id.toLowerCase(),
      {
        description: objective.description ?? objective.hudDescription ?? null,
        count: objective.count ?? null,
        stage: objective.displayStage ?? null,
        stageCount: objective.displayMaxStage ?? null,
      },
    ]),
  );
}

function fromFnccQuest(quest: FnccQuest): QuestDisplay {
  const when = quest.visibleWhen ?? {};
  return {
    name: quest.name,
    description: quest.description,
    objectives: objectivesFrom(quest.objectives),
    sortPriority: quest.sortPriority,
    type: quest.type,
    subtype: quest.subtype,
    tags: quest.tags ?? [],
    visibleToPlayers: quest.visibleToPlayers !== false,
    includedInCategories: quest.includedInCategories !== false,
    completionText: quest.completionText ?? null,
    visibleWhen: {
      ...(typeof when.active === 'boolean' ? { active: when.active } : {}),
      ...(typeof when.completed === 'boolean' ? { completed: when.completed } : {}),
      ...(typeof when.claimed === 'boolean' ? { claimed: when.claimed } : {}),
    },
    category: null,
  };
}

function fromFnccStwQuest(quest: FnccStwQuest): QuestDisplay {
  return {
    name: quest.name,
    description: quest.description,
    objectives: objectivesFrom(quest.objectives),
    completionText: quest.completionText ?? null,
    sortPriority: null,
    type: quest.type,
    subtype: null,
    tags: [],
    visibleToPlayers: true,
    visibleWhen: {},
    category: quest.category,
  };
}

function groupQuests(
  quests: Quest[],
  definitions: QuestCategoryDefinition[],
  modes: Set<QuestMode> | null,
): { categories: QuestCategory[]; uncategorized: Quest[] } {
  const categories = new Map<string, QuestCategory>();
  const uncategorized: Quest[] = [];
  for (const quest of quests) {
    const matches = definitions.filter((definition) =>
      definition.includeTags.some((include) => quest.tags.some((tag) => tagMatches(include, tag))),
    );
    if (matches.length === 0) {
      uncategorized.push(quest);
      continue;
    }
    for (const definition of matches) {
      const product = productOf(definition.includeTags);
      const mode = product ? MODE_BY_PRODUCT[product.toLowerCase()] ?? null : null;
      if (modes && (!mode || !modes.has(mode))) continue;
      const category = categories.get(definition.id) ?? {
        id: definition.id,
        name: definition.name,
        description: definition.description,
        sortOrder: definition.sortOrder,
        product,
        mode,
        includeTags: definition.includeTags,
        headers: [],
        quests: [],
      };
      const header = pickHeader(definition, quest.tags);
      let group = category.headers.find((entry) => entry.name === header.name && entry.sortOrder === header.sortOrder);
      if (!group) {
        group = { name: header.name, sortOrder: header.sortOrder, quests: [] };
        category.headers.push(group);
      }
      group.quests.push(quest);
      categories.set(definition.id, category);
    }
  }
  for (const category of categories.values()) {
    category.headers.sort((a, b) => a.sortOrder - b.sortOrder);
    for (const header of category.headers) header.quests.sort(compareQuests);
    category.quests = category.headers.flatMap((header) => header.quests);
  }
  return {
    categories: [...categories.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    uncategorized: uncategorized.sort(compareQuests),
  };
}

function pickHeader(definition: QuestCategoryDefinition, tags: string[]): { name: string | null; sortOrder: number } {
  const matching = definition.headers
    .filter((header) => tags.some((tag) => tagMatches(header.tag, tag)))
    .sort((a, b) => b.tag.length - a.tag.length);
  return matching[0] ?? definition.defaultHeader;
}

function compareQuests(a: Quest, b: Quest): number {
  return (
    Number(a.completed) - Number(b.completed) ||
    (a.sortPriority ?? Number.MAX_SAFE_INTEGER) - (b.sortPriority ?? Number.MAX_SAFE_INTEGER) ||
    (a.name ?? a.templateId).localeCompare(b.name ?? b.templateId)
  );
}

function toQuest(
  entry: QuestProgressEntry,
  display: QuestDisplay | null,
  context: { bundle: ChallengeBundleEntry | undefined; schedule: ChallengeScheduleEntry | undefined; tracked: boolean },
): Quest {
  const objectives = entry.objectives.map((objective) => {
    const info = display?.objectives[objective.statName.toLowerCase()];
    const target = info?.count ?? null;
    return {
      id: objective.statName,
      description: info?.description ?? null,
      progress: objective.quantity,
      target,
      completed: target !== null && objective.quantity >= target,
      stage: info?.stage ?? null,
      stageCount: info?.stageCount ?? null,
    };
  });
  return buildQuest({
    id: entry.itemId,
    templateId: entry.templateId,
    profile: 'athena',
    state: entry.state,
    objectives,
    display,
    bundleTemplateId: context.bundle?.templateId ?? null,
    scheduleTemplateId: context.schedule?.templateId ?? null,
    expiresAt: entry.expiryTime ?? null,
    tracked: context.tracked,
  });
}

function toStwQuest(id: string, templateId: string, attributes: Record<string, unknown>, display: QuestDisplay | null): Quest {
  const progress = new Map(
    Object.entries(attributes)
      .filter(([key, value]) => key.startsWith('completion_') && typeof value === 'number')
      .map(([key, value]) => [key.slice('completion_'.length).toLowerCase(), value as number]),
  );
  const keys = display && Object.keys(display.objectives).length > 0 ? Object.keys(display.objectives) : [...progress.keys()];
  const objectives = keys.map((key) => {
    const info = display?.objectives[key];
    const target = info?.count ?? null;
    const value = progress.get(key) ?? 0;
    return {
      id: key,
      description: info?.description ?? null,
      progress: value,
      target,
      completed: target !== null && value >= target,
      stage: info?.stage ?? null,
      stageCount: info?.stageCount ?? null,
    };
  });
  return buildQuest({
    id,
    templateId,
    profile: 'campaign',
    state: String(attributes['quest_state'] ?? 'Active'),
    objectives,
    display,
    bundleTemplateId: null,
    scheduleTemplateId: null,
    expiresAt: null,
    tracked: false,
  });
}

function buildQuest(input: {
  id: string;
  templateId: string;
  profile: 'athena' | 'campaign';
  state: string;
  objectives: QuestObjective[];
  display: QuestDisplay | null;
  bundleTemplateId: string | null;
  scheduleTemplateId: string | null;
  expiresAt: string | null;
  tracked: boolean;
}): Quest {
  const state = input.state.toLowerCase();
  const claimed = state === 'claimed';
  const targets = input.objectives.every((objective) => objective.target !== null && objective.target > 0);
  const completed =
    state !== 'active' || (input.objectives.length > 0 && targets && input.objectives.every((objective) => objective.completed));
  const total = input.objectives.reduce((sum, objective) => sum + (objective.target ?? 0), 0);
  const done = input.objectives.reduce((sum, objective) => sum + Math.min(objective.progress, objective.target ?? 0), 0);
  const display = input.display;
  const visibleWhen = display?.visibleWhen ?? {};
  const visible =
    (display?.visibleToPlayers ?? true) &&
    display?.includedInCategories !== false &&
    (claimed ? visibleWhen.claimed !== false : completed ? visibleWhen.completed !== false : visibleWhen.active !== false);
  const description = display?.description ?? null;
  const objectives =
    description && input.objectives.length === 1 && !input.objectives[0]!.description
      ? [{ ...input.objectives[0]!, description }]
      : input.objectives;
  return {
    id: input.id,
    templateId: input.templateId,
    profile: input.profile,
    name: display?.name ?? description ?? objectives.find((objective) => objective.description)?.description ?? null,
    description,
    state,
    completed,
    claimed,
    progress: completed ? 1 : targets && total > 0 ? done / total : null,
    objectives,
    bundleTemplateId: input.bundleTemplateId,
    scheduleTemplateId: input.scheduleTemplateId,
    expiresAt: input.expiresAt,
    tracked: input.tracked,
    visible,
    sortPriority: display?.sortPriority ?? null,
    type: display?.type ?? null,
    subtype: display?.subtype ?? null,
    tags: display?.tags ?? [],
    completionText: display?.completionText ?? null,
  };
}

function toBundle(bundle: ChallengeBundleEntry, schedules: Map<string, ChallengeScheduleEntry>): QuestBundle {
  const questIds = bundle.attributes.grantedquestinstanceids ?? [];
  return {
    id: bundle.itemId,
    templateId: bundle.templateId,
    scheduleTemplateId: schedules.get(bundle.challengeScheduleId)?.templateId ?? null,
    questIds,
    completed: numberOr(bundle.attributes.num_quests_completed, 0),
    total: numberOr(bundle.attributes.num_granted_bundle_quests, questIds.length),
  };
}

function toSchedule(schedule: ChallengeScheduleEntry): QuestSchedule {
  return {
    id: schedule.itemId,
    templateId: schedule.templateId,
    unlockedAt: schedule.attributes.unlock_epoch ?? null,
    bundleIds: schedule.attributes.granted_bundles ?? [],
  };
}

function parseQuestDisplay(exports: AssetExport[]): QuestDisplay | null {
  const props = exports.find((entry) => entry.Type === 'FortQuestDisplayDataAsset')?.Properties;
  if (!props) return null;
  const extensions = asArray<Record<string, unknown>>(props['ExtensionData']);
  const info = extensions.find((entry) => 'DisplayName' in entry) ?? {};
  const completion = extensions.find((entry) => 'CompletionText' in entry) ?? {};
  const visibility = extensions.find((entry) => 'bIsVisibleToPlayers' in entry || 'QuestVisiblityData' in entry) ?? {};
  const when = (visibility['QuestVisiblityData'] ?? {}) as Record<string, unknown>;
  return {
    name: text(info['DisplayName']),
    description: text(info['Description']),
    objectives: Object.fromEntries(
      asArray<Record<string, unknown>>(props['Objectives']).map((objective) => [
        String(objective['ObjectiveId'] ?? '').toLowerCase(),
        {
          description: text(objective['Description']) ?? text(objective['HudShortDescription']),
          count: numberOr(objective['Count'], null),
          ...objectiveStage(objective),
        },
      ]),
    ),
    completionText: text(completion['CompletionText']),
    sortPriority: numberOr(info['SortPriority'], null),
    type: enumValue(info['QuestType']),
    subtype: enumValue(info['QuestSubType']),
    tags: asArray<string>(props['OwnedGameplayTags']),
    visibleToPlayers: visibility['bIsVisibleToPlayers'] !== false,
    includedInCategories: visibility['bIncludedInCategories'] !== false,
    visibleWhen: {
      ...(typeof when['bIsVisibleWhenActive'] === 'boolean' ? { active: when['bIsVisibleWhenActive'] } : {}),
      ...(typeof when['bIsVisibleWhenCompleted'] === 'boolean' ? { completed: when['bIsVisibleWhenCompleted'] } : {}),
      ...(typeof when['bIsVisibleWhenClaimed'] === 'boolean' ? { claimed: when['bIsVisibleWhenClaimed'] } : {}),
    },
    category: null,
  };
}

function objectiveStage(objective: Record<string, unknown>): { stage: number | null; stageCount: number | null } {
  const entry = asArray<Record<string, unknown>>(objective['ExtensionData']).find((item) => 'DisplayStage' in item) ?? {};
  return { stage: numberOr(entry['DisplayStage'], null), stageCount: numberOr(entry['DisplayMaxStage'], null) };
}

function parseStwQuest(exports: AssetExport[]): QuestDisplay | null {
  const props = exports.find((entry) => entry.Type?.startsWith('FortQuestItemDefinition'))?.Properties;
  if (!props) return null;
  const objectives = asArray<Record<string, unknown>>(props['Objectives']).filter((objective) => objective['bHidden'] !== true);
  return {
    name: text(props['ItemName']) ?? text(props['DisplayName']),
    description: text(props['ItemDescription']) ?? text(props['Description']),
    objectives: Object.fromEntries(
      objectives.map((objective) => [
        String(objective['BackendName'] ?? '').toLowerCase(),
        { description: text(objective['Description']) ?? text(objective['HudShortDescription']), count: numberOr(objective['Count'], 1) },
      ]),
    ),
    sortPriority: numberOr(props['SortPriority'], null),
    type: enumValue(props['QuestType']),
    subtype: enumValue(props['QuestSubtype']),
    tags: asArray<string>(props['GameplayTags']),
    visibleToPlayers: true,
    visibleWhen: {},
    category: typeof (props['Category'] as Record<string, unknown> | undefined)?.['RowName'] === 'string'
      ? ((props['Category'] as Record<string, unknown>)['RowName'] as string)
      : null,
  };
}

function parseCategory(exports: AssetExport[]): QuestCategoryDefinition | null {
  const entry = exports.find((item) => item.Type === 'QuestCategoryData');
  const props = entry?.Properties;
  if (!entry?.Name || !props || props['bCategoryEnabled'] === false) return null;
  const includeTags = asArray<string>(props['IncludeTags']);
  if (includeTags.length === 0) return null;
  const defaultOrder = numberOr(props['DefaultHeaderSortOrder'], 0);
  return {
    id: entry.Name,
    name: text(props['DisplayName']) ?? entry.Name,
    description: text(props['Description']),
    sortOrder: numberOr(props['SortOrder'], 0),
    includeTags,
    defaultHeader: { name: text(props['DefaultHeaderName']), sortOrder: defaultOrder },
    headers: asArray<Record<string, unknown>>(props['AdditionalHeaders'])
      .map((header) => ({
        name: text(header['HeaderName']),
        tag: String((header['HeaderTag'] as Record<string, unknown> | undefined)?.['TagName'] ?? ''),
        sortOrder: numberOr(header['HeaderSortOrder'], defaultOrder),
      }))
      .filter((header) => header.tag.length > 0 && header.tag !== 'None'),
  };
}

function productOf(tags: string[]): string | null {
  const segments = tags.map((tag) => tag.split('.')[1]).filter((segment): segment is string => Boolean(segment));
  return segments.find((segment) => MODE_BY_PRODUCT[segment.toLowerCase()]) ?? segments[0] ?? null;
}

function tagMatches(parent: string, tag: string): boolean {
  const a = parent.toLowerCase();
  const b = tag.toLowerCase();
  return a === b || b.startsWith(`${a}.`);
}

function templateName(templateId: string): string {
  return templateId.slice(templateId.indexOf(':') + 1).toLowerCase();
}

function text(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const result = record['LocalizedString'] ?? record['SourceString'] ?? record['CultureInvariantString'];
  return typeof result === 'string' && result.length > 0 ? result : null;
}

function enumValue(value: unknown): string | null {
  return typeof value === 'string' ? value.slice(value.indexOf('::') + 2) || null : null;
}

function numberOr<T extends number | null>(value: unknown, fallback: T): number | T {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function uniqueQuests(quests: Quest[]): Quest[] {
  return [...new Map(quests.map((quest) => [quest.id, quest])).values()];
}

function rateLimitWait(error: unknown): number | null {
  if (error instanceof RateLimitError) return error.retryAfter ?? DEFAULT_RATE_LIMIT_WAIT_MS;
  const status = (error as { status?: unknown } | null)?.status;
  return status === 429 ? DEFAULT_RATE_LIMIT_WAIT_MS : null;
}

async function mapLimit<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]!);
    }
  });
  await Promise.all(workers);
  return results;
}
