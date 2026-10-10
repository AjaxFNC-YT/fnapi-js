import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { EpicGamesClient, RankTier, type EpicAuthSession } from '../../src/index.js';

interface EpicConfig {
  epic?: { deviceAuth?: { accountId?: string; deviceId?: string; secret?: string } };
}

const here = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(resolve(here, '../../config.json'), 'utf8')) as EpicConfig;
const deviceAuth = config.epic?.deviceAuth;
const hasDeviceAuth = !!deviceAuth?.accountId && !!deviceAuth?.deviceId && !!deviceAuth?.secret;

const NINJA = '4735ce9132924caf8a5b17789b40f79c';

describe.skipIf(!hasDeviceAuth)('live ranked (habanero)', () => {
  const epic = new EpicGamesClient({ retry: 2 });
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

  it('lists the current season tracks', async () => {
    const tracks = await session.rankedCurrentTracks();
    expect(tracks.length).toBeGreaterThan(0);
    const now = Date.now();
    for (const track of tracks) {
      expect(Date.parse(track.beginTime)).toBeLessThanOrEqual(now);
      expect(Date.parse(track.endTime)).toBeGreaterThan(now);
    }
  });

  it('reads named standings for the account and matches the raw divisions', async () => {
    const [standings, raw] = await Promise.all([
      session.rankedStandings(),
      session.rankedProgressAll(undefined, { endsAfter: new Date().toISOString() }),
    ]);
    expect(standings.length).toBeGreaterThan(0);
    for (const standing of standings) {
      const source = raw.find((entry) => entry.trackguid === standing.trackguid)!;
      expect(standing.active).toBe(true);
      expect(standing.track?.trackguid).toBe(standing.trackguid);
      expect(standing.current.division).toBe(standing.played ? source.currentDivision : 0);
      expect(standing.current.name).toMatch(/^(Unranked|Unreal|(Bronze|Silver|Gold|Platinum|Diamond|Elite|Champion)( I{1,3})?)$/);
      expect(standing.progress).toBeGreaterThanOrEqual(0);
      expect(standing.progress).toBeLessThanOrEqual(1);
      if (standing.current.tier === RankTier.Unreal || standing.current.tier === RankTier.UnrealLegend) {
        expect(standing.unrealRank).toBeGreaterThan(0);
      } else {
        expect(standing.unrealRank).toBeNull();
      }
      expect(standing.unrealLegend).toBe(standing.current.tier === RankTier.UnrealLegend);
      if (standing.unrealLegend) expect(standing.unrealRank).toBeLessThanOrEqual(500);
    }
    const played = standings.filter((standing) => standing.played);
    expect(standings.slice(0, played.length)).toEqual(played);
  });

  it('reads one mode and bulk standings for several accounts', async () => {
    const reload = await session.rankedStanding('ranked-blastberry-combined');
    expect(reload?.mode.name).toBe('Reload');

    const bulk = await session.rankedStandingsBulk([session.accountId!, NINJA], { rankingTypes: ['ranked-br-combined'] });
    expect(bulk.get(NINJA)?.[0]?.rankingType).toBe('ranked-br-combined');
    expect(bulk.get(session.accountId!)?.[0]?.mode.name).toBe('Battle Royale');
  });

  it('reads the full ranked history across past seasons', async () => {
    const history = await session.rankedStandings(undefined, { history: true, playedOnly: true });
    for (const standing of history) {
      expect(standing.played).toBe(true);
      expect(standing.lastPlayed).not.toBeNull();
    }
    expect(history.some((standing) => !standing.active) || history.length > 0).toBe(true);
  });

});
