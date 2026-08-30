import { describe, expect, it } from 'vitest';
import { AccountManager } from '../../src/epic/account.js';
import { EpicRestClient } from '../../src/epic/rest.js';
import { ValidationError } from '../../src/core/errors.js';
import { createMockFetch, type MockFetch, type MockResponseInit } from '../helpers/mockFetch.js';

function setup(...responses: MockResponseInit[]): { mock: MockFetch; accounts: AccountManager } {
  const mock = createMockFetch(...responses);
  const rest = new EpicRestClient({ fetch: mock.fetch, retry: 1 });
  return { mock, accounts: new AccountManager(rest) };
}

async function captureThrow(fn: () => unknown): Promise<unknown> {
  try {
    await fn();
  } catch (error) {
    return error;
  }
  throw new Error('Expected the call to throw');
}

describe('AccountManager external auth', () => {
  it('lists external auths', async () => {
    const { mock, accounts } = setup({ body: [{ accountId: 'ACC', type: 'xbl' }] });
    await accounts.externalAuths('AT', 'ACC');
    const request = mock.lastRequest();
    expect(request.method).toBe('GET');
    expect(request.path).toBe('/account/api/public/account/ACC/externalAuths');
    expect(request.headers['authorization']).toBe('Bearer AT');
  });

  it('gets a single external auth by type', async () => {
    const { mock, accounts } = setup({ body: { accountId: 'ACC', type: 'psn' } });
    await accounts.externalAuth('AT', 'ACC', 'psn');
    const request = mock.lastRequest();
    expect(request.method).toBe('GET');
    expect(request.path).toBe('/account/api/public/account/ACC/externalAuths/psn');
  });

  it('looks up by external display name with caseInsensitive', async () => {
    const { mock, accounts } = setup({ body: [] });
    await accounts.byExternalDisplayName('AT', 'xbl', 'Some Gamertag', { caseInsensitive: true });
    const request = mock.lastRequest();
    expect(request.method).toBe('GET');
    expect(request.path).toBe(
      '/account/api/public/account/lookup/externalAuth/xbl/displayName/Some%20Gamertag',
    );
    expect(request.query.get('caseInsensitive')).toBe('true');
  });

  it('bulk looks up by external display names via POST body', async () => {
    const { mock, accounts } = setup({ body: {} });
    await accounts.byExternalDisplayNames('AT', 'psn', ['a', 'b']);
    const request = mock.lastRequest();
    expect(request.method).toBe('POST');
    expect(request.path).toBe('/account/api/public/account/lookup/externalDisplayName');
    expect(JSON.parse(request.body ?? '{}')).toEqual({ authType: 'psn', displayNames: ['a', 'b'] });
  });

  it('bulk looks up by external ids via POST body', async () => {
    const { mock, accounts } = setup({ body: {} });
    await accounts.byExternalIds('AT', 'nintendo', ['x']);
    const request = mock.lastRequest();
    expect(request.method).toBe('POST');
    expect(request.path).toBe('/account/api/public/account/lookup/externalId');
    expect(JSON.parse(request.body ?? '{}')).toEqual({ authType: 'nintendo', ids: ['x'] });
  });

  it('reads account metadata from the accounts path', async () => {
    const { mock, accounts } = setup({ body: { FGOnboarded: 'true' } });
    const result = await accounts.metadata('AT', 'ACC');
    const request = mock.lastRequest();
    expect(request.method).toBe('GET');
    expect(request.path).toBe('/account/api/accounts/ACC/metadata');
    expect(result).toEqual({ FGOnboarded: 'true' });
  });

  it('rejects an empty display names list without a request', async () => {
    const { mock, accounts } = setup();
    expect(await captureThrow(() => accounts.byExternalDisplayNames('AT', 'psn', []))).toBeInstanceOf(
      ValidationError,
    );
    expect(mock.calls).toBe(0);
  });

  it('rejects more than 100 external ids without a request', async () => {
    const { mock, accounts } = setup();
    const ids = Array.from({ length: 101 }, (_, i) => String(i));
    expect(await captureThrow(() => accounts.byExternalIds('AT', 'psn', ids))).toBeInstanceOf(
      ValidationError,
    );
    expect(mock.calls).toBe(0);
  });
});
