import { NotFoundError } from '../../core/errors.js';
import { Routes } from '../routes.js';
import type { CreatorCode } from '../types.js';
import type { BaseOptions } from '../options.js';
import { BaseEndpoint } from './base.js';

export class CreatorCodeEndpoint extends BaseEndpoint {
  async get(code: string, options?: BaseOptions): Promise<CreatorCode> {
    this.requireString(code, 'code');
    return this.fetchData<CreatorCode>(Routes.creatorCode(), options, { name: code });
  }

  async exists(code: string, options?: BaseOptions): Promise<boolean> {
    try {
      await this.get(code, options);
      return true;
    } catch (error) {
      if (error instanceof NotFoundError) return false;
      throw error;
    }
  }
}
