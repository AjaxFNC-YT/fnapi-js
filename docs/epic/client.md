# EpicGamesClient

The high-level Epic Games account-service auth client. Wires together a `RestClient`, `AuthManager`, `DeviceAuthManager`, and `AccountManager`, then exposes one-call login helpers that each return a ready-to-use `EpicAuthSession`. Public fields `rest`, `auth`, `deviceAuths`, and `accounts` are available for lower-level access.

## EpicGamesClient
<Badge type="tip" text="class" />

```ts
class EpicGamesClient { constructor(options?: EpicClientOptions) }
```

Constructs the client. `EpicClientOptions` extends `EpicRestOptions` — pass `defaultClient` to set the auth client used when a method omits one (defaults to `AuthClients.fortniteAndroid`), plus transport options `baseUrl`, `timeout`, `retry`, `userAgent`, `fetch`, and `headers`.

| Parameter | Type | Description |
| --- | --- | --- |
| `options.defaultClient` | `AuthClientInput` | Default auth client for calls that don't specify one. Accepts an `AuthClient`, a registry name like `'fortnitePC'`, or a raw client id string. Defaults to `AuthClients.fortniteAndroid`. |
| `options.timeout` | `number` | Per-request timeout in milliseconds. |
| `options.retry` | `number` | Total attempts per request (default `3`). GET / PUT / DELETE retry on 429 and 5xx and on network errors; POST / PATCH retry only on 429 so a gift or purchase is never sent twice. `Retry-After` is honoured up to 30s. Token grants for `device_auth` / `client_credentials` and the read-only MCP `QueryProfile` / `QueryPublicProfile` are treated as replayable. |
| `options.cache` (per request) | `boolean \| { ttl }` | Not a constructor option: GET-backed methods across the package accept `cache: true` (60s) or `cache: { ttl }` to keep that response in memory. Identical GETs that are in flight at the same time always share one request, keyed per token. `session.matchmakingNetCL({ cache: { ttl } })` caches the netCL lookup the same way. |
| `options.connectWebSocket` | `ConnectWebSocketFactory` | Header-capable WebSocket factory used by every session's connect stream. Optional on Node — the `ws` package is loaded automatically. |
| `options.baseUrl` | `string` | Override the Epic account-service base URL. |
| `options.fetch` | `FetchLike` | Custom fetch implementation. |
| `options.headers` | `Record<string, string>` | Extra default headers sent on every request. |

```ts
import { EpicGamesClient, AuthClients } from 'fnapi-js';

const epic = new EpicGamesClient({
  defaultClient: AuthClients.fortnitePC,
  timeout: 15_000,
  retry: 2,
});
```

## client
<Badge type="info" text="method" />

```ts
client(input?: AuthClientInput): AuthClient
```

Resolves an `AuthClientInput` to a concrete `AuthClient`. With no argument returns the configured `defaultClient`; otherwise resolves a registry name, raw client id, or passes through an `AuthClient`.

**Returns:** `resolved AuthClient`

```ts
const pc = epic.client();
const android = epic.client('fortniteAndroid');
```

## session
<Badge type="info" text="method" />

```ts
session(token: OAuthToken, client?: AuthClientInput): EpicAuthSession
```

Wraps an existing `OAuthToken` in an `EpicAuthSession` without performing a network request. Useful for rehydrating a session from a persisted token.

| Parameter | Type | Description |
| --- | --- | --- |
| `token` | `OAuthToken` | A previously obtained OAuth token. |
| `client` | `AuthClientInput` | Auth client the token belongs to. Defaults to the client's `defaultClient`. |

**Returns:** `EpicAuthSession bound to the token and client`

```ts
const session = epic.session(savedToken, 'fortnitePC');
const access = await session.ensureValid();
```

## login
<Badge type="info" text="method" />

```ts
login(grant: (auth: AuthManager, client: AuthClient) => Promise<OAuthToken>, client?: AuthClientInput): Promise<EpicAuthSession>
```

The generic login primitive that all `loginWith*` helpers build on. Resolves the target client, runs your `grant` callback against the `AuthManager` to obtain a token, then wraps it in a session.

| Parameter | Type | Description |
| --- | --- | --- |
| `grant` | `(auth, client) => Promise<OAuthToken>` | Callback that performs the actual grant against the resolved `AuthManager` and `AuthClient`. |
| `client` | `AuthClientInput` | Auth client to grant against. Defaults to `defaultClient`. |

**Returns:** `Promise<EpicAuthSession>`

```ts
const session = await epic.login(
  (auth, client) => auth.clientCredentials(client),
  'fortnitePC',
);
```

## loginClientCredentials
<Badge type="info" text="method" />

```ts
loginClientCredentials(options?: { client?: AuthClientInput } & TokenRequestOptions): Promise<EpicAuthSession>
```

Logs in with the `client_credentials` grant, producing an app-scoped session with no bound account. Note that account-scoped session methods like `me()` will throw on such a session.

**Returns:** `Promise<EpicAuthSession> (not bound to an account)`

```ts
const app = await epic.loginClientCredentials();
console.log(app.accountId); // null
```

## loginWithDeviceAuth
<Badge type="info" text="method" />

```ts
loginWithDeviceAuth(credentials: DeviceAuthCredentials, options?: { client?: AuthClientInput } & TokenRequestOptions): Promise<EpicAuthSession>
```

Logs in with a stored device auth (`device_auth` grant) for silent, reusable authentication. `credentials` requires `accountId`, `deviceId`, and `secret`.

