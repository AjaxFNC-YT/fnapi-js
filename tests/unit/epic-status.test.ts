import { describe, expect, it } from 'vitest';
import { EpicStatusManager } from '../../src/epic/status.js';
import { EpicRestClient } from '../../src/epic/rest.js';
import { createMockFetch, type MockFetch, type MockResponseInit } from '../helpers/mockFetch.js';

function setup(...responses: MockResponseInit[]): { mock: MockFetch; status: EpicStatusManager } {
  const mock = createMockFetch(...responses);
  const rest = new EpicRestClient({ fetch: mock.fetch, retry: 1, baseUrl: 'https://status.epicgames.com' });
  return { mock, status: new EpicStatusManager(rest) };
}

describe('EpicStatusManager', () => {
  it('fetches the summary without authorization', async () => {
    const { mock, status } = setup({
      body: {
        page: { id: 'p', name: 'Epic', url: 'x', updated_at: 'now' },
        status: { indicator: 'none', description: 'All Systems Operational' },
        components: [],
        incidents: [],
        scheduled_maintenances: [],
      },
    });
    const summary = await status.summary();
    const request = mock.lastRequest();
    expect(request.method).toBe('GET');
    expect(request.path).toBe('/api/v2/summary.json');
    expect(request.headers['authorization']).toBeUndefined();
    expect(summary.status.indicator).toBe('none');
  });

  it('unwraps the components array', async () => {
    const { mock, status } = setup({
      body: { page: {}, components: [{ id: 'c', name: 'Fortnite', status: 'operational' }] },
    });
    const components = await status.components();
    expect(mock.lastRequest().path).toBe('/api/v2/components.json');
    expect(components).toHaveLength(1);
    expect(components[0]?.name).toBe('Fortnite');
  });

  it('unwraps unresolved incidents', async () => {
    const { mock, status } = setup({ body: { page: {}, incidents: [{ id: 'i' }] } });
    const incidents = await status.unresolvedIncidents();
    expect(mock.lastRequest().path).toBe('/api/v2/incidents/unresolved.json');
    expect(incidents).toHaveLength(1);
  });

  it('unwraps active maintenances', async () => {
    const { mock, status } = setup({ body: { page: {}, scheduled_maintenances: [] } });
    await status.activeMaintenances();
    expect(mock.lastRequest().path).toBe('/api/v2/scheduled-maintenances/active.json');
  });

  it('filters fortnite components and reports operational state', async () => {
    const { status } = setup({
      body: {
        page: {},
        components: [
          { id: '1', name: 'Fortnite', status: 'operational', group: false },
          { id: '2', name: 'Fortnite Game Services', status: 'major_outage', group: false },
          { id: '3', name: 'Rocket League', status: 'operational', group: false },
          { id: '4', name: 'Fortnite', status: 'operational', group: true },
        ],
      },
    });
    const fortnite = await status.fortniteComponents();
    expect(fortnite.map((component) => component.id)).toEqual(['1', '2']);
    const { status: healthy } = setup({
      body: {
        page: {},
        components: [{ id: '1', name: 'Fortnite', status: 'operational', group: false }],
      },
    });
    expect(await healthy.isFortniteOperational()).toBe(true);
  });
});
