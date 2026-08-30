import { describe, expect, it } from 'vitest';
import {
  LibraryManager,
  LIBRARY_BASE_URL,
  LAUNCHER_LIBRARY_BASE_URL,
  buildLibraryCursor,
} from '../../src/epic/library.js';
import { EpicRestClient } from '../../src/epic/rest.js';
import { ValidationError } from '../../src/core/errors.js';
import { createMockFetch, type MockFetch, type MockResponseInit } from '../helpers/mockFetch.js';

function setup(...responses: MockResponseInit[]): { mock: MockFetch; library: LibraryManager } {
  const mock = createMockFetch(...responses);
  const rest = new EpicRestClient({ fetch: mock.fetch, retry: 1, baseUrl: LIBRARY_BASE_URL });
  const launcherRest = new EpicRestClient({
    fetch: mock.fetch,
    retry: 1,
    baseUrl: LAUNCHER_LIBRARY_BASE_URL,
  });
  return { mock, library: new LibraryManager(rest, launcherRest) };
}

async function captureThrow(run: () => Promise<unknown>): Promise<unknown> {
  try {
    await run();
  } catch (error) {
    return error;
  }
  throw new Error('Expected the call to throw');
}

describe('LibraryManager', () => {
  it('lists items and reads metadata from the body when included', async () => {
    const { mock, library } = setup({
      body: {
        responseMetadata: { nextCursor: 'eyJvZmZzZXQiOjEwMH0=', stateToken: 'state-1' },
        records: [{ namespace: 'fn', catalogItemId: 'cat-1', recordType: 'APPLICATION' }],
      },
    });
    const result = await library.items('token', {
      includeMetadata: true,
      limit: 100,
      platform: 'Windows',
      excludeNs: ['wex', 'lavender'],
    });
    const request = mock.lastRequest();
    expect(request.path).toBe('/library/api/public/items');
    expect(request.headers['authorization']).toBe('Bearer token');
    expect(request.query.get('includeMetadata')).toBe('true');
    expect(request.query.get('limit')).toBe('100');
    expect(request.query.get('platform')).toBe('Windows');
    expect(request.query.getAll('excludeNs')).toEqual(['wex', 'lavender']);
    expect(result.responseMetadata.stateToken).toBe('state-1');
    expect(result.records).toHaveLength(1);
  });

  it('falls back to the X-Epic-Metadata header when metadata is not in the body', async () => {
    const { library } = setup({
      body: { records: [] },
      headers: { 'x-epic-metadata': JSON.stringify({ nextCursor: 'abc', stateToken: 'state-2' }) },
    });
    const result = await library.items('token');
    expect(result.responseMetadata.nextCursor).toBe('abc');
    expect(result.responseMetadata.stateToken).toBe('state-2');
  });

  it('auto-paginates allItems by following nextCursor', async () => {
    const { mock, library } = setup();
    mock.queue(
      {
        body: {
          responseMetadata: { nextCursor: 'cursor-2' },
          records: [{ namespace: 'fn', catalogItemId: 'a' }],
        },
      },
      {
        body: {
          responseMetadata: {},
          records: [{ namespace: 'fn', catalogItemId: 'b' }],
        },
      },
    );
    const records = await library.allItems('token', { pageSize: 1 });
    expect(records.map((record) => record.catalogItemId)).toEqual(['a', 'b']);
    expect(mock.requests).toHaveLength(2);
    expect(mock.requests[0]!.query.get('includeMetadata')).toBe('true');
    expect(mock.requests[0]!.query.get('limit')).toBe('1');
    expect(mock.requests[1]!.query.get('cursor')).toBe('cursor-2');
  });

  it('checks a state token status', async () => {
    const { mock, library } = setup({ body: { valid: true } });
    const valid = await library.stateTokenStatus('token', 'state-3');
    expect(valid).toBe(true);
    expect(mock.lastRequest().path).toBe('/library/api/public/stateToken/state-3/status');
  });

  it('lists collections for an account', async () => {
    const { mock, library } = setup({
      body: { collections: [{ collectionId: 'c1', name: 'Favorites', libraryItemContentVersion: 1 }] },
    });
    const collections = await library.collections('token', 'acc');
    expect(collections).toHaveLength(1);
    expect(mock.lastRequest().path).toBe('/library/api/public/collection/account/acc');
  });

  it('creates a collection', async () => {
    const { mock, library } = setup({
      body: { collectionId: 'c2', name: 'New', libraryItemContentVersion: 1 },
    });
    const collection = await library.createCollection('token', 'acc', 'New');
    const request = mock.lastRequest();
    expect(request.method).toBe('POST');
    expect(request.path).toBe('/library/api/public/collection/account/acc');
    expect(JSON.parse(request.body ?? '{}')).toEqual({ name: 'New' });
    expect(collection.collectionId).toBe('c2');
  });

  it('deletes a collection', async () => {
    const { mock, library } = setup({ status: 204 });
    await library.deleteCollection('token', 'acc', 'c3');
    const request = mock.lastRequest();
    expect(request.method).toBe('DELETE');
    expect(request.path).toBe('/library/api/public/collection/c3/account/acc');
  });

  it('adds an item to a collection', async () => {
    const { mock, library } = setup({
      body: { collectionId: 'c4', name: 'Games', libraryItemContentVersion: 2 },
    });
    await library.addCollectionItem('token', 'acc', 'c4', {
      sandbox: 'sbx',
      catalogId: 'catid',
      artifactId: 'artid',
    });
    const request = mock.lastRequest();
    expect(request.method).toBe('POST');
    expect(request.path).toBe(
      '/library/api/public/collection/c4/item/account/acc/sandbox/sbx/catalog/catid/artifact/artid',
    );
  });

  it('removes an item from a collection', async () => {
    const { mock, library } = setup({
      body: { collectionId: 'c5', name: 'Games', libraryItemContentVersion: 3 },
    });
    await library.removeCollectionItem('token', 'acc', 'c5', {
      sandbox: 'sbx',
      catalogId: 'catid',
      artifactId: 'artid',
    });
    const request = mock.lastRequest();
    expect(request.method).toBe('DELETE');
    expect(request.path).toBe(
      '/library/api/public/collection/c5/item/account/acc/sandbox/sbx/catalog/catid/artifact/artid',
    );
  });

  it('lists collection items', async () => {
    const { mock, library } = setup({
      body: {
        responseMetadata: {},
        records: [{ sandbox: 'sbx', catalogId: 'catid', artifactId: 'artid' }],
      },
    });
    const items = await library.collectionItems('token', 'c6', 'acc');
    expect(items).toHaveLength(1);
    expect(mock.lastRequest().path).toBe('/library/api/public/collection/c6/item/account/acc');
  });

  it('queries the deprecated launcher proxy on its own host', async () => {
    const { mock, library } = setup({
      body: {
        records: [{ namespace: 'ns', catalogItemId: 'cid', appName: 'app' }],
        responseMetadata: { nextCursor: 'next' },
      },
    });
    const result = await library.launcherItems('token', { limit: 10, platform: 'Windows' });
    const request = mock.lastRequest();
    expect(request.url.startsWith(LAUNCHER_LIBRARY_BASE_URL)).toBe(true);
    expect(request.path).toBe('/launcher/api/public/library/items');
    expect(request.query.get('limit')).toBe('10');
    expect(result.responseMetadata.nextCursor).toBe('next');
  });

  it('validates required parameters', async () => {
    const { library } = setup({ body: {} });
    expect(await captureThrow(() => library.items(''))).toBeInstanceOf(ValidationError);
    expect(await captureThrow(() => library.collections('token', ''))).toBeInstanceOf(ValidationError);
    expect(
      await captureThrow(() =>
        library.addCollectionItem('token', 'acc', 'c', {
          sandbox: '',
          catalogId: 'catid',
          artifactId: 'artid',
        }),
      ),
    ).toBeInstanceOf(ValidationError);
  });

  it('builds a base64 offset cursor', () => {
    const cursor = buildLibraryCursor(10);
    expect(JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'))).toEqual({ offset: 10 });
    expect(() => buildLibraryCursor(-1)).toThrow(ValidationError);
  });
});
