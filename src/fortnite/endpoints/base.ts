import type { Language } from '../enums.js';
import { formatFlags, parseFlags } from '../enums.js';
import { ValidationError } from '../../core/errors.js';
import type { RestClient } from '../rest.js';
import type { ApiEnvelope } from '../types.js';
import type { BaseOptions, FlagOptions } from '../options.js';
import type { QueryParams, RequestOptions } from '../../core/types.js';

export interface ClientDefaults {
  language?: Language;
  responseFlags?: number | string;
}

export abstract class BaseEndpoint {
  protected readonly rest: RestClient;
  protected readonly defaults: ClientDefaults;

  constructor(rest: RestClient, defaults: ClientDefaults = {}) {
    this.rest = rest;
    this.defaults = defaults;
  }

  protected requestOptions(options: BaseOptions | undefined, query: QueryParams): RequestOptions {
    const requestOptions: RequestOptions = { query };

    if (options?.signal !== undefined) requestOptions.signal = options.signal;
    if (options?.timeout !== undefined) requestOptions.timeout = options.timeout;
    if (options?.cache !== undefined) requestOptions.cache = options.cache;
    if (options?.headers !== undefined) requestOptions.headers = options.headers;

    return requestOptions;
  }

  protected languageQuery(options: { language?: Language } | undefined): QueryParams {
    const language = options?.language ?? this.defaults.language;
    return language ? { language } : {};
  }

  protected flagQuery(options: FlagOptions | undefined): QueryParams {
    const flags = options?.responseFlags ?? this.defaults.responseFlags;
    if (flags === undefined || flags === null) return {};

    const parsed = parseFlags(flags);
    return parsed === 0 ? {} : { responseFlags: formatFlags(parsed) };
  }

  protected baseQuery(options: FlagOptions | undefined, extra: QueryParams = {}): QueryParams {
    return { ...this.languageQuery(options), ...this.flagQuery(options), ...extra };
  }

  protected async fetchData<T>(
    path: string,
    options: BaseOptions | undefined,
    query: QueryParams,
  ): Promise<T> {
    const response = await this.rest.get<ApiEnvelope<T>>(path, this.requestOptions(options, query));
    return response.body.data;
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

  protected requireApiKey(feature: string): void {
    if (!this.rest.hasApiKey()) {
      throw new ValidationError(
        `An API key is required for ${feature}. Create one at https://dash.fortnite-api.com/`,
        'apiKey',
      );
    }
  }
}