| Parameter | Type | Description |
| --- | --- | --- |
| `credentials` | `DeviceAuthCredentials` | `{ accountId, deviceId, secret }` from a previously created device auth. |
| `options.client` | `AuthClientInput` | Auth client to authenticate against. |

**Returns:** `Promise<EpicAuthSession> bound to the account`

```ts
const session = await epic.loginWithDeviceAuth({
  accountId: 'abc123',
  deviceId: 'def456',
  secret: 'topsecret',
}, { client: 'fortnitePC' });
```

## loginWithExchangeCode
<Badge type="info" text="method" />

```ts
loginWithExchangeCode(code: string, options?: { client?: AuthClientInput; codeVerifier?: string } & TokenRequestOptions): Promise<EpicAuthSession>
```

Logs in with an Epic exchange code (`exchange_code` grant). Optionally pass a PKCE `codeVerifier`.

| Parameter | Type | Description |
| --- | --- | --- |
| `code` | `string` | The exchange code to redeem. |
| `options.codeVerifier` | `string` | PKCE code verifier, if the code was issued with a challenge. |

**Returns:** `Promise<EpicAuthSession>`

```ts
const session = await epic.loginWithExchangeCode('EXCHANGE_CODE_HERE');
```

## loginWithAuthorizationCode
<Badge type="info" text="method" />

```ts
loginWithAuthorizationCode(code: string, options?: { client?: AuthClientInput; codeVerifier?: string } & TokenRequestOptions): Promise<EpicAuthSession>
```

Logs in with an OAuth authorization code (`authorization_code` grant), the code returned from Epic's redirect flow. Optionally pass a PKCE `codeVerifier`.

**Returns:** `Promise<EpicAuthSession>`

```ts
const session = await epic.loginWithAuthorizationCode('AUTH_CODE', {
  codeVerifier: pkceVerifier,
});
```

## loginWithRefreshToken
<Badge type="info" text="method" />

```ts
loginWithRefreshToken(refreshToken: string, options?: { client?: AuthClientInput } & TokenRequestOptions): Promise<EpicAuthSession>
```

Exchanges a stored refresh token for a fresh session (`refresh_token` grant).

**Returns:** `Promise<EpicAuthSession>`

```ts
const session = await epic.loginWithRefreshToken(savedRefreshToken);
```

## startDeviceCode
<Badge type="info" text="method" />

```ts
startDeviceCode(options?: { client?: AuthClientInput }): Promise<DeviceCodeFlow>
```

Begins the device-code flow: obtains an app token via `client_credentials`, creates a device authorization, and returns a `DeviceCodeFlow` carrying the user code and verification URIs. Defaults to the `fortniteNewSwitch` client. Call `flow.poll()` after the user authorizes.

**Returns:** `Promise<DeviceCodeFlow>`

```ts
const flow = await epic.startDeviceCode();
console.log('Open', flow.verificationUriComplete, 'code', flow.userCode);
const session = await flow.poll();
```

::: tip Note
Use this when you want to show the prompt yourself and control polling. For a single call that does both, use `loginWithDeviceCode`.
:::

## loginWithDeviceCode
<Badge type="info" text="method" />

```ts
loginWithDeviceCode(options?: { client?: AuthClientInput; onPrompt?: (flow: DeviceCodeFlow) => void | Promise<void> } & DeviceCodePollOptions): Promise<EpicAuthSession>
```

One-call device-code login: starts the flow, invokes `onPrompt` so you can display the code, then polls until the user authorizes. Accepts all `DeviceCodePollOptions` (`onPending`, `intervalMs`, `maxAttempts`, `expiresAt`, `signal`).

| Parameter | Type | Description |
| --- | --- | --- |
| `options.onPrompt` | `(flow: DeviceCodeFlow) => void \| Promise<void>` | Called once with the flow so you can show the verification URI and user code. |
| `options.onPending` | `(info: DeviceCodePendingInfo) => void` | Called on each poll while authorization is still pending. |

**Returns:** `Promise<EpicAuthSession> once the user authorizes`

```ts
const session = await epic.loginWithDeviceCode({
  onPrompt(flow) {
    console.log('Open', flow.verificationUriComplete);
    console.log('Code', flow.userCode);
  },
  onPending(info) {
    process.stdout.write(`\rwaiting (poll #${info.attempt})...`);
  },
});
console.log('logged in as', session.displayName);
```

## changeClient
<Badge type="info" text="method" />

```ts
changeClient(accessToken: string, toClient: AuthClientInput, options?: TokenRequestOptions & { codeChallenge?: string; codeChallengeMethod?: 'S256' | 'plain' }): Promise<EpicAuthSession>
```

Migrates an existing access token to a different auth client via the exchange-code dance: it calls `auth.createExchangeCode` scoped to the target client's `clientId`, then redeems that code against the target client with `auth.exchangeCode`, returning a new session on `toClient`. Supports optional PKCE (`codeChallenge`, `codeChallengeMethod`).

| Parameter | Type | Description |
| --- | --- | --- |
| `accessToken` | `string` | A valid access token from the source client. |
| `toClient` | `AuthClientInput` | The client to migrate the session to. |

**Returns:** `Promise<EpicAuthSession> on the target client`

```ts
const android = await epic.changeClient(pcSession.accessToken, 'fortniteAndroid');
const deviceAuth = await android.createDeviceAuth();
```

::: tip Note
`EpicAuthSession.switchClient` does the same dance from an existing session instance.
:::
