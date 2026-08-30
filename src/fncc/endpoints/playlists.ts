import { FnccEndpoint } from './base.js';
import { FnccRoutes } from '../routes.js';
import type { QueryParams } from '../../core/types.js';
import type { FnccPlaylistOptions, FnccPlaylistsOptions } from '../options.js';
import type { FnccPlaylist } from '../types.js';

export class FnccPlaylistsEndpoint extends FnccEndpoint {
  async list(options?: FnccPlaylistsOptions): Promise<FnccPlaylist[]> {
    return this.fetchData<FnccPlaylist[]>(FnccRoutes.playlists(), options, this.query(options));
  }

  async get(id: string, options?: FnccPlaylistOptions): Promise<FnccPlaylist> {
    this.requireString(id, 'id');
    const query: QueryParams = {};
    if (options?.fetchImages !== undefined) query['fetchImages'] = options.fetchImages;
    return this.fetchData<FnccPlaylist>(FnccRoutes.playlist(id), options, query);
  }

  private query(options: FnccPlaylistsOptions | undefined): QueryParams {
    const query: QueryParams = {};
    if (options?.gameType !== undefined) query['gameType'] = options.gameType;
    if (options?.tag !== undefined) query['tag'] = options.tag;
    if (options?.tournament !== undefined) query['tournament'] = options.tournament;
    if (options?.ranked !== undefined) query['ranked'] = options.ranked;
    if (options?.limitedTime !== undefined) query['limitedTime'] = options.limitedTime;
    if (options?.default !== undefined) query['default'] = options.default;
    if (options?.fetchImages !== undefined) query['fetchImages'] = options.fetchImages;
    return query;
  }
}
