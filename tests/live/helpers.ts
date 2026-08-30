import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { FortniteAPI } from '../../src/fortnite/client.js';

export interface LiveConfig {
  apiKey: string;
  language: string;
  timeout: number;
  retries: number;
  live: {
    playerName: string;
    cosmeticId: string;
    playlistId: string;
    creatorCode: string;
  };
}

const here = dirname(fileURLToPath(import.meta.url));

export const config = JSON.parse(
  readFileSync(resolve(here, '../../config.json'), 'utf8'),
) as LiveConfig;

export const hasApiKey = typeof config.apiKey === 'string' && config.apiKey.length > 0;

export function createLiveClient(): FortniteAPI {
  return new FortniteAPI({
    apiKey: hasApiKey ? config.apiKey : undefined,
    timeout: config.timeout,
    retry: { attempts: config.retries, minDelay: 750, maxDelay: 5000 },
  });
}
