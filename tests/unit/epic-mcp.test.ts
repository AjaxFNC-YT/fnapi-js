import { describe, expect, it } from 'vitest';
import { EpicGamesClient } from '../../src/epic/client.js';
import {
  MCPClient,
  MCP_OPERATIONS,
  MCP_OPERATIONS_SOURCE_URL,
  MCP_BASE_URL,
  MCPProfile,
  MCPRoute,
  isMCPOperation,
  knownMCPOperations,
  refreshMCPOperations,
} from '../../src/epic/mcp.js';
import { EpicRestClient } from '../../src/epic/rest.js';
import { ValidationError } from '../../src/core/errors.js';
import type { OAuthToken } from '../../src/epic/types.js';
import { createMockFetch, type MockResponseInit } from '../helpers/mockFetch.js';

const profileBody = {
  profileRevision: 12,
  profileId: 'athena',
  profileChangesBaseRevision: 11,
  profileChanges: [{ changeType: 'fullProfileUpdate' }],
  profileCommandRevision: 10,
  serverTime: '2026-08-20T00:00:00.000Z',
  responseVersion: 1,
};

function mgr(...responses: MockResponseInit[]): {
  mcp: MCPClient;
  mock: ReturnType<typeof createMockFetch>;
} {
  const mock = createMockFetch(...responses);
  const mcp = new MCPClient(new EpicRestClient({ fetch: mock.fetch, retry: 1, baseUrl: MCP_BASE_URL }));
  return { mcp, mock };
}

describe('MCP operation catalog', () => {
  it('registers all 149 operations, unique', () => {
    expect(MCP_OPERATIONS).toHaveLength(149);
    expect(new Set(MCP_OPERATIONS).size).toBe(149);
    expect(MCP_OPERATIONS).toContain('QueryProfile');
    expect(MCP_OPERATIONS).toContain('EquipModularCosmeticLoadoutPreset');
  });

  it('guards operation names', () => {
    expect(isMCPOperation('QueryProfile')).toBe(true);
    expect(isMCPOperation('NotAnOperation')).toBe(false);
    expect(isMCPOperation(42)).toBe(false);
  });

  it('exposes the profile ids and routes', () => {
    expect(MCPProfile.athena).toBe('athena');
    expect(MCPProfile.commonCore).toBe('common_core');
    expect(MCPRoute.client).toBe('client');
    expect(MCPRoute.public).toBe('public');
    expect(MCP_BASE_URL).toBe('https://fngw-mcp-gc-livefn.ol.epicgames.com');
  });
});

describe('refreshMCPOperations', () => {
  it('points at the FortniteEndpointsDocumentation Operations directory', () => {
    expect(MCP_OPERATIONS_SOURCE_URL).toContain('FortniteEndpointsDocumentation');
    expect(MCP_OPERATIONS_SOURCE_URL).toContain('Profile/Operations');
  });

  it('adds newly discovered operations to the runtime allowlist', async () => {
    const before = knownMCPOperations().length;
    expect(isMCPOperation('BrandNewFutureOp')).toBe(false);

    const fetchImpl = (async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => [
        { name: 'QueryProfile.md', type: 'file' },
        { name: 'BrandNewFutureOp.md', type: 'file' },
        { name: 'README', type: 'file' },
        { name: 'SubDir', type: 'dir' },
      ],
    })) as unknown as typeof fetch;

    const added = await refreshMCPOperations({ fetch: fetchImpl });

    expect(added).toEqual(['BrandNewFutureOp']);
    expect(isMCPOperation('BrandNewFutureOp')).toBe(true);
    expect(knownMCPOperations().length).toBe(before + 1);
  });

  it('throws when the source responds with an error status', async () => {
    const fetchImpl = (async () => ({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => [],
    })) as unknown as typeof fetch;

    await expect(refreshMCPOperations({ fetch: fetchImpl })).rejects.toThrow();
  });
});

