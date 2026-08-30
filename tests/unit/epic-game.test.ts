import { describe, expect, it } from 'vitest';
import { FortniteGameManager } from '../../src/epic/game.js';
import { EpicRestClient } from '../../src/epic/rest.js';
import { MCPClient, MCP_BASE_URL } from '../../src/epic/mcp.js';
import { ValidationError } from '../../src/core/errors.js';
import { createMockFetch, type MockFetch, type MockResponseInit } from '../helpers/mockFetch.js';

function setup(...responses: MockResponseInit[]): { mock: MockFetch; game: FortniteGameManager } {
  const mock = createMockFetch(...responses);
  const rest = new EpicRestClient({ fetch: mock.fetch, retry: 1, baseUrl: MCP_BASE_URL });
  const mcp = new MCPClient(rest);
  return { mock, game: new FortniteGameManager(rest, mcp) };
}

async function captureThrow(fn: () => unknown): Promise<unknown> {
  try {
    await fn();
  } catch (error) {
    return error;
  }
  throw new Error('Expected the call to throw');
}

function commonCoreBody(
  items: Record<string, { templateId: string; quantity: number; attributes?: Record<string, unknown> }>,
  attributes: Record<string, unknown> = {},
): MockResponseInit {
  return {
    body: {
      profileChanges: [
        {
          changeType: 'fullProfileUpdate',
          profile: { profileId: 'common_core', items, stats: { attributes } },
        },
      ],
    },
  };
}

describe('FortniteGameManager', () => {
  it('fetches the calendar timeline', async () => {
    const { mock, game } = setup({
      body: { channels: {}, eventsTimeOffsetHrs: 0, cacheIntervalMins: 10, currentTime: '2026-08-01T00:00:00Z' },
    });
    await game.timeline('AT');
    const request = mock.lastRequest();
    expect(request.method).toBe('GET');
    expect(request.path).toBe('/fortnite/api/calendar/v1/timeline');
    expect(request.headers['authorization']).toBe('Bearer AT');
    expect(new URL(request.url).host).toBe(new URL(MCP_BASE_URL).host);
  });

  it('fetches the battle royale inventory', async () => {
    const { mock, game } = setup({ body: { stash: { globalcash: 100 } } });
    await game.brInventory('AT', 'ACC');
    expect(mock.lastRequest().path).toBe('/fortnite/api/game/v2/br-inventory/account/ACC');
  });

  it('queries common_core via MCP QueryProfile for the vbucks balance', async () => {
    const { mock, game } = setup(
      commonCoreBody(
        {
          a: { templateId: 'Currency:MtxComplimentary', quantity: 500 },
          b: { templateId: 'Currency:MtxGiveaway', quantity: 1000 },
          c: { templateId: 'Currency:MtxPurchased', quantity: 2000, attributes: { platform: 'EpicPC' } },
          d: { templateId: 'HomebaseBannerIcon:brs01', quantity: 1 },
        },
        { current_mtx_platform: 'EpicPC' },
      ),
    );
    const balance = await game.vbucksBalance('AT', 'ACC');
    const request = mock.lastRequest();
    expect(request.method).toBe('POST');
    expect(request.path).toBe('/fortnite/api/game/v2/profile/ACC/client/QueryProfile');
    expect(request.query.get('profileId')).toBe('common_core');
    expect(balance.total).toBe(3500);
    expect(balance.platform).toBe('EpicPC');
    expect(balance.entries).toHaveLength(3);
    const purchased = balance.entries.find((e) => e.templateId === 'Currency:MtxPurchased');
    expect(purchased?.platform).toBe('EpicPC');
    expect(purchased?.category).toBe('Purchased');
  });

  it('reduces the vbucks balance to a single total', async () => {
    const { game } = setup(
      commonCoreBody({
        a: { templateId: 'Currency:MtxGiveaway', quantity: 800 },
        b: { templateId: 'Currency:MtxPurchased', quantity: 200, attributes: { platform: 'PSN' } },
      }),
    );
    expect(await game.vbucks('AT', 'ACC')).toBe(1000);
  });

  it('reads the current mtx platform', async () => {
    const { game } = setup(commonCoreBody({}, { current_mtx_platform: 'Live' }));
    expect(await game.mtxPlatform('AT', 'ACC')).toBe('Live');
  });

  it('sets the mtx platform through MCP SetMtxPlatform', async () => {
    const { mock, game } = setup(commonCoreBody({}, { current_mtx_platform: 'PSN' }));
    await game.setMtxPlatform('AT', 'ACC', 'PSN');
    const request = mock.lastRequest();
    expect(request.method).toBe('POST');
    expect(request.path).toBe('/fortnite/api/game/v2/profile/ACC/client/SetMtxPlatform');
    expect(JSON.parse(request.body ?? '{}')).toEqual({ newPlatform: 'PSN' });
  });

  it('fetches purchase receipts', async () => {
    const { mock, game } = setup({ body: [] });
    await game.receipts('AT', 'ACC');
    expect(mock.lastRequest().path).toBe('/fortnite/api/game/v2/receipts/ACC');
  });

  it('rejects a blank account id without a request', async () => {
    const { mock, game } = setup();
    expect(await captureThrow(() => game.brInventory('AT', ''))).toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });
});
