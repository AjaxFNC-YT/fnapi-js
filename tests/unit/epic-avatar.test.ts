import { describe, expect, it } from 'vitest';
import {
  AvatarManager,
  AvatarIconSize,
  buildIconUrl,
  extractCharacterId,
} from '../../src/epic/avatar.js';
import { EpicRestClient } from '../../src/epic/rest.js';
import { ValidationError } from '../../src/core/errors.js';
import { createMockFetch, type MockFetch, type MockResponseInit } from '../helpers/mockFetch.js';

function setup(...responses: MockResponseInit[]): { mock: MockFetch; avatar: AvatarManager } {
  const mock = createMockFetch(...responses);
  const rest = new EpicRestClient({
    fetch: mock.fetch,
    retry: 1,
    baseUrl: 'https://avatar-service-prod.identity.live.on.epicgames.com',
  });
  return { mock, avatar: new AvatarManager(rest) };
}

async function captureThrow(run: () => Promise<unknown>): Promise<unknown> {
  try {
    await run();
  } catch (error) {
    return error;
  }
  throw new Error('Expected the call to throw');
}

const ENTRY = {
  accountId: 'abc',
  avatarId: 'ATHENACHARACTER:cid_028_athena_commando_f',
  namespace: 'fortnite',
};

describe('avatar helpers', () => {
  it('extracts the lowercased character id after the namespace', () => {
    expect(extractCharacterId('ATHENACHARACTER:CID_028_Athena_Commando_F')).toBe(
      'cid_028_athena_commando_f',
    );
    expect(extractCharacterId('cid_029')).toBe('cid_029');
    expect(extractCharacterId('')).toBeNull();
  });

  it('builds the icon url for the requested size', () => {
    expect(buildIconUrl(ENTRY.avatarId)).toBe(
      'https://fortnite-api.com/images/cosmetics/br/cid_028_athena_commando_f/smallicon.png',
    );
    expect(buildIconUrl(ENTRY.avatarId, AvatarIconSize.Icon)).toBe(
      'https://fortnite-api.com/images/cosmetics/br/cid_028_athena_commando_f/icon.png',
    );
    expect(buildIconUrl('', AvatarIconSize.Featured)).toBeNull();
  });
});

describe('AvatarManager', () => {
  it('requests avatars with a joined accountIds query and bearer', async () => {
    const { mock, avatar } = setup({ body: [ENTRY] });
    const entries = await avatar.get('token', ['abc', 'def']);
    const request = mock.lastRequest();
    expect(request.path).toBe('/v1/avatar/fortnite/ids');
    expect(request.query.get('accountIds')).toBe('abc,def');
    expect(request.headers['authorization']).toBe('Bearer token');
    expect(entries).toHaveLength(1);
  });

  it('resolves entries with character id and icon url', async () => {
    const { avatar } = setup({ body: [ENTRY] });
    const resolved = await avatar.resolve('token', ['abc'], { size: AvatarIconSize.Icon });
    expect(resolved[0]?.characterId).toBe('cid_028_athena_commando_f');
    expect(resolved[0]?.iconUrl).toBe(
      'https://fortnite-api.com/images/cosmetics/br/cid_028_athena_commando_f/icon.png',
    );
  });

  it('resolveFor returns the matching entry', async () => {
    const { avatar } = setup({ body: [ENTRY] });
    const resolved = await avatar.resolveFor('token', 'abc');
    expect(resolved?.accountId).toBe('abc');
    expect(resolved?.iconUrl).toContain('/smallicon.png');
  });

  it('validates the accountIds array', async () => {
    const { avatar } = setup({ body: [] });
    const error = await captureThrow(() => avatar.get('token', []));
    expect(error).toBeInstanceOf(ValidationError);
  });

  it('validates the access token', async () => {
    const { avatar } = setup({ body: [] });
    const error = await captureThrow(() => avatar.get('', ['abc']));
    expect(error).toBeInstanceOf(ValidationError);
  });
});
