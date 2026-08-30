# AuthManager

The low-level OAuth grant layer, reachable as `epic.auth`. Every method maps directly to an Epic account-service `oauth` endpoint and returns raw transport types (`OAuthToken`, `VerifyResponse`, `ExchangeCode`, `DeviceCode`). Each grant takes a resolved `AuthClient` as its first argument. String parameters are validated and throw `ValidationError` when empty.

## token
<Badge type="info" text="method" />

```ts
token(client: AuthClient, grantType: GrantType, fields: Record<string, string | undefined>, options?: TokenRequestOptions): Promise<OAuthToken>
```

The generic token request that every grant helper delegates to. Builds the OAuth form (`grant_type` plus `fields`), applies `TokenRequestOptions` (`tokenType`, `includePerms`, `deploymentId`, `deviceId`, `scope`), and POSTs to `/account/api/oauth/token` with the client's basic auth.

**Returns:** `Promise<OAuthToken>`

```ts
const token = await epic.auth.token(epic.client(), 'client_credentials', {});
```

## clientCredentials
<Badge type="info" text="method" />

```ts
clientCredentials(client: AuthClient, options?: TokenRequestOptions): Promise<OAuthToken>
```

Requests an app-scoped token with the `client_credentials` grant. No account is bound.

**Returns:** `Promise<OAuthToken>`

```ts
const appToken = await epic.auth.clientCredentials(epic.client());
```

## authorizationCode
<Badge type="info" text="method" />

```ts
authorizationCode(client: AuthClient, code: string, options?: TokenRequestOptions & { codeVerifier?: string }): Promise<OAuthToken>
```

Redeems an OAuth authorization code (`authorization_code` grant). Optional PKCE `codeVerifier` is sent as `code_verifier`.

**Returns:** `Promise<OAuthToken>`

```ts
const token = await epic.auth.authorizationCode(epic.client(), 'AUTH_CODE');
```

## exchangeCode
<Badge type="info" text="method" />

```ts
exchangeCode(client: AuthClient, code: string, options?: TokenRequestOptions & { codeVerifier?: string }): Promise<OAuthToken>
```

Redeems an exchange code (`exchange_code` grant), sent as `exchange_code`. Optional PKCE `codeVerifier`.

**Returns:** `Promise<OAuthToken>`

```ts
const token = await epic.auth.exchangeCode(epic.client(), exchange.code);
```

## deviceAuth
<Badge type="info" text="method" />

```ts
deviceAuth(client: AuthClient, credentials: DeviceAuthCredentials, options?: TokenRequestOptions): Promise<OAuthToken>
```

Authenticates with a stored device auth (`device_auth` grant). Validates and sends `account_id`, `device_id`, and `secret`.

**Returns:** `Promise<OAuthToken>`

```ts
const token = await epic.auth.deviceAuth(epic.client(), {
  accountId, deviceId, secret,
});
```

## deviceCode
<Badge type="info" text="method" />

```ts
deviceCode(client: AuthClient, deviceCode: string, options?: TokenRequestOptions): Promise<OAuthToken>
```

Attempts a single `device_code` grant exchange for the given device code. Throws while the user has not yet authorized — use `pollDeviceCode` to retry.

**Returns:** `Promise<OAuthToken>`

```ts
const token = await epic.auth.deviceCode(epic.client(), flow.deviceCode);
```

## pollDeviceCode
<Badge type="info" text="method" />

```ts
pollDeviceCode(client: AuthClient, deviceCode: string, options?: DeviceCodePollOptions): Promise<OAuthToken>
```

Repeatedly calls `deviceCode` until the user authorizes, honoring `authorization_pending`/`slow_down` (adds 5s on slow-down). Respects `intervalMs`, `maxAttempts`, `expiresAt`, `signal`, and fires `onPending` between attempts. Throws `AbortError` on abort and an expiry `EpicAuthError` past `expiresAt`.

**Returns:** `Promise<OAuthToken> once authorized`

```ts
const token = await epic.auth.pollDeviceCode(epic.client(), flow.deviceCode, {
  expiresAt: flow.expiresAt,
  onPending: (info) => console.log('poll', info.attempt),
});
```

## refreshToken
<Badge type="info" text="method" />

```ts
refreshToken(client: AuthClient, refreshToken: string, options?: TokenRequestOptions): Promise<OAuthToken>
```

