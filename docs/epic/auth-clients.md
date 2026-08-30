# Auth Clients

The bundled registry of Epic Games OAuth clients. Every grant, token, and Basic-auth request is authenticated as one of these clients. Only clients that carry a `clientSecret` are bundled here, since the secret is required to build the `basic` Authorization header. Pass a client by named key, by client id/name string, or as a fully custom `{ clientId, clientSecret }` object.

## AuthClient
<Badge type="tip" text="interface" />

```ts
interface AuthClient { name: string; clientId: string; clientSecret?: string }
```

Shape of a single OAuth client. `clientSecret` is optional on the type but present on every bundled client because Basic auth (`clientId:clientSecret`) needs it.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | `string` | Epic's human-readable client name, e.g. `fortnitePCGameClient`. |
| `clientId` | `string` | 32-char client id used as the Basic-auth username. |
| `clientSecret` | `string \| undefined` | Client secret used as the Basic-auth password. Present on all bundled clients. |

## AuthClients
<Badge type="warning" text="constant" />

```ts
const AuthClients: Record<AuthClientName, AuthClient>
```

Map of friendly keys to named clients. Keys include `fortnitePC`, `fortniteIOS`, `fortniteIOSEUAppstore`, `fortniteAndroid`, `fortniteSwitch`, `fortniteNewSwitch`, `fortniteXbox`, `fortniteXSX`, `fortniteValkyrie`, `fortniteCN`, `fortnitePS4EU`, `fortnitePS4US`, `kairosPC`, `kairosAndroid`, `kairosIOS`, `launcherApp`, `androidPortal`, `ut`, `utDedicatedServer`.

```ts
import { EpicGamesClient, AuthClients } from 'fnapi-js';

const epic = new EpicGamesClient({ defaultClient: 'fortnitePC' });

const pc = AuthClients.fortnitePC;
console.log(pc.name, pc.clientId);
```

::: tip Note
`fortniteNewSwitch` is required for the device-code flow, and `fortniteAndroid` is required for creating device auths. Use the friendly key directly anywhere an `AuthClientInput` is accepted.
:::

## AuthClientName
<Badge type="info" text="type" />

```ts
type AuthClientName = keyof typeof AuthClients
```

Union of the friendly registry keys (`'fortnitePC' | 'fortniteAndroid' | ...`). Accepted anywhere an `AuthClientInput` is expected.

## ALL_AUTH_CLIENTS
<Badge type="warning" text="constant" />

```ts
const ALL_AUTH_CLIENTS: readonly AuthClient[]
```

Flat array of all 26 secret-bearing clients, including several not in `AuthClients` (e.g. `wexPCGameClient`, `wexAndroidGameClient`, `wexIOSGameClient`, `Among Us`, `Fall Guys`, `Fortnite`, `Diesel - Monomi Park - Slime Rancher`). Backs the lookup index used by `findAuthClient`.

::: tip Note
Only clients with a known secret are listed here, since a secret is mandatory for Basic auth.
:::

## AuthClientInput
<Badge type="info" text="type" />

```ts
type AuthClientInput = AuthClient | AuthClientName | (string & {})
```

Union accepted by every client-taking API: a friendly key, a raw client id or Epic name string, or a full custom `AuthClient` object.

## findAuthClient
<Badge type="tip" text="function" />

```ts
findAuthClient(idOrName: string): AuthClient | null
```

Case-insensitive, trimmed lookup against `ALL_AUTH_CLIENTS` by either `clientId` or `name`. Returns `null` when nothing matches.

| Parameter | Type | Description |
| --- | --- | --- |
| `idOrName` | `string` | A client id or Epic client `name`; whitespace-trimmed and matched case-insensitively. |

**Returns:** `matching AuthClient, or null`

```ts
import { findAuthClient } from 'fnapi-js';

const byId = findAuthClient('ec684b8c687f479fadea3cb2ad83f5c6');
const byName = findAuthClient('fortniteNewSwitchGameClient');
```

## resolveAuthClient
<Badge type="tip" text="function" />

```ts
resolveAuthClient(input: AuthClientInput): AuthClient
```

Normalizes any `AuthClientInput` into a concrete `AuthClient`. Objects are validated (non-empty `clientId` required) and returned as-is; strings are resolved first against `AuthClients` keys, then via `findAuthClient`.

| Parameter | Type | Description |
| --- | --- | --- |
| `input` | `AuthClientInput` | Friendly key, id/name string, or custom `{ clientId, clientSecret }`. |

**Returns:** `resolved AuthClient`

```ts
import { resolveAuthClient } from 'fnapi-js';

const custom = resolveAuthClient({
  name: 'myCustomClient',
  clientId: 'abc123',
  clientSecret: 'shhh',
});

const known = resolveAuthClient('fortniteAndroid');
```

::: tip Note
Throws `ValidationError` when a custom object lacks a `clientId`, when a string matches no known client, or when input is missing.
:::
