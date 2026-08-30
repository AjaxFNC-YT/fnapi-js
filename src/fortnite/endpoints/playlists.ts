import { Routes } from '../routes.js';
import type { LanguageOptions } from '../options.js';
import type { Playlist } from '../types.js';
import { BaseEndpoint } from './base.js';

export class PlaylistsEndpoint extends BaseEndpoint {
  all(options?: LanguageOptions): Promise<Playlist[]> {
    return this.fetchData<Playlist[]>(Routes.playlists(), options, this.languageQuery(options));
  }

  async byId(playlistId: string, options?: LanguageOptions): Promise<Playlist> {
    this.requireString(playlistId, 'playlistId');
    return this.fetchData<Playlist>(
      Routes.playlistById(playlistId),
      options,
      this.languageQuery(options),
    );
  }
}
