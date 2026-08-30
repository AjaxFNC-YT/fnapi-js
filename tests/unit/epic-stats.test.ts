import { describe, expect, it } from 'vitest';
import {
  StatsProxyManager,
  StatsCategory,
  STATS_APP_ID,
  STATS_MAX_TIMESTAMP,
} from '../../src/epic/stats.js';
import { EpicRestClient } from '../../src/epic/rest.js';
import { ValidationError } from '../../src/core/errors.js';
import { createMockFetch, type MockFetch, type MockResponseInit } from '../helpers/mockFetch.js';

function setup(...responses: MockResponseInit[]): { mock: MockFetch; stats: StatsProxyManager } {
  const mock = createMockFetch(...responses);
  const rest = new EpicRestClient({ fetch: mock.fetch, retry: 1 });
  return { mock, stats: new StatsProxyManager(rest) };
}

async function captureThrow(fn: () => unknown): Promise<unknown> {
  try {
    await fn();
  } catch (error) {
    return error;
  }
  throw new Error('Expected the call to throw');
}

describe('StatsProxyManager', () => {
  it('fetches user stats with time-window query params', async () => {
    const { mock, stats } = setup({ body: { startTime: 0, endTime: 0, stats: {}, accountId: 'ACC' } });
    await stats.userStats('AT', 'ACC', { startTime: 100, endTime: 200 });
    const request = mock.lastRequest();
    expect(request.method).toBe('GET');
    expect(request.path).toBe('/statsproxy/api/statsv2/account/ACC');
    expect(request.query.get('startTime')).toBe('100');
    expect(request.query.get('endTime')).toBe('200');
  });

  it('returns null for a private stats profile (204)', async () => {
    const { stats } = setup({ status: 204 });
    const result = await stats.userStats('AT', 'ACC');
    expect(result).toBeNull();
  });

  it('posts a bulk stats query with default app id and timestamps', async () => {
    const { mock, stats } = setup({ body: [] });
    await stats.userStatsBulk('AT', ['a', 'b'], { stats: ['br_placetop1'] });
    const request = mock.lastRequest();
    expect(request.method).toBe('POST');
    expect(request.path).toBe('/statsproxy/api/statsv2/query');
    expect(JSON.parse(request.body ?? '{}')).toEqual({
      appId: STATS_APP_ID,
      startDate: 0,
      endDate: STATS_MAX_TIMESTAMP,
      owners: ['a', 'b'],
      stats: ['br_placetop1'],
    });
  });

  it('passes a collection category as a query param', async () => {
    const { mock, stats } = setup({ body: [] });
    await stats.userStatsBulk('AT', ['a'], { category: StatsCategory.Fish });
    expect(mock.lastRequest().query.get('category')).toBe('collection_fish');
  });

  it('fetches a leaderboard by name', async () => {
    const { mock, stats } = setup({ body: { entries: [], maxSize: 1000 } });
    await stats.leaderboard('AT', 'br_placetop1_keyboardmouse_m0_playlist_defaultsolo');
    expect(mock.lastRequest().path).toBe(
      '/statsproxy/api/statsv2/leaderboards/br_placetop1_keyboardmouse_m0_playlist_defaultsolo',
    );
  });

  it('rejects an empty account ids array without a request', async () => {
    const { mock, stats } = setup();
    expect(await captureThrow(() => stats.userStatsBulk('AT', []))).toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });

  it('rejects a bulk query with no stats and no category without a request', async () => {
    const { mock, stats } = setup();
    expect(await captureThrow(() => stats.userStatsBulk('AT', ['a']))).toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });

  it('serializes a default endDate that fits in a Java long', () => {
    const serialized = JSON.stringify(STATS_MAX_TIMESTAMP);
    expect(serialized).toBe('9223372036854775000');
    expect(BigInt(serialized) <= 9223372036854775807n).toBe(true);
  });
});
