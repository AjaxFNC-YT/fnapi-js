import { describe, expect, it } from 'vitest';
import { EpicGamesClient } from '../../src/epic/client.js';
import type { HabaneroProgress, HabaneroTrack } from '../../src/epic/habanero.js';
import {
  RANK_TIER_COLORS,
  rankForDivision,
  rankForTrack,
  rankedMode,
  toRankedStanding,
  trackSeason,
  unrankedRank,
} from '../../src/epic/ranked.js';
import type { OAuthToken } from '../../src/epic/types.js';
import { createMockFetch } from '../helpers/mockFetch.js';

const track = (overrides: Partial<HabaneroTrack> = {}): HabaneroTrack => ({
  gameId: 'fortnite',
  trackguid: 'B0TTL3',
  rankingType: 'ranked-blastberry-combined',
  beginTime: '2026-10-08T11:00:00Z',
  endTime: '2099-10-08T11:00:00Z',
  divisionCount: 22,
  leaderboardTrackingEventId: 'epicgames_ranked_blastberry_combined_season42',
  ...overrides,
});

const progress = (overrides: Partial<HabaneroProgress> = {}): HabaneroProgress => ({
  gameId: 'fortnite',
  trackguid: 'B0TTL3',
  accountId: 'ACC',
  rankingType: 'ranked-blastberry-combined',
  lastUpdated: '2026-10-09T18:13:19.085Z',
  currentDivision: 21,
  highestDivision: 21,
  promotionProgress: 0.09,
  currentPlayerRanking: 998,
  rankingRating: 2539,
  highestRating: 2539,
  ...overrides,
});

describe('rankForDivision', () => {
  it('maps the 22 division ladder with Elite and Champion sub ranks', () => {
    expect(rankForDivision(0).name).toBe('Bronze I');
    expect(rankForDivision(10).name).toBe('Platinum II');
    expect(rankForDivision(15).name).toBe('Elite I');
    expect(rankForDivision(17).name).toBe('Elite III');
    expect(rankForDivision(18).name).toBe('Champion I');
    expect(rankForDivision(20).name).toBe('Champion III');
    expect(rankForDivision(21)).toMatchObject({ name: 'Unreal', tier: 'unreal', subdivision: null });
  });

  it('maps the legacy 18 division ladder with single Elite and Champion', () => {
    expect(rankForDivision(14, 18).name).toBe('Diamond III');
    expect(rankForDivision(15, 18)).toMatchObject({ name: 'Elite', tier: 'elite', subdivision: null });
    expect(rankForDivision(16, 18).name).toBe('Champion');
    expect(rankForDivision(17, 18).name).toBe('Unreal');
  });

  it('clamps out of range divisions and falls back for unknown ladders', () => {
    expect(rankForDivision(99).name).toBe('Unreal');
    expect(rankForDivision(-3).name).toBe('Bronze I');
    expect(rankForDivision(40, 101)).toMatchObject({ name: 'Division 41', tier: 'unranked' });
  });

  it('carries the game colours for each tier', () => {
    expect(rankForDivision(7).colors).toEqual(RANK_TIER_COLORS.gold);
    expect(rankForDivision(21).colors).toEqual(RANK_TIER_COLORS.unreal);
    expect(unrankedRank().name).toBe('Unranked');
  });

  it('applies the season 35 rank names only to that season', () => {
    const season35 = track({ rankingType: 'ranked-br-combined', leaderboardTrackingEventId: 'epicgames_ranked_br_season35' });
    expect(trackSeason(season35)).toBe(35);
    expect(rankForTrack(21, season35)).toMatchObject({ name: 'Unreal', seasonalName: 'Emperor' });
    expect(rankForTrack(19, season35).seasonalName).toBe('Admiral');
    expect(rankForTrack(18, season35).seasonalName).toBeNull();
    const legacy35 = track({ rankingType: 'ranked-zb', divisionCount: 18, leaderboardTrackingEventId: 'epicgames_ranked_zb_season35' });
    expect(rankForTrack(16, legacy35).seasonalName).toBe('Grand Moff');
    expect(rankForTrack(21, track()).seasonalName).toBeNull();
  });
});

describe('rankedMode', () => {
  it('names known modes and falls back to the raw ranking type', () => {
    expect(rankedMode('ranked-blastberry-combined')).toMatchObject({ name: 'Reload', combined: true, zeroBuild: null });
    expect(rankedMode('ranked_blastberry_nobuild')).toMatchObject({ name: 'Reload Zero Build', zeroBuild: true });
    expect(rankedMode('ranked-figment-build')).toMatchObject({ name: 'Fortnite OG', legacy: true });
    expect(rankedMode('delmar-competitive')).toMatchObject({ name: 'Rocket Racing', legacy: true });
    expect(rankedMode('ranked-br')).toMatchObject({ legacy: true });
    expect(rankedMode('ranked-br-combined')).toMatchObject({ legacy: false });
    expect(rankedMode('ranked-squareclub')).toMatchObject({ legacy: false });
    expect(rankedMode('something-new')).toMatchObject({ legacy: false });
    expect(rankedMode('something-new').name).toBe('something-new');
  });
});

