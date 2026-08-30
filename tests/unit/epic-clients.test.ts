import { describe, expect, it } from 'vitest';
import { ALL_AUTH_CLIENTS, AuthClients, findAuthClient } from '../../src/epic/clients.js';
import type { AuthClient } from '../../src/epic/clients.js';
import { basicAuthHeader } from '../../src/epic/rest.js';
import { resolveAuthClient } from '../../src/epic/client.js';
import { ValidationError } from '../../src/core/errors.js';

describe('AuthClients registry', () => {
  it('exposes the fortnitePC client', () => {
    expect(AuthClients.fortnitePC).toEqual({
      name: 'fortnitePCGameClient',
      clientId: 'ec684b8c687f479fadea3cb2ad83f5c6',
      clientSecret: 'e1f31c211f28413186262d37a13fc84d',
    });
  });

  it('registers only clients that carry a usable secret', () => {
    expect(ALL_AUTH_CLIENTS).toHaveLength(26);

    for (const client of ALL_AUTH_CLIENTS) {
      expect(client.clientId).toMatch(/^[A-Za-z0-9]{32}$/);
      expect(typeof client.clientSecret).toBe('string');
      expect(client.clientSecret!.length).toBeGreaterThan(0);
    }

    const ids = ALL_AUTH_CLIENTS.map((client) => client.clientId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every named client a secret', () => {
    for (const client of Object.values(AuthClients)) {
      expect(typeof client.clientSecret).toBe('string');
      expect(client.clientSecret.length).toBeGreaterThan(0);
    }
  });
});

describe('findAuthClient', () => {
  it('resolves by exact client id', () => {
    expect(findAuthClient('ec684b8c687f479fadea3cb2ad83f5c6')?.name).toBe('fortnitePCGameClient');
  });

  it('resolves by client name', () => {
    expect(findAuthClient('fortnitePCGameClient')?.clientId).toBe('ec684b8c687f479fadea3cb2ad83f5c6');
  });

  it('resolves case-insensitively', () => {
    expect(findAuthClient('FORTNITEPCGAMECLIENT')?.clientId).toBe('ec684b8c687f479fadea3cb2ad83f5c6');
  });

  it('trims surrounding whitespace', () => {
    expect(findAuthClient('  ec684b8c687f479fadea3cb2ad83f5c6  ')?.name).toBe('fortnitePCGameClient');
  });

  it('returns null for an unknown value', () => {
    expect(findAuthClient('not-a-real-client')).toBeNull();
  });
});

describe('basicAuthHeader', () => {
  it('encodes the official launcher docs example verbatim', () => {
    expect(basicAuthHeader(AuthClients.launcherApp)).toBe(
      'Basic MzRhMDJjZjhmNDQxNGUyOWIxNTkyMTg3NmRhMzZmOWE6ZGFhZmJjY2M3Mzc3NDUwMzlkZmZlNTNkOTRmYzc2Y2Y=',
    );
  });

  it('encodes an empty password with a trailing colon when there is no secret', () => {
    expect(basicAuthHeader({ name: 'noSecret', clientId: 'abc' })).toBe('Basic YWJjOg==');
  });
});

describe('resolveAuthClient', () => {
  it('resolves a named registry key', () => {
    expect(resolveAuthClient('fortnitePC')).toEqual(AuthClients.fortnitePC);
  });

  it('resolves a raw client id string', () => {
    expect(resolveAuthClient('ec684b8c687f479fadea3cb2ad83f5c6').name).toBe('fortnitePCGameClient');
  });

  it('resolves a client name string', () => {
    expect(resolveAuthClient('fortnitePCGameClient').clientId).toBe('ec684b8c687f479fadea3cb2ad83f5c6');
  });

  it('returns a custom client object as-is', () => {
    const custom = { clientId: 'x', clientSecret: 'y' } as unknown as AuthClient;
    expect(resolveAuthClient(custom)).toBe(custom);
  });

  it('throws for a custom object without a client id', () => {
    const custom = { clientSecret: 'y' } as unknown as AuthClient;
    expect(() => resolveAuthClient(custom)).toThrow(ValidationError);
  });

  it('throws for an unknown string', () => {
    expect(() => resolveAuthClient('totally-unknown-client')).toThrow(ValidationError);
  });
});
