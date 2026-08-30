import { describe, expect, it } from 'vitest';
import { EpicGamesClient } from '../../src/epic/index.js';
import { EcosystemInterval, EcosystemMetric, IslandMetric } from '../../src/epic/ecosystem.js';
import { ValidationError, ServerError } from '../../src/core/errors.js';
import type { EpicClientOptions } from '../../src/epic/index.js';
import { createMockFetch, type MockFetch } from '../helpers/mockFetch.js';

const ECOSYSTEM_HOST = 'https://api.fortnite.com';

function createClient(mock: MockFetch, options: EpicClientOptions = {}): EpicGamesClient {
  return new EpicGamesClient({ ...options, fetch: mock.fetch, retry: 0 });
}

function ok(body: unknown): MockFetch {
  return createMockFetch({ status: 200, body });
}

function fail(status: number, message: string): MockFetch {
  return createMockFetch({
    status,
    body: { errorCode: 'errors.com.epicgames.not_found', errorMessage: message, uuid: 'x' },
  });
}

const islandsFixture = {
  links: { prev: null, next: '/ecosystem/v1/islands?after=abc' },
  meta: { count: 1, page: { prevCursor: null, nextCursor: 'abc' } },
  data: [
    {
      code: '1234-1234-1234',
      title: 'Fortnite Island',
      type: 'island',
      tags: ['1v1'],
      meta: { page: { cursor: 'abc' } },
    },
  ],
};

const islandFixture = {
  code: '1234-1234-1234',
  title: 'Fortnite Island',
  creatorCode: 'fortnite',
  tags: ['1v1'],
};

const metricFixture = {
  intervals: [{ value: 50, timestamp: '2025-06-01T01:20:00.000Z' }],
};

describe('EcosystemEndpoint islands', () => {
  it('requests /ecosystem/v1/islands and returns the raw body', async () => {
    const mock = ok(islandsFixture);
    const client = createClient(mock);

    const result = await client.ecosystem.islands();

    expect(result).toEqual(islandsFixture);
    expect(mock.lastRequest().url.startsWith(ECOSYSTEM_HOST)).toBe(true);
    expect(mock.lastRequest().path).toBe('/ecosystem/v1/islands');
  });

  it('forwards pagination params', async () => {
    const mock = ok(islandsFixture);
    const client = createClient(mock);

    await client.ecosystem.islands({ after: 'abc', before: 'def', size: 25 });

    const query = mock.lastRequest().query;
    expect(query.get('after')).toBe('abc');
    expect(query.get('before')).toBe('def');
    expect(query.get('size')).toBe('25');
  });

  it('does not send an authorization header to the ecosystem host', async () => {
    const mock = ok(islandsFixture);
    const client = createClient(mock);

    await client.ecosystem.islands();

    expect(mock.lastRequest().headers['authorization']).toBeUndefined();
  });

  it('requests a single island by code', async () => {
    const mock = ok(islandFixture);
    const client = createClient(mock);

    const island = await client.ecosystem.island('1234-1234-1234');

    expect(island).toEqual(islandFixture);
    expect(mock.lastRequest().path).toBe('/ecosystem/v1/islands/1234-1234-1234');
  });

  it('url-encodes the island code', async () => {
    const mock = ok(islandFixture);
    const client = createClient(mock);

    await client.ecosystem.island('battle royale/1');

    expect(mock.lastRequest().path).toBe('/ecosystem/v1/islands/battle%20royale%2F1');
  });

  it('throws a ValidationError for a blank code', async () => {
    const mock = ok(islandFixture);
    const client = createClient(mock);

    await expect(client.ecosystem.island('  ')).rejects.toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });

  it('findIsland returns null on a 404', async () => {
    const mock = fail(404, 'not found');
    const client = createClient(mock);

    await expect(client.ecosystem.findIsland('0000-0000-0000')).resolves.toBeNull();
  });

  it('findIsland rethrows non-404 failures', async () => {
    const mock = fail(500, 'boom');
    const client = createClient(mock);

    await expect(client.ecosystem.findIsland('0000-0000-0000')).rejects.toBeInstanceOf(ServerError);
  });
});

