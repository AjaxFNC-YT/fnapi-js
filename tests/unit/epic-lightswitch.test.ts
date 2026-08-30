import { describe, expect, it } from 'vitest';
import { LightswitchManager, LIGHTSWITCH_BULK_BASE_URL } from '../../src/epic/lightswitch.js';
import { EpicRestClient } from '../../src/epic/rest.js';
import { ValidationError } from '../../src/core/errors.js';
import { createMockFetch, type MockFetch, type MockResponseInit } from '../helpers/mockFetch.js';

function setup(...responses: MockResponseInit[]): { mock: MockFetch; lightswitch: LightswitchManager } {
  const mock = createMockFetch(...responses);
  const rest = new EpicRestClient({ fetch: mock.fetch, retry: 1 });
  const bulkRest = new EpicRestClient({ fetch: mock.fetch, retry: 1, baseUrl: LIGHTSWITCH_BULK_BASE_URL });
  return { mock, lightswitch: new LightswitchManager(rest, bulkRest) };
}

async function captureThrow(fn: () => unknown): Promise<unknown> {
  try {
    await fn();
  } catch (error) {
    return error;
  }
  throw new Error('Expected the call to throw');
}

describe('LightswitchManager', () => {
  it('fetches the default service status', async () => {
    const { mock, lightswitch } = setup({ body: { serviceInstanceId: 'fortnite', status: 'UP' } });
    await lightswitch.status('AT');
    const request = mock.lastRequest();
    expect(request.method).toBe('GET');
    expect(request.path).toBe('/lightswitch/api/service/Fortnite/status');
    expect(request.headers['authorization']).toBe('Bearer AT');
  });

  it('honors a per-call service id', async () => {
    const { mock, lightswitch } = setup({ body: { serviceInstanceId: 'launcher', status: 'UP' } });
    await lightswitch.status('AT', 'launcher');
    expect(mock.lastRequest().path).toBe('/lightswitch/api/service/launcher/status');
  });

  it('fetches bulk status with repeated serviceId params against the bulk host', async () => {
    const { mock, lightswitch } = setup({ body: [] });
    await lightswitch.statusBulk('AT', ['Fortnite', 'launcher']);
    const request = mock.lastRequest();
    expect(request.path).toBe('/lightswitch/api/service/bulk/status');
    expect(request.query.getAll('serviceId')).toEqual(['Fortnite', 'launcher']);
    expect(new URL(request.url).host).toBe(new URL(LIGHTSWITCH_BULK_BASE_URL).host);
  });

  it('rejects an empty service ids array without a request', async () => {
    const { mock, lightswitch } = setup();
    expect(await captureThrow(() => lightswitch.statusBulk('AT', []))).toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });
});
