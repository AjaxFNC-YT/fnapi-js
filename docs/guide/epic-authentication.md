# Epic Authentication

`EpicGamesClient` wraps the Epic Games account service: OAuth grants, token verification, exchange codes, the device-code login flow, and reusable device auths. Every successful login resolves to an **`EpicAuthSession`** that manages the token and exposes account-service calls.

```ts
import { EpicGamesClient } from 'fnapi-js';

const epic = new EpicGamesClient();
```

## Auth clients

Epic OAuth requires a *client* — a `clientId` / `clientSecret` pair identifying the app requesting the token. fnapi-js ships a registry of well-known clients on the exported **`AuthClients`** object (e.g. `fortnitePC`, `fortniteIOS`, `fortniteAndroid`, `fortniteSwitch`, `fortniteNewSwitch`, `launcherApp`, and more).

Anywhere a client is expected you may pass an `AuthClientInput`:

- a registry **key** — `'fortnitePC'`
- a client **name or id** string — resolved against the built-in index
- the client **object** — `AuthClients.fortniteAndroid`
- a fully **custom** client — `{ name: 'my-app', clientId: '...', clientSecret: '...' }`

```ts
await epic.loginClientCredentials({
  client: { name: 'my-app', clientId: 'your-client-id', clientSecret: 'your-secret' },
});
```

An unknown string or a custom client missing a `clientId` throws a `ValidationError`. The default client (when you pass none) is `fortnitePC`.

## Grant types

Each grant has a `loginWith*` convenience method that returns a session:

- **`loginClientCredentials(...)`** — app-only token, not bound to an account.
- **`loginWithDeviceCode(...)`** — interactive browser confirmation (below).
- **`loginWithDeviceAuth(credentials, ...)`** — silent login with saved device-auth credentials.
- **`loginWithExchangeCode(code, ...)`** / **`loginWithAuthorizationCode(code, ...)`** — code-based grants.
- **`loginWithRefreshToken(refreshToken, ...)`** — resume from a refresh token.

For full control, `epic.login((auth, client) => ...)` runs a custom grant callback and wraps the resulting token in a session.

## The device-code login flow

Device code is the recommended way to sign in as a real user without handling their password. `loginWithDeviceCode` starts the flow, hands you a prompt to show the user, and polls until they confirm in the browser.

```ts
const login = await epic.loginWithDeviceCode({
  onPrompt(flow) {
    console.log('To sign in, open this link and confirm the code:');
    console.log(`  ${flow.verificationUriComplete}`);
    console.log(`  code: ${flow.userCode} (expires in ${Math.round(flow.expiresInMs / 1000)}s)`);
  },
  onPending(info) {
    process.stdout.write(`\rwaiting for authorization (poll #${info.attempt})...`);
  },
});

console.log(`logged in as ${login.displayName} (${login.accountId}) via ${login.client.name}`);
```

- **`onPrompt(flow)`** receives a `DeviceCodeFlow` with `userCode`, `verificationUri`, `verificationUriComplete`, `intervalSeconds`, `expiresAt`, and `expiresInMs`. Show `verificationUriComplete` (or the URI + `userCode`) to the user.
- **`onPending(info)`** fires on each poll with `attempt`, `intervalMs`, and `expiresInMs`.

If you need the two steps separately, call `epic.startDeviceCode()` to get the `DeviceCodeFlow`, then `flow.poll()` (session) or `flow.pollForToken()` (raw token). Polling honours the server interval and stops at `expiresAt` or `maxAttempts`.

## The client-switch requirement for device auths

The device-code flow signs in through a *switch* client (`fortniteNewSwitch`) that **cannot create device auths**. To mint reusable credentials you must first move the session to a client that can — typically `fortniteAndroid` — using an exchange code, then call `createDeviceAuth()`.

From a session, **`switchClient(toClient)`** does the exchange-and-relogin for you and returns a new session on the target client:

```ts
const android = await login.switchClient('fortniteAndroid');
console.log(`switched to ${android.client.name} for device-auth permissions`);

const deviceAuth = await android.createDeviceAuth();
console.log('reusable device auth created — save this for silent logins:');
console.log(JSON.stringify(
  { accountId: deviceAuth.accountId, deviceId: deviceAuth.deviceId, secret: deviceAuth.secret },
  null,
  2,
));

await android.logout();
await login.logout();
```

Equivalently, `epic.changeClient(accessToken, toClient)` performs the same exchange starting from a raw access token. Persist the `{ accountId, deviceId, secret }` triple somewhere safe (this project's `config.json` convention fits well) — it is the reusable credential.

## Logging back in later

With saved device-auth credentials you can log in silently on any capable client, with no browser step:

```ts
import { AuthClients, EpicGamesClient } from 'fnapi-js';

const epic = new EpicGamesClient();

const session = await epic.loginWithDeviceAuth(
  {
    accountId: config.epic.accountId,
    deviceId: config.epic.deviceId,
    secret: config.epic.secret,
  },
  { client: AuthClients.fortnitePC },
);

const me = await session.me();
console.log(`logged in as ${me.displayName} (${me.id})`);

await session.ensureValid();
await session.logout();
```

The returned `EpicAuthSession` refreshes itself: `ensureValid()` renews the token when it is close to expiry, and getters like `isExpired`, `expiresAt`, and `canRefresh` let you inspect it. Account-scoped calls (`me`, `createDeviceAuth`, `listDeviceAuths`, `killOtherSessions`) require an account-bound session and throw `ValidationError` on a client-credentials token.

## Reading Epic errors

Account-service failures throw **`EpicApiError`** (or **`EpicAuthError`** for OAuth endpoints). Beyond `status` / `url` / `body`, Epic errors expose `errorCode`, `numericErrorCode`, `messageVars`, and a human-readable **`description`** looked up from the documented Epic error code — handy for surfacing a clear reason to users.

```ts
import { EpicAuthError } from 'fnapi-js';

try {
  await epic.loginWithDeviceAuth(credentials);
} catch (error) {
  if (error instanceof EpicAuthError) {
    console.error(error.errorCode, '-', error.description ?? error.message);
  } else {
    throw error;
  }
}
```

## Custom clients & operations

The bundled auth clients (`AuthClients`, and the wider `ALL_AUTH_CLIENTS`) cover the known Fortnite/Epic game clients. You can still use your **own** `{ clientId, clientSecret }`, and call MCP operations Epic added after this release — but both are gated behind a flag so you never send unexpected credentials or command names by accident. Without the flag, the library throws a `ConfigurationError`.

```ts
import { EpicGamesClient } from 'fnapi-js';

const epic = new EpicGamesClient({
  allowCustomClients: true,        // permit custom { clientId, clientSecret }
  allowCustomMcpOperations: true,  // permit MCP operation names not in MCP_OPERATIONS
});

// now these work:
const session = await epic.loginClientCredentials({
  client: { name: 'my-app', clientId: 'your-id', clientSecret: 'your-secret' },
});
await session.mcpOperation('SomeNewOperationEpicAdded');
```

`allowCustomClients` also governs `session.switchClient(...)` and `client.changeClient(...)`. Built-in clients (by name, by id, or the registry objects) are never gated — only genuinely unknown client objects. Likewise, every operation in [`MCP_OPERATIONS`](/reference/mcp-operations) always works; only unknown operation names need `allowCustomMcpOperations`.
