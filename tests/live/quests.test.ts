import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { EpicGamesClient, FnccAPI, QuestBook, QuestCatalog, type EpicAuthSession } from '../../src/index.js';

interface EpicConfig {
  epic?: { deviceAuth?: { accountId?: string; deviceId?: string; secret?: string } };
}

const here = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(resolve(here, '../../config.json'), 'utf8')) as EpicConfig;
const deviceAuth = config.epic?.deviceAuth;
const hasDeviceAuth = !!deviceAuth?.accountId && !!deviceAuth?.deviceId && !!deviceAuth?.secret;

describe.skipIf(!hasDeviceAuth)('live quests (read only)', () => {
  let session: EpicAuthSession;
  const catalog = new QuestCatalog(new FnccAPI().quests);

  beforeAll(async () => {
    session = await new EpicGamesClient({ retry: 2 }).loginWithDeviceAuth({
      accountId: deviceAuth!.accountId!,
      deviceId: deviceAuth!.deviceId!,
      secret: deviceAuth!.secret!,
    });
  });

  afterAll(async () => {
    await session?.logout().catch(() => undefined);
  });

  it('reads raw quest progress from the EOS quest service', async () => {
    const log = await new QuestBook(session).log({ includeClaimed: true });
    expect(log.enriched).toBe(false);
    expect(log.quests.length).toBeGreaterThan(0);
    expect(log.schedules.length).toBeGreaterThan(0);
    expect(log.xp?.seasonNumber).toBeGreaterThan(30);
    for (const quest of log.quests) expect(quest.templateId.startsWith('Quest:')).toBe(true);
  });

  it('builds the save the world quest log with names and categories', async () => {
    const log = await new QuestBook(session, catalog).stw();
    expect(log.quests.length).toBeGreaterThan(0);
    expect(log.categories.length).toBeGreaterThan(0);
    for (let index = 1; index < log.categories.length; index += 1) {
      expect(log.categories[index - 1]!.sortPriority).toBeGreaterThanOrEqual(log.categories[index]!.sortPriority);
    }
    const named = log.quests.filter((quest) => quest.name);
    expect(named.length / log.quests.length).toBeGreaterThan(0.9);
  });

  it('keeps save the world stable and lists exactly the profile dailies as rerollable', async () => {
    const book = new QuestBook(session, catalog);
    const [first, second] = [await book.stw(), await book.stw()];
    expect(second.quests.map((quest) => quest.id)).toEqual(first.quests.map((quest) => quest.id));
    expect(first.dailyRerolls).toBeGreaterThanOrEqual(0);

    const profile = await session.queryProfile<{
      profile?: { items?: Record<string, { templateId?: string; attributes?: Record<string, unknown> }> };
    }>('campaign');
    const items = profile.profileChanges[0]?.profile?.items ?? {};
    const activeDailies = Object.entries(items)
      .filter(([, item]) => /^quest:daily_/i.test(item.templateId ?? '') && item.attributes?.['quest_state'] !== 'Claimed')
      .map(([id]) => id)
      .sort();
    expect(first.dailies.map((quest) => quest.id).sort()).toEqual(activeDailies);
    for (const quest of first.quests) {
      expect(quest.profile).toBe('campaign');
      expect(items[quest.id]?.templateId).toBe(quest.templateId);
    }
  });

  it('keeps battle royale and save the world quests apart', async () => {
    const book = new QuestBook(session, catalog);
    const [br, stw] = await Promise.all([book.log({ includeHidden: true }), book.stw({ includeClaimed: true })]);
    const stwIds = new Set(stw.quests.map((quest) => quest.id));
    expect(br.quests.every((quest) => quest.profile === 'athena' && !stwIds.has(quest.id))).toBe(true);
  });

  it('builds the battle royale and mode quest log the way the game sorts it', async () => {
    const log = await new QuestBook(session, catalog).log();
    expect(log.categories.length).toBeGreaterThan(0);
    for (let index = 1; index < log.categories.length; index += 1) {
      expect(log.categories[index - 1]!.sortOrder).toBeLessThanOrEqual(log.categories[index]!.sortOrder);
    }
    expect(log.quests.every((quest) => quest.name && quest.visible)).toBe(true);
    expect(log.categories.some((category) => category.mode === 'battle-royale')).toBe(true);
    for (const category of log.categories) {
      for (let index = 1; index < category.headers.length; index += 1) {
        expect(category.headers[index - 1]!.sortOrder).toBeLessThanOrEqual(category.headers[index]!.sortOrder);
      }
    }

    const festival = await new QuestBook(session, catalog).log({ mode: 'festival' });
    expect(festival.categories.every((category) => category.mode === 'festival')).toBe(true);
    expect(catalog.build).toMatch(/^\+\+Fortnite\+Release-/);
  });
});
