import { describe, expect, it } from 'vitest';
import {
  HabaneroManager,
  RankingType,
  RANKING_TYPES,
  isRankingType,
} from '../../src/epic/habanero.js';
import { EpicRestClient } from '../../src/epic/rest.js';
import { ValidationError } from '../../src/core/errors.js';
import { createMockFetch, type MockFetch, type MockResponseInit } from '../helpers/mockFetch.js';

function setup(...responses: MockResponseInit[]): { mock: MockFetch; ranked: HabaneroManager } {
  const mock = createMockFetch(...responses);
  const rest = new EpicRestClient({ fetch: mock.fetch, retry: 1 });
  return { mock, ranked: new HabaneroManager(rest) };
}

async function captureThrow(fn: () => unknown): Promise<unknown> {
  try {
    await fn();
  } catch (error) {
    return error;
  }
  throw new Error('Expected the call to throw');
}

const track = {
  gameId: 'fortnite',
  trackguid: 'gr4p3s',
  rankingType: 'ranked-br',
  beginTime: '2026-03-19T06:00:01Z',
  endTime: '2026-07-01T00:00:00Z',
  divisionCount: 18,
  leaderboardTrackingEventId: 'epicgames_ranked_br_season40',
};

const progress = {
  gameId: 'fortnite',
  trackguid: 'gr4p3s',
  accountId: 'ACC',
  rankingType: 'ranked-br',
  lastUpdated: '2023-05-17T16:08:36.367Z',
  currentDivision: 3,
  highestDivision: 3,
  promotionProgress: 0.19,
  currentPlayerRanking: null,
};

describe('RankingType enum', () => {
  it('exposes the known ranking types', () => {
    expect(RankingType.BattleRoyaleBuild).toBe('ranked-br');
    expect(RankingType.ZeroBuild).toBe('ranked-zb');
    expect(RANKING_TYPES).toContain('delmar-competitive');
    expect(RANKING_TYPES.length).toBe(14);
  });

  it('guards ranking types', () => {
    expect(isRankingType('ranked-br')).toBe(true);
    expect(isRankingType('not-a-type')).toBe(false);
    expect(isRankingType(42)).toBe(false);
  });
});

describe('HabaneroManager', () => {
  it('queries the tracks list', async () => {
    const { mock, ranked } = setup({ body: [track] });
    const result = await ranked.tracks('AT');
    const request = mock.lastRequest();
    expect(request.method).toBe('GET');
    expect(request.path).toBe('/api/v1/games/fortnite/tracks/query');
    expect(request.headers['authorization']).toBe('Bearer AT');
    expect(result).toEqual([track]);
  });

  it('passes endsAfter and rankingType query params', async () => {
    const { mock, ranked } = setup({ body: [] });
    await ranked.tracks('AT', { endsAfter: '2026-01-01T00:00:00Z', rankingType: RankingType.ZeroBuild });
    const request = mock.lastRequest();
    expect(request.query.get('endsAfter')).toBe('2026-01-01T00:00:00Z');
    expect(request.query.get('rankingType')).toBe('ranked-zb');
  });

  it('fetches a track by guid', async () => {
    const { mock, ranked } = setup({ body: track });
    await ranked.trackByGuid('AT', 'gr4p3s');
    const request = mock.lastRequest();
    expect(request.path).toBe('/api/v1/games/fortnite/tracks/byGUID/gr4p3s');
  });

  it('fetches active tracks by date', async () => {
    const { mock, ranked } = setup({ body: [track] });
    await ranked.activeTracks('AT', '2026-05-01T00:00:00Z');
    const request = mock.lastRequest();
    expect(request.path).toBe('/api/v1/games/fortnite/tracks/activeBy/2026-05-01T00%3A00%3A00Z');
  });

  it('fetches track progress for an account', async () => {
    const { mock, ranked } = setup({ body: progress });
    await ranked.progress('AT', 'ACC', 'gr4p3s');
    const request = mock.lastRequest();
    expect(request.path).toBe('/api/v1/games/fortnite/trackprogress/ACC/byTrack/gr4p3s');
  });

  it('fetches all progress for an account with endsAfter', async () => {
    const { mock, ranked } = setup({ body: [progress] });
    await ranked.allProgress('AT', 'ACC', { endsAfter: '2026-01-01T00:00:00Z' });
    const request = mock.lastRequest();
    expect(request.path).toBe('/api/v1/games/fortnite/trackprogress/ACC');
    expect(request.query.get('endsAfter')).toBe('2026-01-01T00:00:00Z');
  });

  it('posts bulk progress by account ids', async () => {
    const { mock, ranked } = setup({ body: [progress] });
    await ranked.bulkProgress('AT', 'gr4p3s', ['a', 'b']);
    const request = mock.lastRequest();
    expect(request.method).toBe('POST');
    expect(request.path).toBe('/api/v1/games/fortnite/trackprogress/byAccountIds/gr4p3s');
    expect(JSON.parse(request.body ?? '{}')).toEqual({ accountIds: ['a', 'b'] });
  });

  it('posts bulk progress by ranking type', async () => {
    const { mock, ranked } = setup({ body: [progress] });
    await ranked.bulkProgressByRankingType('AT', RankingType.BattleRoyaleBuild, ['a', 'b']);
    const request = mock.lastRequest();
    expect(request.method).toBe('POST');
    expect(request.path).toBe('/api/v1/games/fortnite/trackprogress/bulkByRankingType');
    expect(request.query.get('rankingType')).toBe('ranked-br');
    expect(JSON.parse(request.body ?? '{}')).toEqual({ accountIds: ['a', 'b'] });
  });

  it('honors a per-call namespace override', async () => {
    const { mock, ranked } = setup({ body: [] });
    await ranked.tracks('AT', { namespace: 'custom' });
    expect(mock.lastRequest().path).toBe('/api/v1/games/custom/tracks/query');
  });

  it('rejects an empty account ids array without a request', async () => {
    const { mock, ranked } = setup();
    expect(await captureThrow(() => ranked.bulkProgress('AT', 'g', []))).toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });

  it('rejects more than 25 account ids without a request', async () => {
    const { mock, ranked } = setup();
    const ids = Array.from({ length: 26 }, (_, i) => String(i));
    expect(await captureThrow(() => ranked.bulkProgress('AT', 'g', ids))).toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });

  it('rejects a blank access token without a request', async () => {
    const { mock, ranked } = setup();
    expect(await captureThrow(() => ranked.tracks(''))).toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });
});
