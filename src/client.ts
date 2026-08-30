import { FortniteAPI } from './fortnite/client.js';
import { DillyAPI } from './dilly/index.js';
import { FnccAPI } from './fncc/index.js';
import { EpicGamesClient } from './epic/index.js';
import type { FortniteAPIOptions } from './fortnite/options.js';
import type { DillyAPIOptions } from './dilly/options.js';
import type { FnccAPIOptions } from './fncc/options.js';
import type { EpicClientOptions } from './epic/index.js';
import type { EcosystemEndpoint } from './epic/ecosystem.js';

export interface FortniteOptions extends FortniteAPIOptions {
  epic?: EpicClientOptions;
  dilly?: DillyAPIOptions;
  fncc?: FnccAPIOptions;
}

export class Fortnite {
  public readonly fortniteapi: FortniteAPI;
  public readonly dilly: DillyAPI;
  public readonly fncc: FnccAPI;
  public readonly epic: EpicGamesClient;

  constructor(options: FortniteOptions = {}) {
    const { epic, dilly, fncc, ...dataOptions } = options;

    this.fortniteapi = new FortniteAPI(dataOptions);

    this.dilly = new DillyAPI({
      timeout: dataOptions.timeout,
      headers: dataOptions.headers,
      retry: dataOptions.retry,
      cache: dataOptions.cache,
      fetch: dataOptions.fetch,
      userAgent: dataOptions.userAgent,
      ...dilly,
    });

    this.fncc = new FnccAPI({
      timeout: dataOptions.timeout,
      headers: dataOptions.headers,
      retry: dataOptions.retry,
      cache: dataOptions.cache,
      fetch: dataOptions.fetch,
      userAgent: dataOptions.userAgent,
      ...fncc,
    });

    this.epic = new EpicGamesClient({
      timeout: dataOptions.timeout,
      headers: dataOptions.headers,
      userAgent: dataOptions.userAgent,
      fetch: dataOptions.fetch,
      ...(typeof dataOptions.retry === 'number' ? { retry: dataOptions.retry } : {}),
      ...epic,
    });
  }

  get ecosystem(): EcosystemEndpoint {
    return this.epic.ecosystem;
  }
}
