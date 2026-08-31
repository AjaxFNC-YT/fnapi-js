import { describe, expect, it } from 'vitest';
import {
  AvatarManager,
  AvatarIconSize,
  AvatarImageSource,
  buildIconUrl,
  buildIconUrls,
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

  it('builds the fncc icon url by default for the requested size', () => {
    expect(buildIconUrl(ENTRY.avatarId)).toBe(
      'https://cdn.fn-api.cc/cosmetics/br/cid_028_athena_commando_f/smallicon.png',
    );
    expect(buildIconUrl(ENTRY.avatarId, AvatarIconSize.Icon)).toBe(
      'https://cdn.fn-api.cc/cosmetics/br/cid_028_athena_commando_f/icon.png',
    );
    expect(buildIconUrl(ENTRY.avatarId, AvatarIconSize.Featured)).toBe(
      'https://cdn.fn-api.cc/cosmetics/br/cid_028_athena_commando_f/icon.png',
    );
    expect(buildIconUrl('', AvatarIconSize.Featured)).toBeNull();
  });

  it('builds the fortnite-api icon url when that source is selected', () => {
    expect(buildIconUrl(ENTRY.avatarId, AvatarIconSize.Icon, AvatarImageSource.FortniteApi)).toBe(
      'https://fortnite-api.com/images/cosmetics/br/cid_028_athena_commando_f/icon.png',
    );
    expect(
      buildIconUrl(ENTRY.avatarId, AvatarIconSize.Featured, AvatarImageSource.FortniteApi),
    ).toBe('https://fortnite-api.com/images/cosmetics/br/cid_028_athena_commando_f/featured.png');
  });

  it('builds one icon url per supported source', () => {
    expect(buildIconUrls(ENTRY.avatarId, AvatarIconSize.Icon)).toEqual({
      fncc: 'https://cdn.fn-api.cc/cosmetics/br/cid_028_athena_commando_f/icon.png',
      'fortnite-api': 'https://fortnite-api.com/images/cosmetics/br/cid_028_athena_commando_f/icon.png',
    });
    expect(buildIconUrls('')).toEqual({ fncc: null, 'fortnite-api': null });
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

  it('resolves entries with character id and fncc icon url by default', async () => {
    const { avatar } = setup({ body: [ENTRY] });
    const resolved = await avatar.resolve('token', ['abc'], { size: AvatarIconSize.Icon });
    expect(resolved[0]?.characterId).toBe('cid_028_athena_commando_f');
    expect(resolved[0]?.source).toBe(AvatarImageSource.Fncc);
    expect(resolved[0]?.iconUrl).toBe(
      'https://cdn.fn-api.cc/cosmetics/br/cid_028_athena_commando_f/icon.png',
    );
    expect(resolved[0]?.iconUrls['fortnite-api']).toBe(
      'https://fortnite-api.com/images/cosmetics/br/cid_028_athena_commando_f/icon.png',
    );
  });

  it('uses the live image resolver for the fncc source and falls back to smallicon', async () => {
    const mock = createMockFetch({ body: [ENTRY] });
    const rest = new EpicRestClient({
      fetch: mock.fetch,
      retry: 1,
      baseUrl: 'https://avatar-service-prod.identity.live.on.epicgames.com',
    });
    const seen: Array<{ characterId: string; size: string }> = [];
    const avatar = new AvatarManager(rest, {
      imageResolver: async (characterId, size) => {
        seen.push({ characterId, size });
        return size === AvatarIconSize.Icon
          ? 'https://cdn.fn-api.cc/cosmetics/br/cid_028_athena_commando_f/smallicon.png'
          : null;
      },
    });
    const resolved = await avatar.resolve('token', ['abc'], { size: AvatarIconSize.Icon });
    expect(seen).toEqual([{ characterId: 'cid_028_athena_commando_f', size: AvatarIconSize.Icon }]);
    expect(resolved[0]?.iconUrl).toBe(
      'https://cdn.fn-api.cc/cosmetics/br/cid_028_athena_commando_f/smallicon.png',
    );
    expect(resolved[0]?.iconUrls.fncc).toBe(
      'https://cdn.fn-api.cc/cosmetics/br/cid_028_athena_commando_f/smallicon.png',
    );
  });

  it('ignores the live resolver when a non-fncc source is chosen', async () => {
    const mock = createMockFetch({ body: [ENTRY] });
    const rest = new EpicRestClient({
      fetch: mock.fetch,
      retry: 1,
      baseUrl: 'https://avatar-service-prod.identity.live.on.epicgames.com',
    });
    let called = false;
    const avatar = new AvatarManager(rest, {
      imageResolver: async () => {
        called = true;
        return 'https://example.invalid/icon.png';
      },
    });
    const resolved = await avatar.resolve('token', ['abc'], {
      size: AvatarIconSize.Icon,
      source: AvatarImageSource.FortniteApi,
    });
    expect(called).toBe(false);
    expect(resolved[0]?.iconUrl).toBe(
      'https://fortnite-api.com/images/cosmetics/br/cid_028_athena_commando_f/icon.png',
    );
  });

  it('resolves against a chosen source', async () => {
    const { avatar } = setup({ body: [ENTRY] });
    const resolved = await avatar.resolve('token', ['abc'], {
      size: AvatarIconSize.Icon,
      source: AvatarImageSource.FortniteApi,
    });
    expect(resolved[0]?.source).toBe(AvatarImageSource.FortniteApi);
    expect(resolved[0]?.iconUrl).toBe(
      'https://fortnite-api.com/images/cosmetics/br/cid_028_athena_commando_f/icon.png',
    );
  });

  it('resolveFor returns the matching entry', async () => {
    const { avatar } = setup({ body: [ENTRY] });
    const resolved = await avatar.resolveFor('token', 'abc');
    expect(resolved?.accountId).toBe('abc');
    expect(resolved?.iconUrl).toBe(
      'https://cdn.fn-api.cc/cosmetics/br/cid_028_athena_commando_f/smallicon.png',
    );
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
