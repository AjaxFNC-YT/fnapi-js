import { describe, expect, it } from 'vitest';
import {
  MatchmakingManager,
  buildBucketId,
  buildUserAgent,
  MATCHMAKING_BAN_ERROR_CODE,
} from '../../src/epic/matchmaking.js';
import { EpicRestClient } from '../../src/epic/rest.js';
import { EpicApiError } from '../../src/epic/errors.js';
import { ValidationError } from '../../src/core/errors.js';
import { createMockFetch, type MockFetch, type MockResponseInit } from '../helpers/mockFetch.js';

function setup(...responses: MockResponseInit[]): { mock: MockFetch; mm: MatchmakingManager } {
  const mock = createMockFetch(...responses);
  const rest = new EpicRestClient({
    fetch: mock.fetch,
    retry: 1,
    baseUrl: 'https://fngw-mcp-gc-livefn.ol.epicgames.com',
  });
  return { mock, mm: new MatchmakingManager(rest) };
}

async function captureThrow(run: () => Promise<unknown>): Promise<unknown> {
  try {
    await run();
  } catch (error) {
    return error;
  }
  throw new Error('Expected the call to throw');
}

describe('MatchmakingManager', () => {
  const UA_REGEX = /(.*)\/(.*)-CL-(\d+)(\s+\((.*?)\))?\s+(\w+)\/(\S*)(\s*\((.*?)\))?/;

  it('builds a bucketId from segments with sane defaults', () => {
    expect(buildBucketId('26208915')).toBe('26208915:1:NAE:playlist_defaultsolo');
    expect(buildBucketId('26208915', { region: 'EU', playlist: 'playlist_defaultduo' })).toBe(
      '26208915:1:EU:playlist_defaultduo',
    );
  });

  it('builds a user-agent that satisfies Epic\'s regex', () => {
    const ua = buildUserAgent('26208915');
    expect(ua).toBe('Fortnite/++Fortnite+Release-Live-CL-26208915 Windows/10.0.22631.1.768.64bit');
    expect(UA_REGEX.test(ua)).toBe(true);
  });

  it('fetches the live netCL via the matchMakingRequest endpoint', async () => {
    const { mock, mm } = setup({ body: [{ attributes: { buildUniqueId_s: '26208915' } }] });
    const netCL = await mm.netCL('token');
    const request = mock.lastRequest();
    expect(request.method).toBe('POST');
    expect(request.path).toBe('/fortnite/api/matchmaking/session/matchMakingRequest');
    expect(netCL).toBe('26208915');
  });

  it('reports not banned on a successful ticket request, using the live netCL', async () => {
    const { mock, mm } = setup(
      { body: [{ attributes: { buildUniqueId_s: '26208915' } }] },
      { body: { serviceUrl: 'wss://x', ticketType: 'mms-player' } },
    );
    const result = await mm.ticketBan('token', 'acc');
    const request = mock.lastRequest();
    expect(request.path).toBe('/fortnite/api/game/v2/matchmakingservice/ticket/player/acc');
    expect(request.query.get('bucketId')).toBe('26208915:1:NAE:playlist_defaultsolo');
    expect(request.query.get('partyPlayerIds')).toBe('acc');
    expect(request.query.get('player.platform')).toBe('Windows');
    expect(request.headers['user-agent']).toBe(buildUserAgent('26208915'));
    expect(UA_REGEX.test(request.headers['user-agent'] ?? '')).toBe(true);
    expect(result.banned).toBe(false);
    expect(result.banDaysRemaining).toBeNull();
  });

  it('skips the netCL fetch when bucketId and userAgent are supplied', async () => {
    const { mock, mm } = setup({ body: { serviceUrl: 'wss://x', ticketType: 'mms-player' } });
    await mm.ticketBan('token', 'acc', {
      bucketId: '123:1:NAE:playlist_defaultsolo',
      userAgent: 'Fortnite/++Fortnite+Release-Live-CL-123 Windows/10',
    });
    const request = mock.lastRequest();
    expect(request.method).toBe('GET');
    expect(request.path).toBe('/fortnite/api/game/v2/matchmakingservice/ticket/player/acc');
    expect(request.query.get('bucketId')).toBe('123:1:NAE:playlist_defaultsolo');
  });

  it('derives the user-agent from a supplied netCL without fetching', async () => {
    const { mock, mm } = setup({ body: { serviceUrl: 'wss://x', ticketType: 'mms-player' } });
    await mm.ticketBan('token', 'acc', { netCL: '26208915' });
    const request = mock.lastRequest();
    expect(request.method).toBe('GET');
    expect(request.query.get('bucketId')).toBe('26208915:1:NAE:playlist_defaultsolo');
    expect(request.headers['user-agent']).toBe(buildUserAgent('26208915'));
  });

  it('detects a temporary ban and reads the remaining days', async () => {
    const { mm } = setup({
      status: 400,
      body: {
        errorCode: MATCHMAKING_BAN_ERROR_CODE,
        errorMessage: 'Player is banned',
        banDaysRemaining: 3,
      },
    });
    const result = await mm.ticketBan('token', 'acc', { netCL: '26208915' });
    expect(result.banned).toBe(true);
    expect(result.banDaysRemaining).toBe(3);
    expect(result.errorCode).toBe(MATCHMAKING_BAN_ERROR_CODE);
  });

  it('rethrows unrelated Epic errors', async () => {
    const { mm } = setup({
      status: 500,
      body: { errorCode: 'errors.com.epicgames.common.server_error', errorMessage: 'boom' },
    });
    const error = await captureThrow(() => mm.ticketBan('token', 'acc', { netCL: '26208915' }));
    expect(error).toBeInstanceOf(EpicApiError);
    expect((error as EpicApiError).errorCode).not.toBe(MATCHMAKING_BAN_ERROR_CODE);
  });

  it('reads session info for a player', async () => {
    const { mock, mm } = setup({
      body: [{ id: 's1', totalPlayers: 42, serverAddress: '1.2.3.4', serverPort: 7777, started: true, attributes: {} }],
    });
    const sessions = await mm.sessionInfo('token', 'acc');
    expect(mock.lastRequest().path).toBe('/fortnite/api/matchmaking/session/findPlayer/acc');
    expect(sessions[0]?.id).toBe('s1');
  });

  it('validates required parameters', async () => {
    const { mm } = setup({ body: {} });
    expect(await captureThrow(() => mm.ticketBan('', 'acc'))).toBeInstanceOf(ValidationError);
    expect(await captureThrow(() => mm.sessionInfo('token', ''))).toBeInstanceOf(ValidationError);
  });
});