describe('MCPClient.operation', () => {
  it('POSTs to the profile command endpoint with defaults', async () => {
    const { mcp, mock } = mgr({ body: profileBody });

    const result = await mcp.operation('AT', 'acc-1', 'QueryProfile');

    const req = mock.lastRequest();
    expect(req.method).toBe('POST');
    expect(req.url.startsWith(MCP_BASE_URL)).toBe(true);
    expect(req.path).toBe('/fortnite/api/game/v2/profile/acc-1/client/QueryProfile');
    expect(req.query.get('profileId')).toBe('common_core');
    expect(req.query.get('rvn')).toBe('-1');
    expect(req.headers.authorization).toBe('Bearer AT');
    expect(req.headers['content-type']).toBe('application/json');
    expect(req.body).toBe('{}');
    expect(result).toEqual(profileBody);
  });

  it('honours profileId, route, rvn and payload', async () => {
    const { mcp, mock } = mgr({ body: profileBody });

    await mcp.operation('AT', 'acc-1', 'SetItemFavoriteStatusBatch', {
      profileId: MCPProfile.athena,
      route: MCPRoute.client,
      rvn: 42,
      payload: { itemIds: ['x'], itemFavStatus: [true] },
    });

    const req = mock.lastRequest();
    expect(req.path).toBe('/fortnite/api/game/v2/profile/acc-1/client/SetItemFavoriteStatusBatch');
    expect(req.query.get('profileId')).toBe('athena');
    expect(req.query.get('rvn')).toBe('42');
    expect(JSON.parse(req.body!)).toEqual({ itemIds: ['x'], itemFavStatus: [true] });
  });

  it('url-encodes the account id', async () => {
    const { mcp, mock } = mgr({ body: profileBody });
    await mcp.operation('AT', 'acc/1 2', 'QueryProfile');
    expect(mock.lastRequest().path).toBe('/fortnite/api/game/v2/profile/acc%2F1%202/client/QueryProfile');
  });

  it('queryProfile targets QueryProfile with the given profile', async () => {
    const { mcp, mock } = mgr({ body: profileBody });
    await mcp.queryProfile('AT', 'acc-1', MCPProfile.campaign);
    expect(mock.lastRequest().path).toBe('/fortnite/api/game/v2/profile/acc-1/client/QueryProfile');
    expect(mock.lastRequest().query.get('profileId')).toBe('campaign');
  });

  it('queryPublicProfile uses the public route', async () => {
    const { mcp, mock } = mgr({ body: profileBody });
    await mcp.queryPublicProfile('AT', 'acc-1', MCPProfile.commonPublic);
    expect(mock.lastRequest().path).toBe('/fortnite/api/game/v2/profile/acc-1/public/QueryPublicProfile');
    expect(mock.lastRequest().query.get('profileId')).toBe('common_public');
  });

  it('rejects blank arguments without a request', async () => {
    const { mcp, mock } = mgr({ body: profileBody });
    await expect(mcp.operation('', 'acc', 'QueryProfile')).rejects.toBeInstanceOf(ValidationError);
    await expect(mcp.operation('AT', '', 'QueryProfile')).rejects.toBeInstanceOf(ValidationError);
    await expect(mcp.operation('AT', 'acc', '')).rejects.toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });
});

describe('EpicGamesClient / EpicAuthSession MCP', () => {
  const token: OAuthToken = {
    access_token: 'SESSION_AT',
    expires_in: 7200,
    expires_at: new Date(Date.now() + 7_200_000).toISOString(),
    token_type: 'bearer',
    account_id: 'ACC',
    displayName: 'Tester',
    client_id: 'x',
    internal_client: true,
    client_service: 'prod-fn',
  };

  it('exposes a low-level mcp client on the game client', () => {
    const epic = new EpicGamesClient();
    expect(epic.mcp).toBeInstanceOf(MCPClient);
    expect(epic.mcpRest.baseUrl).toBe(MCP_BASE_URL);
  });

  it('session.queryProfile uses the session token and account', async () => {
    const mock = createMockFetch({ body: profileBody });
    const epic = new EpicGamesClient({ fetch: mock.fetch, retry: 1 });
    const session = epic.session(token);

    const result = await session.queryProfile(MCPProfile.athena);

    const req = mock.lastRequest();
    expect(req.url.startsWith(MCP_BASE_URL)).toBe(true);
    expect(req.path).toBe('/fortnite/api/game/v2/profile/ACC/client/QueryProfile');
    expect(req.headers.authorization).toBe('Bearer SESSION_AT');
    expect(req.query.get('profileId')).toBe('athena');
    expect(result).toEqual(profileBody);
  });

  it('session.mcpOperation forwards arbitrary operations', async () => {
    const mock = createMockFetch({ body: profileBody });
    const epic = new EpicGamesClient({ fetch: mock.fetch, retry: 1 });
    const session = epic.session(token);

    await session.mcpOperation('MarkItemSeen', {
      profileId: MCPProfile.athena,
      payload: { itemIds: ['abc'] },
    });

    expect(mock.lastRequest().path).toBe('/fortnite/api/game/v2/profile/ACC/client/MarkItemSeen');
  });

  it('rejects MCP calls on a session with no account', async () => {
    const mock = createMockFetch({ body: profileBody });
    const epic = new EpicGamesClient({ fetch: mock.fetch, retry: 1 });
    const appSession = epic.session({ ...token, account_id: undefined });

    await expect(appSession.queryProfile()).rejects.toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });
});
