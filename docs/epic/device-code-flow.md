# DeviceCodeFlow

Represents an in-progress device-code authorization, returned by `EpicGamesClient.startDeviceCode()`. Carries the user-facing code and verification URIs for display, plus polling helpers that resolve once the user authorizes in a browser. All descriptive fields are read-only.

## userCode
<Badge type="info" text="getter" />

```ts
readonly userCode: string
```

The short code the user enters at the verification page.

**Returns:** `string`

## deviceCode
<Badge type="info" text="getter" />

```ts
readonly deviceCode: string
```

The opaque device code used internally when polling for the token.

**Returns:** `string`

## verificationUri
<Badge type="info" text="getter" />

```ts
readonly verificationUri: string
```

The base URL where the user enters the code.

**Returns:** `string`

## verificationUriComplete
<Badge type="info" text="getter" />

```ts
readonly verificationUriComplete: string
```

The verification URL with the code pre-filled — the friendliest link to show the user.

**Returns:** `string`

## intervalSeconds
<Badge type="info" text="getter" />

```ts
readonly intervalSeconds: number
```

Epic's recommended polling interval in seconds; used as the default `intervalMs` when polling.

**Returns:** `number`

## expiresAt
<Badge type="info" text="getter" />

```ts
readonly expiresAt: Date
```

When the device code expires (computed from `expires_in` at creation).

**Returns:** `Date`

## expiresInMs
<Badge type="info" text="getter" />

```ts
get expiresInMs(): number
```

Milliseconds until the device code expires.

**Returns:** `number`

## isExpired
<Badge type="info" text="getter" />

```ts
get isExpired(): boolean
```

`true` once the device code has expired.

**Returns:** `boolean`

## client
<Badge type="info" text="getter" />

```ts
readonly client: AuthClient
```

The `AuthClient` the resulting session will be bound to.

**Returns:** `AuthClient`

## pollForToken
<Badge type="info" text="method" />

```ts
pollForToken(options?: DeviceCodePollOptions): Promise<OAuthToken>
```

Polls until authorization completes and resolves with the raw `OAuthToken`. Defaults `intervalMs` from `intervalSeconds` and `expiresAt` from the flow; any option you pass overrides those.

**Returns:** `Promise<OAuthToken>`

```ts
const token = await flow.pollForToken({ onPending: (i) => console.log(i.attempt) });
```

## poll
<Badge type="info" text="method" />

```ts
poll(options?: DeviceCodePollOptions): Promise<EpicAuthSession>
```

Polls to completion like `pollForToken`, then wraps the token in an `EpicAuthSession` bound to `client`. The usual way to finish a device-code flow.

**Returns:** `Promise<EpicAuthSession>`

```ts
import { EpicGamesClient } from 'fnapi-js';

const epic = new EpicGamesClient();

const flow = await epic.startDeviceCode();
console.log('To sign in, open this link and confirm the code:');
console.log(`  ${flow.verificationUriComplete}`);
console.log(`  code: ${flow.userCode} (expires in ${Math.round(flow.expiresInMs / 1000)}s)`);

const session = await flow.poll({
  onPending(info) {
    process.stdout.write(`\rwaiting for authorization (poll #${info.attempt})...`);
  },
});

console.log(`\nlogged in as ${session.displayName} (${session.accountId})`);
```

## Polling & callbacks

`poll()` (and `loginWithDeviceCode`) accept `DeviceCodePollOptions` — the same options drive both:

| Option | Type | Description |
| --- | --- | --- |
| `onPrompt` | `(flow) => void` | *(loginWithDeviceCode only)* Called once with the flow so you can show the verification link and code. |
| `onPending` | `(info) => void` | Called on every poll while waiting; `info` has `attempt`, `intervalMs`, `expiresInMs`. |
| `onCanceled` | `(error) => void` | Called when the flow ends **without** authorization — the user declined, or the code expired or gave up — right before the promise rejects with the `EpicAuthError`. |
| `intervalMs` | `number` | Override the poll interval. Defaults to the server's recommended `interval`. |
| `maxAttempts` | `number` | Stop after this many polls. |
| `signal` | `AbortSignal` | Cancel polling; rejects with `AbortError`. |

```ts
const session = await epic.loginWithDeviceCode({
  onPrompt: (flow) => console.log('Open', flow.verificationUriComplete),
  onPending: (info) => process.stdout.write(`\rwaiting (#${info.attempt})`),
  onCanceled: (error) => console.error('login canceled:', error.description ?? error.message),
});
```

### How fast does it poll?

As fast as Epic allows. The device-authorization response includes an `interval` (currently **10 seconds**) and the flow polls at exactly that cadence — the first poll fires immediately, then one per interval. Polling faster than the server interval makes Epic return `slow_down`, which the flow honors by **increasing** the interval by 5 s each time, so going faster actually ends up slower. In short: the default already polls at the maximum safe rate without hitting rate limits. You can still set `intervalMs` to experiment, but values below the server interval risk `slow_down`.
