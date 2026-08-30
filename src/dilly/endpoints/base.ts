import { ValidationError } from '../../core/errors.js';
import type { QueryParams, RequestOptions } from '../../core/types.js';
import type { RestClient } from '../../fortnite/rest.js';
import type { DillyBaseOptions, DillyVersionOptions } from '../options.js';

export class DillyEndpoint {
  protected readonly rest: RestClient;

  constructor(rest: RestClient) {
    this.rest = rest;
  }

  protected async fetchRaw<T>(
    path: string,
    options: DillyBaseOptions | undefined,
    query: QueryParams = {},
  ): Promise<T> {
    const response = await this.rest.get<T>(path, this.requestOptions(options, query));
    return response.body;
  }

  protected requestOptions(
    options: DillyBaseOptions | undefined,
    query: QueryParams,
  ): RequestOptions {
    const requestOptions: RequestOptions = { query };

    if (options?.signal !== undefined) requestOptions.signal = options.signal;
    if (options?.timeout !== undefined) requestOptions.timeout = options.timeout;
    if (options?.cache !== undefined) requestOptions.cache = options.cache;
    if (options?.headers !== undefined) requestOptions.headers = options.headers;

    return requestOptions;
  }

  protected versionQuery(options: DillyVersionOptions | undefined): QueryParams {
    const query: QueryParams = {};
    if (options?.version !== undefined) query['version'] = options.version;
    return query;
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