describe('EcosystemEndpoint island metrics', () => {
  it('requests the aggregate metrics with a date range', async () => {
    const mock = ok({});
    const client = createClient(mock);

    await client.ecosystem.islandMetrics('1234-1234-1234', {
      from: '2025-04-29T00:00:00.000Z',
      to: new Date('2025-04-30T00:00:00.000Z'),
    });

    expect(mock.lastRequest().path).toBe('/ecosystem/v1/islands/1234-1234-1234/metrics');
    expect(mock.lastRequest().query.get('from')).toBe('2025-04-29T00:00:00.000Z');
    expect(mock.lastRequest().query.get('to')).toBe('2025-04-30T00:00:00.000Z');
  });

  it('requests filterable interval metrics with repeated metric params', async () => {
    const mock = ok({});
    const client = createClient(mock);

    await client.ecosystem.islandMetricsByInterval('1234-1234-1234', EcosystemInterval.Hour, {
      metrics: [IslandMetric.PeakCCU, IslandMetric.UniquePlayers],
    });

    expect(mock.lastRequest().path).toBe('/ecosystem/v1/islands/1234-1234-1234/metrics/hour');
    expect(mock.lastRequest().query.getAll('metrics')).toEqual(['peakCCU', 'uniquePlayers']);
  });

  it('routes each single-metric helper to its path', async () => {
    const mock = ok(metricFixture);
    const client = createClient(mock);
    const code = '1234-1234-1234';

    await client.ecosystem.islandPeakCcu(code, EcosystemInterval.Day);
    expect(mock.lastRequest().path).toBe(`/ecosystem/v1/islands/${code}/metrics/day/peak-ccu`);

    await client.ecosystem.islandFavorites(code, EcosystemInterval.Day);
    expect(mock.lastRequest().path).toBe(`/ecosystem/v1/islands/${code}/metrics/day/favorites`);

    await client.ecosystem.islandMinutesPlayed(code, EcosystemInterval.Day);
    expect(mock.lastRequest().path).toBe(`/ecosystem/v1/islands/${code}/metrics/day/minutes-played`);

    await client.ecosystem.islandAverageMinutesPerPlayer(code, EcosystemInterval.Day);
    expect(mock.lastRequest().path).toBe(
      `/ecosystem/v1/islands/${code}/metrics/day/average-minutes-per-player`,
    );

    await client.ecosystem.islandRecommendations(code, EcosystemInterval.Day);
    expect(mock.lastRequest().path).toBe(`/ecosystem/v1/islands/${code}/metrics/day/recommendations`);

    await client.ecosystem.islandUniquePlayers(code, EcosystemInterval.Day);
    expect(mock.lastRequest().path).toBe(`/ecosystem/v1/islands/${code}/metrics/day/unique-players`);

    await client.ecosystem.islandPlays(code, EcosystemInterval.Day);
    expect(mock.lastRequest().path).toBe(`/ecosystem/v1/islands/${code}/metrics/day/plays`);

    await client.ecosystem.islandRetention(code, EcosystemInterval.Day);
    expect(mock.lastRequest().path).toBe(`/ecosystem/v1/islands/${code}/metrics/day/retention`);
  });

  it('rejects an invalid interval without a request', async () => {
    const mock = ok(metricFixture);
    const client = createClient(mock);

    await expect(
      // @ts-expect-error runtime guard for JS callers
      client.ecosystem.islandPeakCcu('1234-1234-1234', 'week'),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });

  it('requests island rankings, returning only the latest snapshot without a range', async () => {
    const mock = ok({ data: [] });
    const client = createClient(mock);

    await client.ecosystem.islandRankings('1234-1234-1234');

    expect(mock.lastRequest().path).toBe('/ecosystem/v1/islands/1234-1234-1234/rankings');
    expect(mock.lastRequest().query.get('from')).toBeNull();
    expect(mock.lastRequest().query.get('to')).toBeNull();
  });
});

describe('EcosystemEndpoint genres', () => {
  it('requests /ecosystem/v1/genres', async () => {
    const mock = ok({ data: [{ slug: 'simulation-tycoon', displayName: 'Simulation & Tycoon' }] });
    const client = createClient(mock);

    const genres = await client.ecosystem.genres();

    expect(genres.data[0]?.slug).toBe('simulation-tycoon');
    expect(mock.lastRequest().path).toBe('/ecosystem/v1/genres');
  });

  it('requests a genre ranking leaderboard at a snapshot', async () => {
    const mock = ok({ links: { prev: null, next: null }, meta: {}, data: [] });
    const client = createClient(mock);

    await client.ecosystem.genreRankings('simulation-tycoon', {
      at: '2026-07-13T18:00:00.000Z',
      size: 50,
    });

    expect(mock.lastRequest().path).toBe('/ecosystem/v1/genres/simulation-tycoon/rankings');
    expect(mock.lastRequest().query.get('at')).toBe('2026-07-13T18:00:00.000Z');
    expect(mock.lastRequest().query.get('size')).toBe('50');
  });

  it('throws a ValidationError for a blank slug', async () => {
    const mock = ok({ data: [] });
    const client = createClient(mock);

    await expect(client.ecosystem.genreRankings('')).rejects.toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });
});

describe('EcosystemEndpoint ecosystem-wide metrics', () => {
  it('requests filterable metrics with repeated metric params', async () => {
    const mock = ok({});
    const client = createClient(mock);

    await client.ecosystem.metrics(EcosystemInterval.Minute, {
      metrics: [EcosystemMetric.InMatchPeakCCU, EcosystemMetric.InClientPeakCCU],
    });

    expect(mock.lastRequest().path).toBe('/ecosystem/v1/metrics/minute');
    expect(mock.lastRequest().query.getAll('metrics')).toEqual([
      'inMatchPeakCCU',
      'inClientPeakCCU',
    ]);
  });

  it('requests the in-client and in-match peak ccu paths', async () => {
    const mock = ok(metricFixture);
    const client = createClient(mock);

    await client.ecosystem.inClientPeakCcu(EcosystemInterval.Hour);
    expect(mock.lastRequest().path).toBe('/ecosystem/v1/metrics/hour/in-client-peak-ccu');

    await client.ecosystem.inMatchPeakCcu(EcosystemInterval.Hour);
    expect(mock.lastRequest().path).toBe('/ecosystem/v1/metrics/hour/in-match-peak-ccu');
  });

  it('rejects an invalid interval on ecosystem metrics', async () => {
    const mock = ok(metricFixture);
    const client = createClient(mock);

    await expect(
      // @ts-expect-error runtime guard for JS callers
      client.ecosystem.metrics('year'),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });
});
