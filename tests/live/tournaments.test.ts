import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { EpicGamesClient, type EpicAuthSession, type Tournament } from '../../src/index.js';

interface EpicConfig {
  epic?: { deviceAuth?: { accountId?: string; deviceId?: string; secret?: string } };
}

const here = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(resolve(here, '../../config.json'), 'utf8')) as EpicConfig;
const deviceAuth = config.epic?.deviceAuth;
const hasDeviceAuth = !!deviceAuth?.accountId && !!deviceAuth?.deviceId && !!deviceAuth?.secret;

describe.skipIf(!hasDeviceAuth)('live tournaments (events service)', () => {
  let session: EpicAuthSession;
  let tournaments: Tournament[];

  beforeAll(async () => {
    session = await new EpicGamesClient({ retry: 2 }).loginWithDeviceAuth({
      accountId: deviceAuth!.accountId!,
      deviceId: deviceAuth!.deviceId!,
      secret: deviceAuth!.secret!,
    });
    tournaments = await session.tournaments({ region: 'EU', showPastEvents: true });
  });

  afterAll(async () => {
    await session?.logout().catch(() => undefined);
  });

  it('lists EU tournaments with display names, sorted the way the game shows them', () => {
    expect(tournaments.length).toBeGreaterThan(0);
    const order = { live: 0, upcoming: 1, ended: 2 };
    for (let index = 1; index < tournaments.length; index += 1) {
      expect(order[tournaments[index - 1]!.status]).toBeLessThanOrEqual(order[tournaments[index]!.status]);
    }
    const named = tournaments.filter((tournament) => tournament.display);
    expect(named.length / tournaments.length).toBeGreaterThan(0.8);
    for (const tournament of tournaments) {
      expect(tournament.regions).toContain('EU');
      expect(tournament.windows.length).toBeGreaterThan(0);
      expect(tournament.windows.every((window) => typeof window.eligible === 'boolean')).toBe(true);
      if (tournament.status !== 'ended') expect(tournament.nextWindow).not.toBeNull();
    }
  });

  it('reads a finished window leaderboard and the caller-relative score lookup', async () => {
    const ended = tournaments.flatMap((tournament) =>
      tournament.windows.filter((window) => window.status === 'ended').map((window) => ({ tournament, window })),
    )[0];
    if (!ended) return;
    const board = await session.tournamentLeaderboard(ended.tournament.eventId, ended.window.id);
    expect(board.eventWindowId).toBe(ended.window.id);
    if (board.entries.length === 0) return;
    expect(board.entries[0]!.rank).toBe(1);

    const leader = board.entries[0]!.teamAccountIds;
    const around = await session.tournamentScores(ended.tournament.eventId, ended.window.id, {
      teams: [leader],
      aroundTeamIds: [leader],
    });
    expect(around.some((row) => row.teamAccountIds.join() === leader.join())).toBe(true);
  });

  it('reads player tokens and history', async () => {
    const [player, tokens] = await Promise.all([session.tournamentPlayer(), session.tournamentTokens()]);
    expect(player.accountId).toBe(session.accountId);
    expect(tokens.accounts[0]?.accountId).toBe(session.accountId);
    expect(Array.isArray(await session.tournamentHistory(tournaments[0]!.eventId))).toBe(true);
  });
});
