import { describe, expect, it } from 'vitest';
import {
  PlaytimeManager,
  PLAYTIME_ARTIFACT_ID,
  PLAYTIME_MACHINE_ID,
} from '../../src/epic/playtime.js';
import { EpicRestClient } from '../../src/epic/rest.js';
import { ValidationError } from '../../src/core/errors.js';
import { createMockFetch, type MockFetch, type MockResponseInit } from '../helpers/mockFetch.js';

function setup(...responses: MockResponseInit[]): { mock: MockFetch; playtime: PlaytimeManager } {
  const mock = createMockFetch(...responses);
  const rest = new EpicRestClient({
    fetch: mock.fetch,
    retry: 1,
    baseUrl: 'https://library-service.live.use1a.on.epicgames.com',
  });
  return { mock, playtime: new PlaytimeManager(rest) };
}

async function captureThrow(run: () => Promise<unknown>): Promise<unknown> {
  try {
    await run();
  } catch (error) {
    return error;
  }
  throw new Error('Expected the call to throw');
}

describe('PlaytimeManager', () => {
  it('gets playtime for the default artifact', async () => {
    const { mock, playtime } = setup({
      body: { accountId: 'acc', artifactId: PLAYTIME_ARTIFACT_ID, totalTime: 3600 },
    });
    const info = await playtime.get('token', 'acc');
    const request = mock.lastRequest();
    expect(request.path).toBe(
      `/library/api/public/playtime/account/acc/artifact/${PLAYTIME_ARTIFACT_ID}`,
    );
    expect(request.headers['authorization']).toBe('Bearer token');
    expect(info.totalTime).toBe(3600);
  });

  it('gets all playtime artifacts', async () => {
    const { mock, playtime } = setup({ body: [] });
    await playtime.getAll('token', 'acc');
    expect(mock.lastRequest().path).toBe('/library/api/public/playtime/account/acc/all');
  });

  it('adds a segment spanning exactly the requested seconds', async () => {
    const { mock, playtime } = setup({ status: 204 });
    const end = new Date('2026-08-21T12:00:00.000Z');
    await playtime.addSeconds('token', 'acc', 3600, { endTime: end });
    const request = mock.lastRequest();
    expect(request.method).toBe('PUT');
    expect(request.path).toBe('/library/api/public/playtime/account/acc');
    const payload = JSON.parse(request.body ?? '{}') as {
      startTime: string;
      endTime: string;
      machineId: string;
      artifactId: string;
      startSegment: boolean;
      endSegment: boolean;
    };
    expect(payload.endTime).toBe(end.toISOString());
    const span = new Date(payload.endTime).getTime() - new Date(payload.startTime).getTime();
    expect(span).toBe(3600 * 1000);
    expect(payload.machineId).toBe(PLAYTIME_MACHINE_ID);
    expect(payload.artifactId).toBe(PLAYTIME_ARTIFACT_ID);
    expect(payload.startSegment).toBe(true);
    expect(payload.endSegment).toBe(true);
  });

  it('rejects non-positive seconds', async () => {
    const { playtime } = setup({ status: 204 });
    expect(await captureThrow(() => playtime.addSeconds('token', 'acc', 0))).toBeInstanceOf(
      ValidationError,
    );
    expect(await captureThrow(() => playtime.addSeconds('token', 'acc', -5))).toBeInstanceOf(
      ValidationError,
    );
  });

  it('validates account id', async () => {
    const { playtime } = setup({ body: {} });
    expect(await captureThrow(() => playtime.get('token', ''))).toBeInstanceOf(ValidationError);
  });
});
