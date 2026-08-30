# Error Handling

Every error thrown by fnapi-js — from both the Fortnite and Epic clients — descends from a single base class, so you can catch broadly or narrowly with `instanceof`.

## The error hierarchy

**`FortniteApiError`** is the root. All others extend it (directly or through `HttpError`).

### HTTP errors

`HttpError` is thrown for non-2xx responses and carries `status`, `method`, `url`, `body`, and `headers`. Specific status codes map to dedicated subclasses:

| Class | Status |
| --- | --- |
| `BadRequestError` | 400 |
| `AuthenticationError` | 401 |
| `ForbiddenError` | 403 |
| `NotFoundError` | 404 |
| `GoneError` | 410 |
| `RateLimitError` | 429 — adds `retryAfter` (ms, or `null`) |
| `ServerError` | any 5xx |

Any other non-2xx status throws the base `HttpError`.

### Non-HTTP errors

- **`ValidationError`** — invalid arguments before a request is made; carries the offending `parameter` (or `null`).
- **`TimeoutError`** — the request exceeded its `timeout`; carries `timeout` and `url`.
- **`AbortError`** — the request was cancelled via an `AbortSignal`; carries `url`.
- **`NetworkError`** — the transport failed (DNS, connection reset, etc.); carries `url` and a `cause`.
- **`ParseError`** — the response claimed to be JSON but could not be parsed; carries `url` and the `raw` text.

The Epic client adds **`EpicApiError`** and its status-specific subclasses **`EpicAuthError`** (OAuth failures), **`EpicPermissionError`** (403 / missing-permission), **`EpicNotFoundError`** (404), and **`EpicRateLimitError`** (429), covered in **Epic Authentication**. All of them extend `FortniteApiError`.

## How retries, timeouts, and abort interact

- **Retries.** Failed requests are retried per the client `retry` policy. HTTP errors are retried only when their status is in the retry `statusCodes` set; transport errors are retried with exponential backoff between `minDelay` and `maxDelay`. On a `429` (or any error carrying a `Retry-After` header), the client waits the server-advertised delay, capped at `maxDelay`.
- **Timeouts.** Each attempt is bounded by `timeout`. When it elapses the attempt is aborted and surfaced as a `TimeoutError`.
- **Abort.** Passing your own `signal` lets you cancel in flight. A user-initiated abort throws `AbortError` immediately and is **not** retried. Your signal is linked with the internal timeout signal, so whichever fires first wins.

```ts
const controller = new AbortController();
setTimeout(() => controller.abort(), 10_000);

const shop = await client.shop.get({ signal: controller.signal });
```

## Catching by type

```ts
import { NotFoundError, RateLimitError, ValidationError } from 'fnapi-js';

try {
  const stats = await client.stats.byName('SomePlayer');
  console.log(stats.account.name);
} catch (error) {
  if (error instanceof NotFoundError) {
    console.error('No such player:', error.message);
  } else if (error instanceof RateLimitError) {
    console.error(`Rate limited, retry after ${error.retryAfter}ms`);
  } else if (error instanceof ValidationError) {
    console.error(`Invalid "${error.parameter}": ${error.message}`);
  } else {
    throw error;
  }
}
```

## `find*` and `*ById` helpers return `null`

When a missing resource is an expected outcome rather than an error, prefer the helper methods that resolve to `null` on a 404 instead of throwing `NotFoundError`. For example `cosmetics.search(...)` throws when nothing matches, while `cosmetics.find(...)` returns `null`:

```ts
const outfit = await client.cosmetics.find({
  name: 'Ghoul Trooper',
  matchMethod: MatchMethod.Full,
});

if (outfit) {
  console.log(`${outfit.name} last appeared ${outfit.shopHistory?.at(-1) ?? 'never'}`);
}
```

The same pattern appears across endpoints as `find*` / `*ById` variants — reach for them to keep 404s out of your `try`/`catch`.