describe('toRankedStanding', () => {
  it('reads an Unreal player with placement and rating', () => {
    const standing = toRankedStanding(progress(), track());
    expect(standing).toMatchObject({
      played: true,
      active: true,
      unrealRank: 998,
      rating: 2539,
      highestRating: 2539,
      progress: 1,
      lastPlayed: '2026-10-09T18:13:19.085Z',
    });
    expect(standing.current.name).toBe('Unreal');
    expect(standing.mode.name).toBe('Reload');
  });

  it('marks top 500 Unreal players in a Legend mode as Unreal Legend', () => {
    const legend = toRankedStanding(progress({ currentPlayerRanking: 120 }), track());
    expect(legend.unrealLegend).toBe(true);
    expect(legend.current).toMatchObject({ name: 'Unreal Legend', tier: 'unreal-legend', division: 21 });
    expect(legend.unrealRank).toBe(120);
    expect(legend.highest.name).toBe('Unreal');

    expect(toRankedStanding(progress({ currentPlayerRanking: 500 }), track()).unrealLegend).toBe(true);
    expect(toRankedStanding(progress({ currentPlayerRanking: 501 }), track()).unrealLegend).toBe(false);
    expect(toRankedStanding(progress({ currentPlayerRanking: 998 }), track(), { unrealLegendTop: 1000 }).current.name).toBe('Unreal Legend');
  });

  it('never gives Unreal Legend in modes without it', () => {
    const arenas = toRankedStanding(
      progress({ rankingType: 'ranked-squareclub', trackguid: 'D3TA1L', currentPlayerRanking: 5 }),
      track({ rankingType: 'ranked-squareclub', trackguid: 'D3TA1L' }),
    );
    expect(arenas.unrealLegend).toBe(false);
    expect(arenas.current.name).toBe('Unreal');
    expect(arenas.unrealRank).toBe(5);
  });

  it('treats the epoch timestamp as never played and hides the -1 rating', () => {
    const standing = toRankedStanding(
      progress({ lastUpdated: '1970-01-01T00:00:00Z', currentDivision: 0, highestDivision: 0, rankingRating: -1, currentPlayerRanking: undefined }),
      track(),
    );
    expect(standing).toMatchObject({ played: false, rating: null, unrealRank: null, lastPlayed: null });
    expect(standing.current.name).toBe('Unranked');
  });

  it('reports promotion progress below Unreal and marks finished tracks inactive', () => {
    const standing = toRankedStanding(
      progress({ currentDivision: 1, highestDivision: 2, promotionProgress: 0.48, currentPlayerRanking: undefined }),
      track({ endTime: '2020-01-01T00:00:00Z' }),
    );
    expect(standing).toMatchObject({ progress: 0.48, active: false, unrealRank: null });
    expect(standing.current.name).toBe('Bronze II');
    expect(standing.highest.name).toBe('Bronze III');
  });
});

describe('EpicAuthSession ranked standings', () => {
  function makeToken(): OAuthToken {
    return {
      access_token: 'AT',
      refresh_token: 'RT',
      expires_in: 7200,
      expires_at: new Date(Date.now() + 7_200_000).toISOString(),
      account_id: 'ACC',
      displayName: 'Me',
      client_id: 'c',
      token_type: 'bearer',
      internal_client: true,
      client_service: 'fortnite',
    };
  }

  it('joins progress with the current tracks and puts played modes first', async () => {
    const mock = createMockFetch(
      {
        status: 200,
        body: [
          progress({ trackguid: 'ORANGE', rankingType: 'delmar-competitive', lastUpdated: '1970-01-01T00:00:00Z', currentDivision: 0 }),
          progress(),
        ],
      },
      { status: 200, body: [track(), track({ trackguid: 'ORANGE', rankingType: 'delmar-competitive', divisionCount: 18 })] },
      { status: 200, body: [progress()] },
    );
    const session = new EpicGamesClient({ fetch: mock.fetch, retry: 1 }).session(makeToken());
    const standings = await session.rankedStandings();
    expect(standings.map((standing) => [standing.mode.name, standing.current.name])).toEqual([
      ['Reload', 'Unreal'],
      ['Rocket Racing', 'Unranked'],
    ]);
    expect(await session.rankedStandings(undefined, { playedOnly: true })).toHaveLength(1);
  });

  it('keeps legacy modes the api still returns and can drop them on request', async () => {
    const tracks = [track(), track({ trackguid: 'ORANGE', rankingType: 'delmar-competitive', divisionCount: 18 })];
    const both = [progress({ trackguid: 'ORANGE', rankingType: 'delmar-competitive', currentDivision: 16, highestDivision: 16 }), progress()];
    const mock = createMockFetch({ status: 200, body: both }, { status: 200, body: tracks }, { status: 200, body: both });
    const session = new EpicGamesClient({ fetch: mock.fetch, retry: 1 }).session(makeToken());
    const standings = await session.rankedStandings();
    expect(standings.map((standing) => [standing.mode.name, standing.mode.legacy, standing.current.name])).toEqual([
      ['Reload', false, 'Unreal'],
      ['Rocket Racing', true, 'Champion'],
    ]);
    const current = await session.rankedStandings(undefined, { includeLegacy: false });
    expect(current.map((standing) => standing.rankingType)).toEqual(['ranked-blastberry-combined']);
  });

  it('chunks bulk standings into 25 accounts per request', async () => {
    const mock = createMockFetch({ status: 200, body: [track()] }, { status: 200, body: [progress()] });
    const session = new EpicGamesClient({ fetch: mock.fetch, retry: 1 }).session(makeToken());
    const ids = Array.from({ length: 30 }, (_, index) => (index === 0 ? 'ACC' : `id${index}`));
    const result = await session.rankedStandingsBulk(ids);
    const bulkRequests = mock.requests.filter((request) => request.method === 'POST');
    expect(bulkRequests.map((request) => JSON.parse(request.body ?? '{}').accountIds.length)).toEqual([25, 5]);
    expect(result.get('ACC')?.[0]?.current.name).toBe('Unreal');
    expect(result.size).toBe(30);
  });
});
