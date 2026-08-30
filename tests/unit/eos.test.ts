import { describe, expect, it } from 'vitest';
import { EosConnectManager } from '../../src/epic/eos.js';
import { EpicRestClient } from '../../src/epic/rest.js';
import { ValidationError } from '../../src/core/errors.js';
import { createMockFetch, type MockFetch, type MockResponseInit } from '../helpers/mockFetch.js';

function setup(...responses: MockResponseInit[]): { mock: MockFetch; eos: EosConnectManager } {
  const mock = createMockFetch(...responses);
  const rest = new EpicRestClient({ fetch: mock.fetch, retry: 1 });
  return { mock, eos: new EosConnectManager(rest) };
}

async function captureThrow(fn: () => unknown): Promise<unknown> {
  try {
    await fn();
  } catch (error) {
    return error;
  }
  throw new Error('Expected the call to throw');
}

describe('EosConnectManager resolution', () => {
  it('queries epic accounts by id with repeated query params', async () => {
    const { mock, eos } = setup({
      body: [
        { accountId: 'a', displayName: 'Alpha' },
        { accountId: 'b', displayName: 'Bravo' },
      ],
    });
    const result = await eos.queryAccounts('EOS', ['a', 'b']);
    const request = mock.lastRequest();
    expect(request.method).toBe('GET');
    expect(request.path).toBe('/epic/id/v2/accounts');
    expect(request.headers['authorization']).toBe('Bearer EOS');
    expect(request.query.getAll('accountId')).toEqual(['a', 'b']);
    expect(result[0]?.displayName).toBe('Alpha');
  });

  it('mints an EAS token via client_credentials with basic auth', async () => {
    const { mock, eos } = setup({
      body: { access_token: 'EAS', token_type: 'bearer', expires_in: 3600 },
    });
    const client = { name: 'fortnitePC', clientId: 'abc', clientSecret: 'def' };
    const token = await eos.easToken(client);
    const request = mock.lastRequest();
    expect(request.method).toBe('POST');
    expect(request.path).toBe('/epic/oauth/v2/token');
    expect(request.headers['authorization']).toBe(`Basic ${Buffer.from('abc:def').toString('base64')}`);
    expect(request.body).toContain('grant_type=client_credentials');
    expect(token.access_token).toBe('EAS');
  });

  it('queries product users by id', async () => {
    const { mock, eos } = setup({ body: [{ productUserId: 'p', accountId: 'a' }] });
    const result = await eos.queryProductUsers('EOS', ['p']);
    const request = mock.lastRequest();
    expect(request.method).toBe('GET');
    expect(request.path).toBe('/user/v1/product-users');
    expect(request.query.getAll('productUserId')).toEqual(['p']);
    expect(result[0]?.accountId).toBe('a');
  });

  it('rejects a blank eos access token without a request', async () => {
    const { mock, eos } = setup();
    expect(await captureThrow(() => eos.queryAccounts('', ['a']))).toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });

  it('rejects an empty id list without a request', async () => {
    const { mock, eos } = setup();
    expect(await captureThrow(() => eos.queryAccounts('EOS', []))).toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });

  it('rejects more than 100 ids without a request', async () => {
    const { mock, eos } = setup();
    const ids = Array.from({ length: 101 }, (_, i) => String(i));
    expect(await captureThrow(() => eos.queryProductUsers('EOS', ids))).toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });
});
