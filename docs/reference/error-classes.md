# Error Classes

All errors extend `FortniteApiError`. HTTP failures throw a specific `HttpError` subclass chosen by status code (via `createHttpError`); transport and validation problems throw the standalone subclasses. `catch` on the base class to handle everything, or `instanceof` a subclass to branch.

## FortniteApiError
<Badge type="tip" text="class" />

```ts
class FortniteApiError extends Error { constructor(message: string, options?: { cause?: unknown }) }
```

Root of the error hierarchy. Every error thrown by the library is an instance of this class.

```ts
import { FortniteApiError } from 'fnapi-js';

try {
  await api.cosmetics.all();
} catch (err) {
  if (err instanceof FortniteApiError) console.error(err.name, err.message);
}
```

## HttpError
<Badge type="tip" text="class" />

```ts
class HttpError extends FortniteApiError { status: number; method: string; url: string; body: unknown; headers: Record<string, string> }
```

Base for all non-2xx HTTP responses. Carries the `status`, `method`, `url`, response `body`, and `headers`.

```ts
import { HttpError } from 'fnapi-js';

try {
  await api.stats.byName('nobody-here');
} catch (err) {
  if (err instanceof HttpError) console.error(err.status, err.url);
}
```

## BadRequestError
<Badge type="tip" text="class" />

```ts
class BadRequestError extends HttpError
```

Thrown on HTTP 400 — the request was malformed or had invalid parameters.

```ts
import { BadRequestError } from 'fnapi-js';
```

## AuthenticationError
<Badge type="tip" text="class" />

```ts
class AuthenticationError extends HttpError
```

Thrown on HTTP 401 — missing or invalid API key for endpoints that require one.

```ts
import { AuthenticationError } from 'fnapi-js';
```

## ForbiddenError
<Badge type="tip" text="class" />

```ts
class ForbiddenError extends HttpError
```

Thrown on HTTP 403 — authenticated but not permitted to access the resource.

```ts
import { ForbiddenError } from 'fnapi-js';
```

## NotFoundError
<Badge type="tip" text="class" />

```ts
class NotFoundError extends HttpError
```

Thrown on HTTP 404 — the requested resource (cosmetic, player, playlist) does not exist.

```ts
import { NotFoundError } from 'fnapi-js';
```

## GoneError
<Badge type="tip" text="class" />

```ts
class GoneError extends HttpError
```

Thrown on HTTP 410 — the resource existed but is no longer available.

```ts
import { GoneError } from 'fnapi-js';
```

## RateLimitError
<Badge type="tip" text="class" />

```ts
class RateLimitError extends HttpError { retryAfter: number | null }
```

Thrown on HTTP 429. `retryAfter` holds the parsed `Retry-After` delay in milliseconds (from seconds or an HTTP date), or `null` when absent.

```ts
import { RateLimitError } from 'fnapi-js';

try {
  await api.cosmetics.all();
} catch (err) {
  if (err instanceof RateLimitError && err.retryAfter) {
    await new Promise((r) => setTimeout(r, err.retryAfter));
  }
}
```

## ServerError
<Badge type="tip" text="class" />

```ts
class ServerError extends HttpError
```

Thrown on any HTTP 5xx — an upstream/server-side failure.

```ts
import { ServerError } from 'fnapi-js';
```

## ValidationError
<Badge type="tip" text="class" />

```ts
class ValidationError extends FortniteApiError { parameter: string | null }
```

Thrown client-side before a request when arguments fail validation. `parameter` names the offending field, or `null` if unspecified.

```ts
import { ValidationError } from 'fnapi-js';

try {
  await api.stats.byName('');
} catch (err) {
  if (err instanceof ValidationError) console.error(err.parameter);
}
```

## TimeoutError
<Badge type="tip" text="class" />

```ts
class TimeoutError extends FortniteApiError { timeout: number; url: string }
```

Thrown when a request exceeds its configured `timeout` (ms). Reports the `timeout` value and the `url`.

```ts
import { TimeoutError } from 'fnapi-js';
```

## AbortError
<Badge type="tip" text="class" />

```ts
class AbortError extends FortniteApiError { url: string }
```

Thrown when a request is cancelled via an external `AbortSignal`. Carries the `url`.

```ts
import { AbortError } from 'fnapi-js';

const controller = new AbortController();
controller.abort();
try {
  await api.cosmetics.all({ signal: controller.signal });
} catch (err) {
  if (err instanceof AbortError) console.log('cancelled', err.url);
}
```

## NetworkError
<Badge type="tip" text="class" />

```ts
class NetworkError extends FortniteApiError { url: string }
```

Thrown when the underlying fetch fails at the transport layer (DNS, connection, offline). The original failure is on `cause`.

```ts
import { NetworkError } from 'fnapi-js';
```

## ParseError
<Badge type="tip" text="class" />

```ts
class ParseError extends FortniteApiError { url: string; raw: string }
```

Thrown when a response body cannot be parsed as expected JSON. `raw` holds the unparsed response text.

```ts
import { ParseError } from 'fnapi-js';
```

## ConflictError
<Badge type="tip" text="class" />

```ts
class ConflictError extends HttpError
```

Thrown on an HTTP `409 Conflict`. Carries the same `status`, `method`, `url`, `body` and `headers` as any `HttpError`.

```ts
import { ConflictError } from 'fnapi-js';
```

## ConfigurationError
<Badge type="tip" text="class" />

```ts
class ConfigurationError extends FortniteApiError { option: string | null }
```

Thrown when the client is asked to do something a safety flag disables — using a **custom auth client** without `allowCustomClients`, or a **custom MCP operation** without `allowCustomMcpOperations`. `option` names the flag you need to set.

```ts
import { ConfigurationError, EpicGamesClient } from 'fnapi-js';

try {
  new EpicGamesClient().client({ name: 'x', clientId: '...', clientSecret: '...' });
} catch (err) {
  if (err instanceof ConfigurationError) {
    console.error(`enable ${err.option} to use this`);
  }
}
```
