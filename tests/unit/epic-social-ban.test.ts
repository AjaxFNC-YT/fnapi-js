import { describe, expect, it } from 'vitest';
import { SocialBanManager, SOCIAL_BAN_BASE_URL } from '../../src/epic/socialBan.js';
import { EpicRestClient } from '../../src/epic/rest.js';
import { ValidationError } from '../../src/core/errors.js';
import { createMockFetch, type MockFetch, type MockResponseInit } from '../helpers/mockFetch.js';

function setup(...responses: MockResponseInit[]): { mock: MockFetch; social: SocialBanManager } {
  const mock = createMockFetch(...responses);
  const rest = new EpicRestClient({ fetch: mock.fetch, retry: 1, baseUrl: SOCIAL_BAN_BASE_URL });
  return { mock, social: new SocialBanManager(rest) };
}

async function captureThrow(fn: () => unknown): Promise<unknown> {
  try {
    await fn();
  } catch (error) {
    return error;
  }
  throw new Error('Expected the call to throw');
}

describe('SocialBanManager', () => {
  it('requests the social ban status for an account', async () => {
    const { mock, social } = setup({ body: { bans: [], warnings: [] } });
    await social.status('AT', 'ACC');
    const request = mock.lastRequest();
    expect(request.method).toBe('GET');
    expect(request.path).toBe('/socialban/api/public/v1/ACC');
    expect(request.headers['authorization']).toBe('Bearer AT');
    expect(new URL(request.url).host).toBe(new URL(SOCIAL_BAN_BASE_URL).host);
  });

  it('reports an inactive ban when both arrays are empty', async () => {
    const { social } = setup({ body: { bans: [], warnings: [] } });
    const status = await social.status('AT', 'ACC');
    expect(status.active).toBe(false);
    expect(status.bans).toEqual([]);
    expect(status.warnings).toEqual([]);
  });

  it('reports an active ban when the bans array is populated', async () => {
    const { social } = setup({
      body: { bans: [{ reason: 'toxicity', durationDays: 14 }], warnings: [{ note: 'first' }] },
    });
    const status = await social.status('AT', 'ACC');
    expect(status.active).toBe(true);
    expect(status.bans).toHaveLength(1);
    expect(status.warnings).toHaveLength(1);
  });

  it('treats an empty or 204 body defensively', async () => {
    const { social } = setup({ status: 204 });
    const status = await social.status('AT', 'ACC');
    expect(status.active).toBe(false);
    expect(status.bans).toEqual([]);
    expect(status.warnings).toEqual([]);
  });

  it('encodes the account id into the path', async () => {
    const { mock, social } = setup({ body: { bans: [], warnings: [] } });
    await social.status('AT', 'acc/with space');
    expect(mock.lastRequest().path).toBe('/socialban/api/public/v1/acc%2Fwith%20space');
  });

  it('rejects a blank access token without a request', async () => {
    const { mock, social } = setup();
    expect(await captureThrow(() => social.status('', 'ACC'))).toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });

  it('rejects a blank account id without a request', async () => {
    const { mock, social } = setup();
    expect(await captureThrow(() => social.status('AT', ''))).toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });
});
