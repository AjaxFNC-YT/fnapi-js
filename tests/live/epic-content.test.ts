import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { EpicGamesClient, FnccAPI, LauncherInstaller, type EpicAuthSession } from '../../src/index.js';

interface EpicConfig {
  epic?: { deviceAuth?: { accountId?: string; deviceId?: string; secret?: string } };
}

const here = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(resolve(here, '../../config.json'), 'utf8')) as EpicConfig;
const deviceAuth = config.epic?.deviceAuth;
const hasDeviceAuth = !!deviceAuth?.accountId && !!deviceAuth?.deviceId && !!deviceAuth?.secret;

const epic = new EpicGamesClient({ retry: 2 });

describe('live epic content pages (no auth)', () => {
  it('reads the fortnite-game page and its typed sections', async () => {
    const page = await epic.content.pages();
    expect(page._title).toBe('Fortnite Game');
    expect(typeof page.lastModified).toBe('string');

    const tournaments = await epic.content.tournaments();
    expect(tournaments.length).toBeGreaterThan(0);
    for (const tournament of tournaments.slice(0, 20)) {
      expect(typeof tournament.tournament_display_id).toBe('string');
    }
    const first = tournaments[0]!;
    expect((await epic.content.tournament(first.tournament_display_id))?.tournament_display_id).toBe(
      first.tournament_display_id,
    );

    const backgrounds = await epic.content.backgrounds();
    expect(backgrounds.some((entry) => entry.key === 'lobby')).toBe(true);

    const sections = await epic.content.shopSections();
    expect(sections.length).toBeGreaterThan(0);
    expect(typeof sections[0]?.sectionId).toBe('string');

    expect(Array.isArray(await epic.content.emergencyNotices())).toBe(true);
    expect(Array.isArray(await epic.content.motds())).toBe(true);
    const login = await epic.content.loginMessage();
    expect(login === null || typeof login.title === 'string').toBe(true);
  });

  it('reads a sub page by its lowercase title', async () => {
    const sub = await epic.content.page('fortnite-game', 'shop-sections');
    expect(sub._title).toBe('shop-sections');
  });

  it('reads the unauthenticated fortnite version and resolves an installer', async () => {
    const version = await epic.game.version();
    expect(version.app).toBe('fortnite');
    expect(version.version).toMatch(/^\d+\.\d+$/);
    expect(version.cln).toMatch(/^\d+$/);

    const installer = await epic.launcher.installer(LauncherInstaller.LauncherWindows);
    expect(installer.url).toMatch(/^https:\/\//);
    expect(installer.fileName).toMatch(/\.msi$/);
  });
});

describe.skipIf(!hasDeviceAuth)('live epic session services', () => {
  let session: EpicAuthSession;

  beforeAll(async () => {
    session = await epic.loginWithDeviceAuth({
      accountId: deviceAuth!.accountId!,
      deviceId: deviceAuth!.deviceId!,
      secret: deviceAuth!.secret!,
    });
  });

  afterAll(async () => {
    await session?.logout().catch(() => undefined);
  });

  it('reads the personalised motds', async () => {
    const motds = await session.motds();
    expect(Array.isArray(motds)).toBe(true);
    for (const motd of motds) {
      expect(typeof motd.contentHash).toBe('string');
      expect(typeof motd.contentSchemaName).toBe('string');
      expect(Array.isArray(motd.placements)).toBe(true);
    }
  });

  it('reads the launcher build and assets', async () => {
    const build = await session.fortniteBuild();
    expect(build.major).toBeGreaterThan(0);
    expect(build.changelist).toBeGreaterThan(0);
    expect(build.buildVersion).toContain(`Release-${build.version}`);

    const launcherBuild = await session.launcherBuild();
    expect(launcherBuild.elements[0]?.manifests.length).toBeGreaterThan(0);

    const assets = await session.launcherAssets({ namespace: 'fn' });
    expect(assets.some((asset) => asset.appName === 'Fortnite')).toBe(true);
  });

  it('reads the Android build, the Fortnite apk and the v1 asset', async () => {
    const android = await session.launcherBuild({ platform: 'Android' });
    expect(android.elements[0]?.labelName).toBe('Live-Android');

    const apk = await session.fortniteApk();
    expect(apk.buildVersion).toContain('-Android');
    expect(apk.url).toMatch(/\/Builds\/Fortnite\/Apk\/[\w-]+\.apk$/);
    const head = await fetch(apk.url, { method: 'HEAD' });
    expect(head.ok).toBe(true);
    expect(head.headers.get('content-type')).toBe('application/vnd.android.package-archive');
    expect(Number(head.headers.get('content-length'))).toBe(apk.sizeBytes);

    for (const platform of ['Windows', 'Switch']) {
      const asset = await session.launcherAsset({ platform });
      expect(asset.buildVersion).toContain('Release-');
      expect(asset.items['MANIFEST']?.path).toMatch(/\.manifest$/);
    }
  });

  it('caches netCL when asked', async () => {
    const first = await session.matchmakingNetCL({ cache: { ttl: 60_000 } });
    expect(first).toMatch(/^\d+$/);
    expect(await session.matchmakingNetCL({ cache: true })).toBe(first);
  });

  it('fetches a UEFN island package and its AES key', async () => {
    const surface = await new FnccAPI().discovery.surface('Browse');
    const codes = [
      ...new Set(
        surface.panels.flatMap((panel) => panel.results.map((result) => result.linkCode)).filter((code) => /^\d{4}-\d{4}-\d{4}$/.test(code)),
      ),
    ];
    expect(codes.length).toBeGreaterThan(0);

    let checked = 0;
    for (const code of codes.slice(0, 8)) {
      const pack = await session.islandPackage(code).catch(() => null);
      if (!pack) continue;
      checked += 1;
      expect(pack.status).toBe('cooked');
      expect(pack.projectFlags.liveLink.linkCode).toBe(code);
      expect(typeof pack.resolved.root.moduleId).toBe('string');
      if (!pack.isEncrypted) continue;

      const keys = await session.islandKeys(code);
      expect(keys).toHaveLength(1);
      expect(keys[0]?.moduleId).toBe(pack.resolved.root.moduleId);
      expect(keys[0]?.key).toMatch(/^0x[0-9A-F]{64}$/);
      expect(keys[0]?.guid).toMatch(/^[0-9a-f-]{36}$/i);
      return;
    }
    expect(checked).toBeGreaterThan(0);
  });
});
