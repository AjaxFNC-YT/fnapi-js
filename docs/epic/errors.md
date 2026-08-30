# Epic Errors

Every non-2xx response from the Epic account service is thrown as a typed error. `EpicApiError` is the base (a subclass of `FortniteApiError`); `EpicAuthError`, `EpicPermissionError`, `EpicNotFoundError`, and `EpicRateLimitError` are status-specific subclasses. All of them carry the parsed Epic error body plus a human-readable `.description` resolved from the bundled catalog of documented error codes, so a bare `catch (err) { if (err instanceof EpicApiError) ... }` still handles every case while `instanceof` on a subclass lets you branch on the specific failure.

## EpicApiError
<Badge type="tip" text="class" />

```ts
class EpicApiError extends FortniteApiError { status; method; url; body; headers; errorCode; numericErrorCode; messageVars; description }
```

Thrown for failed Epic requests. Exposes HTTP context (`status`, `method`, `url`, `headers`), the raw `body` (`EpicErrorBody | string | null`), and the parsed Epic fields `errorCode`, `numericErrorCode`, and `messageVars`.

```ts
import { FortniteAPI, EpicGamesClient, EpicApiError, EpicAuthError } from 'fnapi-js';

try {
  await epic.accounts.byId(accessToken, accountId);
} catch (err) {
  if (err instanceof EpicApiError) {
    console.error(err.status, err.errorCode);
    console.error(err.description ?? err.message);
  }
}
```

::: tip Note
`description` is the documented, human-readable explanation for `errorCode`, looked up via `describeEpicError` — `null` when the code is unknown or absent.
:::

## EpicAuthError
<Badge type="tip" text="class" />

```ts
class EpicAuthError extends EpicApiError
```

OAuth-specific subclass with the same fields as `EpicApiError`. `createEpicError` returns this when the request hit an `/oauth/` URL or the `errorCode` contains `.oauth.`, so you can distinguish auth failures from general API failures via `instanceof`. This check runs first, so a `403` on an OAuth endpoint stays an `EpicAuthError` rather than an `EpicPermissionError`.

## EpicPermissionError
<Badge type="tip" text="class" />

```ts
class EpicPermissionError extends EpicApiError
```

Thrown when the token is valid but lacks the permission for the request — any `403`, or an `errorCode` containing `missing_permission`, `policy_missing_action`, or `deployment_product_access_forbidden` (the last two are how EOS reports a client-policy gap on a `400`). This is the error you get from `session.listDeviceAuths()` / `getDeviceAuth()` on a device-auth-grant token: that grant carries `CREATE`+`DELETE` on `account:public:account:deviceAuths` but not `READ`. Switch to a client that holds `READ` first — `await (await session.switchClient('fortnitePC')).listDeviceAuths()` (or `'launcherApp'`) — then the same call succeeds.

## EpicNotFoundError
<Badge type="tip" text="class" />

```ts
class EpicNotFoundError extends EpicApiError
```

Thrown for any `404` — an unknown account, missing device auth, or absent resource.

## EpicRateLimitError
<Badge type="tip" text="class" />

```ts
class EpicRateLimitError extends EpicApiError { retryAfterSeconds: number | null }
```

Thrown for a `429`. `retryAfterSeconds` is parsed from the `Retry-After` response header when Epic sends one, otherwise `null`.

## EpicApiErrorContext
<Badge type="tip" text="interface" />

```ts
interface EpicApiErrorContext { status: number; method: string; url: string; body: EpicErrorBody | string | null; headers?: Record<string, string> }
```

Constructor context for the Epic error classes and the input to `createEpicError`. `errorCode`, `numericErrorCode`, `messageVars`, and `description` are derived from `body` by the constructor.

## createEpicError
<Badge type="tip" text="function" />

```ts
createEpicError(context: EpicApiErrorContext): EpicApiError
```

Factory that builds the right error from a failed response. Derives a message from `body.errorMessage`/`error_description`/`error` (or a raw string body), then picks the class in order: `EpicAuthError` for OAuth-flagged requests, `EpicPermissionError` for permission failures (`403` or a permission `errorCode`), `EpicNotFoundError` for `404`, `EpicRateLimitError` for `429`, and `EpicApiError` for everything else.

| Parameter | Type | Description |
| --- | --- | --- |
| `context` | `EpicApiErrorContext` | Status, method, url, parsed/raw body, and optional headers. |

**Returns:** `EpicApiError (or one of the EpicAuthError / EpicPermissionError / EpicNotFoundError / EpicRateLimitError subclasses)`

## describeEpicError
<Badge type="tip" text="function" />

```ts
describeEpicError(errorCode: string | null | undefined): string | null
```

Looks up the documented explanation for an Epic `errorCode` in `EPIC_ERROR_DESCRIPTIONS`. Returns `null` for unknown, null, or undefined codes. This is exactly what populates `EpicApiError.description`.

| Parameter | Type | Description |
| --- | --- | --- |
| `errorCode` | `string \| null \| undefined` | An Epic error code such as `errors.com.epicgames.account.account_not_found`. |

**Returns:** `human-readable description, or null`

```ts
import { describeEpicError } from 'fnapi-js';

const text = describeEpicError('errors.com.epicgames.common.oauth.invalid_token');
// 'There was an issue verifying token eg1~xxx. Token contains invalid data.'
```

## EPIC_ERROR_DESCRIPTIONS
<Badge type="warning" text="constant" />

```ts
const EPIC_ERROR_DESCRIPTIONS: Readonly<Record<string, string>>
```

Bundled catalog of 219 documented Epic error codes mapped to their human-readable descriptions, scoped across the `account`, `accountportal`, `common`, and `oauth` namespaces. Backs `describeEpicError` and the `.description` field on Epic errors.

## EpicErrorBody
<Badge type="tip" text="interface" />

```ts
interface EpicErrorBody { errorCode?: string; errorMessage?: string; messageVars?: string[]; numericErrorCode?: number; error?: string; error_description?: string; [key: string]: unknown }
```

Shape of the JSON body Epic returns on errors. Fields are pulled out onto `EpicApiError`; the index signature keeps any extra Epic-specific keys accessible.
