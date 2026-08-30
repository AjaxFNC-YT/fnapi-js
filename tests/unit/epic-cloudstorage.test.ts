import { describe, expect, it } from 'vitest';
import { CloudStorageManager, CLOUDSTORAGE_CONTENT_TYPE } from '../../src/epic/cloudstorage.js';
import { EpicRestClient } from '../../src/epic/rest.js';
import { ValidationError } from '../../src/core/errors.js';
import { createMockFetch, type MockFetch, type MockResponseInit } from '../helpers/mockFetch.js';

function setup(...responses: MockResponseInit[]): { mock: MockFetch; cloud: CloudStorageManager } {
  const mock = createMockFetch(...responses);
  const rest = new EpicRestClient({
    fetch: mock.fetch,
    retry: 1,
    baseUrl: 'https://fngw-mcp-gc-livefn.ol.epicgames.com',
  });
  return { mock, cloud: new CloudStorageManager(rest) };
}

async function captureThrow(run: () => Promise<unknown>): Promise<unknown> {
  try {
    await run();
  } catch (error) {
    return error;
  }
  throw new Error('Expected the call to throw');
}

const FILE = {
  uniqueFilename: 'ClientSettings.Sav',
  filename: 'ClientSettings.Sav',
  hash: 'deadbeef',
  hash256: 'deadbeefdeadbeef',
  length: 12,
  contentType: 'application/octet-stream',
  uploaded: '2026-01-01T00:00:00.000Z',
  storageType: 'S3',
};

describe('CloudStorageManager', () => {
  it('lists user files', async () => {
    const { mock, cloud } = setup({ body: [FILE] });
    const files = await cloud.listUser('token', 'acc');
    const request = mock.lastRequest();
    expect(request.path).toBe('/fortnite/api/cloudstorage/user/acc');
    expect(request.headers['authorization']).toBe('Bearer token');
    expect(files).toHaveLength(1);
  });

  it('reads a user file as bytes', async () => {
    const { mock, cloud } = setup({ body: 'hello', headers: { 'content-type': 'application/octet-stream' } });
    const bytes = await cloud.readUser('token', 'acc', 'ClientSettings.Sav');
    expect(mock.lastRequest().path).toBe('/fortnite/api/cloudstorage/user/acc/ClientSettings.Sav');
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(new TextDecoder().decode(bytes)).toBe('hello');
  });

  it('reads a user file as text', async () => {
    const { cloud } = setup({ body: 'world', headers: { 'content-type': 'application/octet-stream' } });
    const text = await cloud.readUserText('token', 'acc', 'ClientSettings.Sav');
    expect(text).toBe('world');
  });

  it('writes a user file with the default content type and body', async () => {
    const { mock, cloud } = setup({ status: 204 });
    await cloud.writeUser('token', 'acc', 'ClientSettings.Sav', 'payload');
    const request = mock.lastRequest();
    expect(request.method).toBe('PUT');
    expect(request.path).toBe('/fortnite/api/cloudstorage/user/acc/ClientSettings.Sav');
    expect(request.headers['content-type']).toBe(CLOUDSTORAGE_CONTENT_TYPE);
    expect(request.body).toBe('payload');
  });

  it('deletes a user file', async () => {
    const { mock, cloud } = setup({ status: 204 });
    await cloud.deleteUser('token', 'acc', 'ClientSettings.Sav');
    const request = mock.lastRequest();
    expect(request.method).toBe('DELETE');
    expect(request.path).toBe('/fortnite/api/cloudstorage/user/acc/ClientSettings.Sav');
  });

  it('lists and reads system files', async () => {
    const { mock, cloud } = setup({ body: [FILE] });
    await cloud.listSystem('token');
    expect(mock.lastRequest().path).toBe('/fortnite/api/cloudstorage/system');

    const readMock = setup({ body: 'ini', headers: { 'content-type': 'application/octet-stream' } });
    const text = await readMock.cloud.readSystemText('token', 'DefaultGame.ini');
    expect(readMock.mock.lastRequest().path).toBe('/fortnite/api/cloudstorage/system/DefaultGame.ini');
    expect(text).toBe('ini');
  });

  it('validates required parameters', async () => {
    const { cloud } = setup({ body: [] });
    expect(await captureThrow(() => cloud.listUser('token', ''))).toBeInstanceOf(ValidationError);
    expect(await captureThrow(() => cloud.readUser('token', 'acc', ''))).toBeInstanceOf(
      ValidationError,
    );
  });
});
