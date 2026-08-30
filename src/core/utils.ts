import type { QueryParams, QueryPrimitive, QueryValue } from './types.js';

function serializePrimitive(value: QueryPrimitive): string {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

export function appendQuery(search: URLSearchParams, key: string, value: QueryValue): void {
  if (value === undefined || value === null) return;

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (entry === undefined || entry === null) continue;
      search.append(key, serializePrimitive(entry));
    }
    return;
  }

  search.append(key, serializePrimitive(value));
}

export function buildQuery(params: QueryParams | undefined): string {
  if (!params) return '';

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    appendQuery(search, key, value);
  }

  const serialized = search.toString();
  return serialized.length > 0 ? `?${serialized}` : '';
}

export function mergeQuery(...sources: Array<QueryParams | undefined>): QueryParams {
  const merged: QueryParams = {};

  for (const source of sources) {
    if (!source) continue;
    for (const [key, value] of Object.entries(source)) {
      if (value === undefined) continue;
      merged[key] = value;
    }
  }

  return merged;
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new Error('Aborted'));
      return;
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    function onAbort(): void {
      clearTimeout(timer);
      reject(signal?.reason ?? new Error('Aborted'));
    }

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export function toUnixSeconds(value: number | string | Date): number {
  if (value instanceof Date) {
    return Math.floor(value.getTime() / 1000);
  }

  if (typeof value === 'number') {
    return value > 1e11 ? Math.floor(value / 1000) : Math.floor(value);
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new TypeError('Unable to parse an empty string as a date');
  }

  const numeric = Number(trimmed);
  if (Number.isFinite(numeric)) {
    return numeric > 1e11 ? Math.floor(numeric / 1000) : Math.floor(numeric);
  }

  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) {
    throw new TypeError(`Unable to parse "${value}" as a date`);
  }

  return Math.floor(parsed / 1000);
}

export function backoffDelay(attempt: number, minDelay: number, maxDelay: number): number {
  const exponential = Math.min(maxDelay, minDelay * 2 ** Math.max(0, attempt - 1));
  const jitter = Math.random() * exponential * 0.25;
  return Math.round(Math.min(maxDelay, exponential + jitter));
}

export interface LinkedSignal {
  signal: AbortSignal;
  timedOut: () => boolean;
  dispose: () => void;
}

export function linkSignals(
  external: AbortSignal | undefined,
  timeout: number | undefined,
): LinkedSignal {
  const controller = new AbortController();
  let didTimeout = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const onExternalAbort = (): void => {
    controller.abort(external?.reason);
  };

  if (external) {
    if (external.aborted) {
      controller.abort(external.reason);
    } else {
      external.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  if (timeout !== undefined && timeout > 0 && !controller.signal.aborted) {
    timer = setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, timeout);
  }

  return {
    signal: controller.signal,
    timedOut: () => didTimeout,
    dispose: () => {
      if (timer !== undefined) clearTimeout(timer);
      external?.removeEventListener('abort', onExternalAbort);
    },
  };
}

const PATH_REPLACEMENTS: Array<[RegExp, string]> = [
  [/^FortniteGame\/Plugins\/GameFeatures\/BRCosmetics\/Content/, '/BRCosmetics'],
  [/^FortniteGame\/Plugins\/GameFeatures\/CosmeticShoes\/Content/, '/CosmeticShoes'],
  [/^FortniteGame\/Plugins\/GameFeatures\/[^/]+\/Content/, '/Game'],
  [/^FortniteGame\/Content/, '/Game'],
];

export function normalizeAssetPath(path: string): string {
  let normalized = path.replace(/^\/+/, '');

  for (const [pattern, replacement] of PATH_REPLACEMENTS) {
    if (pattern.test(normalized)) {
      normalized = normalized.replace(pattern, replacement);
      break;
    }
  }

  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

export function assetDirectory(path: string): string {
  const normalized = normalizeAssetPath(path);
  const segments = normalized.split('/');
  segments.pop();
  return segments.join('/');
}

export function assetName(path: string): string {
  const segments = normalizeAssetPath(path).split('/');
  return segments[segments.length - 1] ?? '';
}

export function safeGet<T = unknown>(
  source: unknown,
  path: string,
  defaultValue: T | null = null,
): T | null {
  const value = path.split('.').reduce<unknown>((accumulator, key) => {
    if (accumulator === null || accumulator === undefined) return undefined;
    return (accumulator as Record<string, unknown>)[key];
  }, source);

  return (value ?? defaultValue) as T | null;
}
