import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { EpicGamesClient, type EpicAuthSession } from '../../src/index.js';

interface EpicConfig {
  epic?: { deviceAuth?: { accountId?: string; deviceId?: string; secret?: string } };
}

const here = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(resolve(here, '../../config.json'), 'utf8')) as EpicConfig;
const deviceAuth = config.epic?.deviceAuth;
const hasDeviceAuth = !!deviceAuth?.accountId && !!deviceAuth?.deviceId && !!deviceAuth?.secret;

describe.skipIf(!hasDeviceAuth)('live island and link lookups (links service)', () => {
  const epic = new EpicGamesClient({ retry: 2 });
  let session: EpicAuthSession;
  let islandCode: string;

  beforeAll(async () => {
    session = await epic.loginWithDeviceAuth({
      accountId: deviceAuth!.accountId!,
      deviceId: deviceAuth!.deviceId!,
      secret: deviceAuth!.secret!,
    });
    const page = await epic.ecosystem.islands({ size: 20 });
    islandCode = page.data.find((island) => /^\d{4}-\d{4}-\d{4}$/.test(island.code))!.code;
  });

  afterAll(async () => {
    await session?.logout().catch(() => undefined);
  });

  it('looks up a creative island and an Epic playlist', async () => {
    const island = await session.island(islandCode);
    expect(island?.code).toBe(islandCode);
    expect(island?.type).toBe('valkyrie:application');
    expect(island?.creator.accountId).toMatch(/^[0-9a-f]{32}$/);
    expect(island?.title.length).toBeGreaterThan(0);

    const trios = await session.island('playlist_trios');
    expect(trios?.type).toBe('BR:Playlist');
    expect(trios?.creator.accountId).toBe('epic');
  });

  it('resolves several codes at once and skips unknown ones', async () => {
    const islands = await session.islands(['playlist_trios', islandCode, 'playlist_does_not_exist_zzz']);
    expect(islands.map((island) => island.code).sort()).toEqual([islandCode, 'playlist_trios'].sort());
  });

  it('reads related links, versions and the creator page', async () => {
    const related = await session.islandRelated('playlist_trios');
    expect(related.links['playlist_trios']?.mnemonic).toBe('playlist_trios');

    const versions = await session.islandVersions(islandCode);
    expect(versions.length).toBeGreaterThan(0);

    const island = (await session.island(islandCode))!;
    const page = await session.creatorIslands(island.creator.accountId, { limit: 10 });
    expect(page.creatorId).toBe(island.creator.accountId);
    expect(page.links.length).toBeGreaterThan(0);
  });

  it('lists the signed-in account’s own links', async () => {
    const mine = await session.myIslands();
    for (const island of mine) expect(island.creator.accountId).toBe(session.accountId);
  });
});
