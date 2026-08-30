import type { FetchLike } from '../../src/core/types.js';

export interface RecordedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | undefined;
  query: URLSearchParams;
  path: string;
}

export interface MockResponseInit {
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
  delay?: number;
  throws?: unknown;
}

export interface MockFetch {
  fetch: FetchLike;
  requests: RecordedRequest[];
  calls: number;
  lastRequest: () => RecordedRequest;
  queue: (...responses: MockResponseInit[]) => void;
}

function toResponse(init: MockResponseInit): Response {
  const status = init.status ?? 200;
  const isJson = typeof init.body === 'object' && init.body !== null;
  const payload =
    init.body === undefined ? '' : isJson ? JSON.stringify(init.body) : String(init.body);
  const nullBody = status === 204 || status === 205 || status === 304;

  return new Response(nullBody ? null : payload, {
    status,
    headers: {
      'content-type': isJson ? 'application/json; charset=utf-8' : 'text/plain',
      ...init.headers,
    },
  });
}

export function createMockFetch(...responses: MockResponseInit[]): MockFetch {
  const pending: MockResponseInit[] = [...responses];
  const requests: RecordedRequest[] = [];

  const mock: MockFetch = {
    requests,
    calls: 0,
    lastRequest: () => {
      const last = requests[requests.length - 1];
      if (!last) throw new Error('No requests were recorded');
      return last;
    },
    queue: (...next: MockResponseInit[]) => {
      pending.push(...next);
    },
    fetch: async (input: string, init?: RequestInit): Promise<Response> => {
      const parsed = new URL(input);

      requests.push({
        url: input,
        method: init?.method ?? 'GET',
        headers: (init?.headers as Record<string, string>) ?? {},
        body: typeof init?.body === 'string' ? init.body : undefined,
        query: parsed.searchParams,
        path: parsed.pathname,
      });
      mock.calls += 1;

      const current = pending.length > 1 ? pending.shift() : pending[0];
      const responseInit = current ?? { status: 200, body: { status: 200, data: null } };

      if (responseInit.delay) {
        await new Promise((resolve) => setTimeout(resolve, responseInit.delay));
        if (init?.signal?.aborted) {
          const error = new Error('The operation was aborted');
          error.name = 'AbortError';
          throw error;
        }
      }

      if (responseInit.throws) throw responseInit.throws;

      return toResponse(responseInit);
    },
  };

  return mock;
}

export function envelope<T>(data: T, status = 200): { status: number; data: T } {
  return { status, data };
}

export function errorEnvelope(status: number, message: string): { status: number; error: string } {
  return { status, error: message };
}

export function networkError(code = 'ECONNRESET'): Error {
  const error = new Error(`fetch failed: ${code}`);
  (error as Error & { code?: string }).code = code;
  return error;
}
