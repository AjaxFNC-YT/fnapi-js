import { describe, expect, it } from 'vitest';
import { EpicGamesClient } from '../../src/epic/client.js';
import { AuthClients, isCustomClientInput } from '../../src/epic/clients.js';
import { ConfigurationError } from '../../src/core/errors.js';
import type { OAuthToken } from '../../src/epic/types.js';
import { createMockFetch } from '../helpers/mockFetch.js';

const custom = { name: 'my-app', clientId: 'abcdef0123456789abcdef0123456789', clientSecret: 's' };

const token: OAuthToken = {
  access_token: 'AT',
  expires_in: 7200,
  expires_at: new Date(Date.now() + 7_200_000).toISOString(),
  token_type: 'bearer',
  account_id: 'ACC',
  client_id: 'x',
  internal_client: true,
  client_service: 'prod-fn',
};

describe('isCustomClientInput', () => {
  it('treats unknown client objects as custom', () => {
    expect(isCustomClientInput(custom)).toBe(true);
  });

  it('does not treat built-in clients or names as custom', () => {
    expect(isCustomClientInput(AuthClients.fortnitePC)).toBe(false);
    expect(isCustomClientInput('fortnitePC')).toBe(false);
    expect(isCustomClientInput(AuthClients.fortnitePC.clientId)).toBe(false);
  });
});

describe('custom auth client gating', () => {
  it('throws ConfigurationError when a custom client is used without the flag', () => {
    const epic = new EpicGamesClient();
    expect(() => epic.client(custom)).toThrow(ConfigurationError);
  });

  it('allows a custom client when allowCustomClients is set', () => {
    const epic = new EpicGamesClient({ allowCustomClients: true });
    expect(epic.client(custom)).toBe(custom);
  });

  it('still allows built-in clients without the flag', () => {
    const epic = new EpicGamesClient();
    expect(epic.client('fortniteAndroid').name).toBe('fortniteAndroidGameClient');
    expect(epic.client(AuthClients.fortnitePC)).toBe(AuthClients.fortnitePC);
  });

  it('gates switchClient on the session too', async () => {
    const epic = new EpicGamesClient();
    const session = epic.session(token);
    await expect(session.switchClient(custom)).rejects.toBeInstanceOf(ConfigurationError);
  });
});

describe('custom MCP operation gating', () => {
  it('throws ConfigurationError for an unknown operation without the flag', async () => {
    const mock = createMockFetch({ body: {} });
    const epic = new EpicGamesClient({ fetch: mock.fetch, retry: 1 });
    const session = epic.session(token);

    await expect(session.mcpOperation('TotallyMadeUpOperation')).rejects.toBeInstanceOf(
      ConfigurationError,
    );
    expect(mock.calls).toBe(0);
  });

  it('allows an unknown operation when allowCustomMcpOperations is set', async () => {
    const mock = createMockFetch({
      body: {
        profileRevision: 1,
        profileId: 'athena',
        profileChangesBaseRevision: 1,
        profileChanges: [],
        profileCommandRevision: 1,
        serverTime: 'now',
        responseVersion: 1,
      },
    });
    const epic = new EpicGamesClient({ fetch: mock.fetch, retry: 1, allowCustomMcpOperations: true });
    const session = epic.session(token);

    await session.mcpOperation('TotallyMadeUpOperation');
    expect(mock.lastRequest().path).toBe('/fortnite/api/game/v2/profile/ACC/client/TotallyMadeUpOperation');
  });

  it('always allows known operations', async () => {
    const mock = createMockFetch({
      body: {
        profileRevision: 1,
        profileId: 'athena',
        profileChangesBaseRevision: 1,
        profileChanges: [],
        profileCommandRevision: 1,
        serverTime: 'now',
        responseVersion: 1,
      },
    });
    const epic = new EpicGamesClient({ fetch: mock.fetch, retry: 1 });
    const session = epic.session(token);

    await session.mcpOperation('MarkItemSeen');
    expect(mock.calls).toBe(1);
  });
});
