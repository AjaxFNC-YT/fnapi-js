import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../src/core/errors.js';
import { EpicApiError } from '../../src/epic/errors.js';
import { DISCOVERY_BASE_URL, LINKS_BASE_URL, LinksManager, toIsland, type LinkMnemonic } from '../../src/epic/links.js';
import { EpicRestClient } from '../../src/epic/rest.js';
import { createMockFetch, type MockResponseInit } from '../helpers/mockFetch.js';

function manager(...responses: MockResponseInit[]) {
  const mock = createMockFetch(...responses);
  const links = new LinksManager(
    new EpicRestClient({ fetch: mock.fetch, retry: 1, baseUrl: LINKS_BASE_URL }),
    new EpicRestClient({ fetch: mock.fetch, retry: 1, baseUrl: DISCOVERY_BASE_URL }),
  );
  return { mock, links };
}

const link: LinkMnemonic = {
  namespace: 'fn',
  accountId: 'creator-id',
  creatorName: 'Builder',
  mnemonic: '8567-1055-6605',
  linkType: 'valkyrie:application',
  metadata: {
    title: 'Box Fights',
    alt_title: { de: 'Kistenkämpfe' },
    tagline: 'Fight in boxes',
    introduction: 'Long intro',
    image_url: 'https://img/full.jpg',
    image_urls: { url: 'https://img/full.jpg', url_s: 'https://img/s.jpg' },
    genres: ['combat'],
    mode: 'live',
    matchmakingV2: { minPlayers: 1, maxPlayers: 16 },
    ratings: { boards: { ESRB: { rating: 'ESRB_TEEN' }, USK: { rating: 'USK_AGE_12' } } },
    supportCode: 'builder',
  },
  version: 3,
  active: true,
  disabled: false,
  created: '2026-01-01T00:00:00Z',
  published: '2026-01-02T00:00:00Z',
  descriptionTags: ['pvp', 'box fight'],
  moderationStatus: 'Approved',
  discoveryIntent: 'PUBLIC',
  linkState: 'LIVE',
};

describe('LinksManager', () => {
  it('looks up one mnemonic with type and version', async () => {
    const { mock, links } = manager({ body: link });
    const result = await links.mnemonic('T', '8567-1055-6605', { type: 'valkyrie:application', version: 3 });
    expect(result?.mnemonic).toBe('8567-1055-6605');
    const request = mock.lastRequest();
    expect(request.url.startsWith(LINKS_BASE_URL)).toBe(true);
    expect(request.path).toBe('/links/api/fn/mnemonic/8567-1055-6605');
    expect(request.query.get('type')).toBe('valkyrie:application');
    expect(request.query.get('v')).toBe('3');
  });

  it('returns null for inactive or unknown codes and rethrows other errors', async () => {
    const { links } = manager(
      { status: 404, body: { errorCode: 'errors.com.epicgames.links.no_active_version', errorMessage: 'none' } },
      { status: 403, body: { errorCode: 'errors.com.epicgames.links.invalid_namespace', errorMessage: 'fg' } },
    );
    expect(await links.mnemonic('T', '0000-0000-0000')).toBeNull();
    await expect(links.mnemonic('T', '0000-0000-0001')).rejects.toBeInstanceOf(EpicApiError);
  });

  it('bulk-resolves codes in chunks of 100 ignoring failures', async () => {
    const codes = Array.from({ length: 150 }, (_, index) => `code_${index}`);
    const { mock, links } = manager({ body: [link] }, { body: [link] });
    const results = await links.mnemonics('T', [...codes.slice(0, 149), { mnemonic: 'code_149', version: 2 }]);
    expect(results).toHaveLength(2);
    expect(mock.requests).toHaveLength(2);
    expect(mock.requests[0]?.method).toBe('POST');
    expect(mock.requests[0]?.query.get('ignoreFailures')).toBe('true');
    expect(JSON.parse(mock.requests[0]!.body!)).toHaveLength(100);
    expect(JSON.parse(mock.requests[1]!.body!).at(-1)).toEqual({ mnemonic: 'code_149', type: '', filter: false, v: '2' });
    await expect(links.mnemonics('T', [])).rejects.toBeInstanceOf(ValidationError);
  });

  it('reads related links, every version and an author listing', async () => {
    const { mock, links } = manager({ body: { parentLinks: [], links: {} } }, { body: [link] }, { body: [link] });
    await links.related('T', 'playlist_trios');
    expect(mock.requests[0]?.path).toBe('/links/api/fn/mnemonic/playlist_trios/related');
    await links.versions('T', '8567-1055-6605');
    expect(mock.requests[1]?.path).toBe('/links/api/fn/mnemonic/8567-1055-6605/all');
    await links.author('T', 'ACC');
    expect(mock.requests[2]?.path).toBe('/links/api/fn/author/ACC');
  });

  it('reads a creator page from the discovery service', async () => {
    const { mock, links } = manager({ body: { creatorId: 'creator-id', links: [], hasMore: false } });
    await links.creatorPage('T', 'creator-id', 'ACC', { limit: 20, olderThan: '2026-01-01T00:00:00Z' });
    const request = mock.lastRequest();
    expect(request.url.startsWith(DISCOVERY_BASE_URL)).toBe(true);
    expect(request.path).toBe('/api/v1/creator/page/creator-id');
    expect(request.query.get('playerId')).toBe('ACC');
    expect(request.query.get('limit')).toBe('20');
    await expect(links.creatorPage('T', 'creator-id', 'ACC', { limit: 101 })).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('toIsland', () => {
  it('flattens a link into an island summary', () => {
    expect(toIsland(link)).toMatchObject({
      code: '8567-1055-6605',
      type: 'valkyrie:application',
      title: 'Box Fights',
      tagline: 'Fight in boxes',
      description: 'Long intro',
      creator: { accountId: 'creator-id', name: 'Builder' },
      version: 3,
      active: true,
      state: 'LIVE',
      tags: ['pvp', 'box fight'],
      genres: ['combat'],
      players: { min: 1, max: 16 },
      image: 'https://img/full.jpg',
      ratings: { ESRB: 'ESRB_TEEN', USK: 'USK_AGE_12' },
      supportCode: 'builder',
      publishedAt: '2026-01-02T00:00:00Z',
    });
  });

  it('localizes titles and falls back sensibly', () => {
    expect(toIsland(link, 'de').title).toBe('Kistenkämpfe');
    expect(toIsland(link, 'fr').title).toBe('Box Fights');
    const bare = toIsland({ ...link, metadata: {}, disabled: true });
    expect(bare).toMatchObject({ title: '8567-1055-6605', tagline: null, image: null, active: false, players: { min: null, max: null } });
  });
});
