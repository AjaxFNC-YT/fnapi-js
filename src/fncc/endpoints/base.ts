import { ValidationError } from '../../core/errors.js';
import type { QueryParams, RequestOptions } from '../../core/types.js';
import type { RestClient } from '../../fortnite/rest.js';
import type { FnccBaseOptions } from '../options.js';

export class FnccEndpoint {
  protected readonly rest: RestClient;

  constructor(rest: RestClient) {
    this.rest = rest;
  }

  protected async fetchRaw<T>(
    path: string,
    options: FnccBaseOptions | undefined,
    query: QueryParams = {},
  ): Promise<T> {
    const response = await this.rest.get<T>(path, this.requestOptions(options, query));
    return response.body;
  }

  protected async fetchData<T>(
    path: string,
    options: FnccBaseOptions | undefined,
    query: QueryParams = {},
  ): Promise<T> {
    const body = await this.fetchRaw<unknown>(path, options, query);
    if (
      body !== null &&
      typeof body === 'object' &&
      !Array.isArray(body) &&
      'status' in body &&
      'data' in body
    ) {
      return (body as { data: T }).data;
    }
    return body as T;
  }

  protected buildUrl(path: string, query: QueryParams = {}): string {
    return this.rest.buildUrl(path, query);
  }

  protected requestOptions(options: FnccBaseOptions | undefined, query: QueryParams): RequestOptions {
    const requestOptions: RequestOptions = { query };

    if (options?.signal !== undefined) requestOptions.signal = options.signal;
    if (options?.timeout !== undefined) requestOptions.timeout = options.timeout;
    if (options?.cache !== undefined) requestOptions.cache = options.cache;
    if (options?.headers !== undefined) requestOptions.headers = options.headers;

    return requestOptions;
  }

  protected requireString(value: unknown, parameter: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new ValidationError(
        `"${parameter}" is required and must be a non-empty string`,
        parameter,
      );
    }
    return value;
  }
}
