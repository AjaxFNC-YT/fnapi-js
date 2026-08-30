import { ValidationError } from '../core/errors.js';
import type { EpicRestClient } from './rest.js';

export const CLOUDSTORAGE_CONTENT_TYPE = 'application/octet-stream';

export interface CloudStorageFile {
  uniqueFilename: string;
  filename: string;
  hash: string;
  hash256: string;
  length: number;
  contentType: string;
  uploaded: string;
  storageType: string;
  storageIds?: Record<string, string>;
  accountId?: string;
  doNotCache?: boolean;
}

export interface CloudStorageOptions {
  signal?: AbortSignal;
}

export interface CloudStorageWriteOptions extends CloudStorageOptions {
  contentType?: string;
}

function requireString(value: unknown, parameter: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`"${parameter}" is required and must be a non-empty string`, parameter);
  }
  return value;
}

function toBytes(data: string | Uint8Array, parameter: string): string | Uint8Array {
  if (typeof data === 'string' || data instanceof Uint8Array) return data;
  throw new ValidationError(`"${parameter}" must be a string or Uint8Array`, parameter);
}

export class CloudStorageManager {
  constructor(private readonly rest: EpicRestClient) {}

  async listUser(
    accessToken: string,
    accountId: string,
    options?: CloudStorageOptions,
  ): Promise<CloudStorageFile[]> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    const response = await this.rest.request<CloudStorageFile[]>(
      'GET',
      `/fortnite/api/cloudstorage/user/${encodeURIComponent(accountId)}`,
      {
        bearer: accessToken,
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data;
  }

  async readUser(
    accessToken: string,
    accountId: string,
    filename: string,
    options?: CloudStorageOptions,
  ): Promise<Uint8Array> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    requireString(filename, 'filename');
    const response = await this.rest.request<Uint8Array>(
      'GET',
      `/fortnite/api/cloudstorage/user/${encodeURIComponent(accountId)}/${encodeURIComponent(filename)}`,
      {
        bearer: accessToken,
        responseType: 'binary',
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data;
  }

  async readUserText(
    accessToken: string,
    accountId: string,
    filename: string,
    options?: CloudStorageOptions,
  ): Promise<string> {
    const bytes = await this.readUser(accessToken, accountId, filename, options);
    return new TextDecoder().decode(bytes);
  }

  async writeUser(
    accessToken: string,
    accountId: string,
    filename: string,
    data: string | Uint8Array,
    options?: CloudStorageWriteOptions,
  ): Promise<void> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    requireString(filename, 'filename');
    await this.rest.request<null>(
      'PUT',
      `/fortnite/api/cloudstorage/user/${encodeURIComponent(accountId)}/${encodeURIComponent(filename)}`,
      {
        bearer: accessToken,
        body: toBytes(data, 'data'),
        contentType: options?.contentType ?? CLOUDSTORAGE_CONTENT_TYPE,
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
  }

  async deleteUser(
    accessToken: string,
    accountId: string,
    filename: string,
    options?: CloudStorageOptions,
  ): Promise<void> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    requireString(filename, 'filename');
    await this.rest.request<null>(
      'DELETE',
      `/fortnite/api/cloudstorage/user/${encodeURIComponent(accountId)}/${encodeURIComponent(filename)}`,
      {
        bearer: accessToken,
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
  }

  async listSystem(accessToken: string, options?: CloudStorageOptions): Promise<CloudStorageFile[]> {
    requireString(accessToken, 'accessToken');
    const response = await this.rest.request<CloudStorageFile[]>(
      'GET',
      '/fortnite/api/cloudstorage/system',
      {
        bearer: accessToken,
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data;
  }

  async readSystem(
    accessToken: string,
    filename: string,
    options?: CloudStorageOptions,
  ): Promise<Uint8Array> {
    requireString(accessToken, 'accessToken');
    requireString(filename, 'filename');
    const response = await this.rest.request<Uint8Array>(
      'GET',
      `/fortnite/api/cloudstorage/system/${encodeURIComponent(filename)}`,
      {
        bearer: accessToken,
        responseType: 'binary',
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
    return response.data;
  }

  async readSystemText(
    accessToken: string,
    filename: string,
    options?: CloudStorageOptions,
  ): Promise<string> {
    const bytes = await this.readSystem(accessToken, filename, options);
    return new TextDecoder().decode(bytes);
  }
}
