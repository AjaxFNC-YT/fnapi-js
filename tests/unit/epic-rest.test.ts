import { describe, expect, it } from 'vitest';
import { NetworkError } from '../../src/core/errors.js';
import { AuthManager } from '../../src/epic/auth.js';
import { AuthClients } from '../../src/epic/clients.js';
import { EpicApiError, EpicRateLimitError } from '../../src/epic/errors.js';
import { MCPClient } from '../../src/epic/mcp.js';
import { EpicRestClient } from '../../src/epic/rest.js';
import { createMockFetch, networkError } from '../helpers/mockFetch.js';

const ok = { status: 200, body: { ok: true } };
const unavailable = { status: 503, body: { errorCode: 'errors.com.epicgames.unavailable' } };

describe('EpicRestClient retry policy', () => {
  it('retries a GET on a retryable status', async () => {
    const mock = createMockFetch(unavailable, ok);
    const rest = new EpicRestClient({ fetch: mock.fetch, retry: 2 });
    const response = await rest.request('GET', '/thing');
    expect(response.data).toEqual({ ok: true });
    expect(mock.calls).toBe(2);
  });

  it('does not replay a POST after a server error', async () => {
    const mock = createMockFetch(unavailable, ok);
    const rest = new EpicRestClient({ fetch: mock.fetch, retry: 3 });
    await expect(rest.request('POST', '/gift', { json: {} })).rejects.toBeInstanceOf(EpicApiError);
    expect(mock.calls).toBe(1);
  });

  it('does not replay a POST after a network failure', async () => {
    const mock = createMockFetch({ throws: networkError() }, ok);
    const rest = new EpicRestClient({ fetch: mock.fetch, retry: 3 });
    await expect(rest.request('POST', '/gift', { json: {} })).rejects.toBeInstanceOf(NetworkError);
    expect(mock.calls).toBe(1);
  });

  it('still retries a POST that was rate limited', async () => {
    const mock = createMockFetch({ status: 429, body: {}, headers: { 'retry-after': '0' } }, ok);
    const rest = new EpicRestClient({ fetch: mock.fetch, retry: 2 });
    const response = await rest.request('POST', '/gift', { json: {} });
    expect(response.data).toEqual({ ok: true });
    expect(mock.calls).toBe(2);
  });

  it('replays a POST explicitly marked idempotent', async () => {
    const mock = createMockFetch(unavailable, ok);
    const rest = new EpicRestClient({ fetch: mock.fetch, retry: 2 });
    await rest.request('POST', '/query', { json: {}, idempotent: true });
    expect(mock.calls).toBe(2);
  });

  it('surfaces the rate limit error once attempts are exhausted', async () => {
    const mock = createMockFetch({ status: 429, body: {}, headers: { 'retry-after': '7' } });
    const rest = new EpicRestClient({ fetch: mock.fetch, retry: 1 });
    const error = await rest.request('GET', '/thing').catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(EpicRateLimitError);
    expect((error as EpicRateLimitError).retryAfterSeconds).toBe(7);
  });
});

describe('replayable epic calls', () => {
  it('retries a device auth token grant but not an exchange code grant', async () => {
    const token = { status: 200, body: { access_token: 'AT' } };
    const replayed = createMockFetch(unavailable, token);
    const auth = new AuthManager(new EpicRestClient({ fetch: replayed.fetch, retry: 2 }));
    await auth.token(AuthClients.fortniteAndroid, 'device_auth', { account_id: 'a', device_id: 'd', secret: 's' });
    expect(replayed.calls).toBe(2);

    const single = createMockFetch(unavailable, token);
    const singleAuth = new AuthManager(new EpicRestClient({ fetch: single.fetch, retry: 2 }));
    await expect(
      singleAuth.token(AuthClients.fortniteAndroid, 'exchange_code', { exchange_code: 'code' }),
    ).rejects.toBeInstanceOf(EpicApiError);
    expect(single.calls).toBe(1);
  });

  it('retries QueryProfile but not a mutating MCP operation', async () => {
    const profile = { status: 200, body: { profileRevision: 1 } };
    const query = createMockFetch(unavailable, profile);
    await new MCPClient(new EpicRestClient({ fetch: query.fetch, retry: 2 })).queryProfile('AT', 'acc');
    expect(query.calls).toBe(2);

    const gift = createMockFetch(unavailable, profile);
    await expect(
      new MCPClient(new EpicRestClient({ fetch: gift.fetch, retry: 2 })).operation('AT', 'acc', 'GiftCatalogEntry'),
    ).rejects.toBeInstanceOf(EpicApiError);
    expect(gift.calls).toBe(1);
  });
});