Exchanges a refresh token for a new token (`refresh_token` grant).

**Returns:** `Promise<OAuthToken>`

```ts
const token = await epic.auth.refreshToken(epic.client(), savedRefresh);
```

## continuationToken
<Badge type="info" text="method" />

```ts
continuationToken(client: AuthClient, continuationToken: string, options?: TokenRequestOptions): Promise<OAuthToken>
```

Completes a multi-step login with the `continuation_token` grant (e.g. after an MFA challenge).

**Returns:** `Promise<OAuthToken>`

```ts
const token = await epic.auth.continuationToken(epic.client(), continuation);
```

## password
<Badge type="info" text="method" />

```ts
password(client: AuthClient, username: string, passwordValue: string, options?: TokenRequestOptions): Promise<OAuthToken>
```

Direct `password` grant with username and password. Rarely permitted by Epic clients; both fields are validated as non-empty.

**Returns:** `Promise<OAuthToken>`

```ts
const token = await epic.auth.password(epic.client(), 'user@example.com', 'pw');
```

## otp
<Badge type="info" text="method" />

```ts
otp(client: AuthClient, otp: string, challenge: string, options?: TokenRequestOptions): Promise<OAuthToken>
```

Completes an MFA/OTP step with the `otp` grant, sending the one-time code and its `challenge`.

**Returns:** `Promise<OAuthToken>`

```ts
const token = await epic.auth.otp(epic.client(), '123456', challengeId);
```

## verify
<Badge type="info" text="method" />

```ts
verify(accessToken: string, options?: { includePerms?: boolean; signal?: AbortSignal }): Promise<VerifyResponse>
```

GETs `/account/api/oauth/verify` to validate an access token and inspect its metadata (account, client, expiry, and optionally `perms`).

**Returns:** `Promise<VerifyResponse>`

```ts
const info = await epic.auth.verify(session.accessToken, { includePerms: true });
```

## createExchangeCode
<Badge type="info" text="method" />

```ts
createExchangeCode(accessToken: string, options?: ExchangeCodeOptions): Promise<ExchangeCode>
```

GETs `/account/api/oauth/exchange` to mint an exchange code from an existing access token. `ExchangeCodeOptions` supports `consumingClientId`, `codeChallenge`, and `codeChallengeMethod` — the basis of client-switching.

**Returns:** `Promise<ExchangeCode>`

```ts
const exchange = await epic.auth.createExchangeCode(session.accessToken, {
  consumingClientId: epic.client('fortniteAndroid').clientId,
});
```

## createDeviceCode
<Badge type="info" text="method" />

```ts
createDeviceCode(clientAccessToken: string, options?: { signal?: AbortSignal }): Promise<DeviceCode>
```

POSTs `/account/api/oauth/deviceAuthorization` (with `prompt=login`) using an app token to begin a device-code flow, returning the user code and verification URIs.

**Returns:** `Promise<DeviceCode>`

```ts
const app = await epic.auth.clientCredentials(epic.client());
const device = await epic.auth.createDeviceCode(app.access_token);
```

## deleteDeviceCode
<Badge type="info" text="method" />

```ts
deleteDeviceCode(clientAccessToken: string, userCode: string, options?: { signal?: AbortSignal }): Promise<void>
```

DELETEs a pending device authorization by its user code, cancelling an in-progress device-code flow.

**Returns:** `Promise<void>`

```ts
await epic.auth.deleteDeviceCode(app.access_token, flow.userCode);
```

## killSession
<Badge type="info" text="method" />

```ts
killSession(accessToken: string, options?: { killAllWithSameSource?: boolean; signal?: AbortSignal }): Promise<void>
```

DELETEs the session identified by the access token (logout). Set `killAllWithSameSource` to also revoke sessions sharing the same source.

**Returns:** `Promise<void>`

```ts
await epic.auth.killSession(session.accessToken);
```

## killSessions
<Badge type="info" text="method" />

```ts
killSessions(accessToken: string, killType: KillType, options?: { signal?: AbortSignal }): Promise<void>
```

Bulk-revokes sessions by `KillType` (e.g. `'OTHERS_ACCOUNT_CLIENT_SERVICE'`, `'OTHERS'`, `'ALL'`).

**Returns:** `Promise<void>`

```ts
await epic.auth.killSessions(session.accessToken, 'OTHERS');
```
