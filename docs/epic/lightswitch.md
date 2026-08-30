# LightswitchManager

Reads Epic's **Lightswitch** service-status feed — whether Fortnite is up, in maintenance, or your account is service-banned. Exposed as `client.lightswitch` on `EpicGamesClient` and mirrored with `serviceStatus*` convenience methods on a live `EpicAuthSession`. Every method requires a bearer token.

```ts
import { EpicGamesClient } from 'fnapi-js';

const epic = new EpicGamesClient();
const session = await epic.loginWithDeviceAuth(creds);

const status = await session.serviceStatus();
console.log(status.status, status.message ?? '');
if (status.banned) console.log('account is service-banned');
```

::: tip Service id
Calls default to the `Fortnite` service. Override per-call with the `serviceId` argument, or construct `new LightswitchManager(rest, bulkRest, { serviceId })` for a different default. The bulk endpoint lives on a separate host (`LIGHTSWITCH_BULK_BASE_URL`).
:::

## lightswitch.status
<Badge type="info" text="method" />

```ts
status(accessToken: string, serviceId?: string, options?: LightswitchOptions): Promise<LightswitchStatus>
```

Fetches the status of a single service.

| Parameter | Type | Description |
| --- | --- | --- |
| `accessToken` | `string` | Bearer token. |
| `serviceId` | `string` | Service to query (defaults to `Fortnite`). |
| `options.signal` | `AbortSignal` | Optional abort signal. |

**Returns:** `Promise<LightswitchStatus>` · **Session:** `session.serviceStatus(serviceId?)`

## lightswitch.statusBulk
<Badge type="info" text="method" />

```ts
statusBulk(accessToken: string, serviceIds: string[], options?: LightswitchOptions): Promise<LightswitchStatus[]>
```

Fetches the status of several services in one call, via the bulk host. The `serviceIds` array must be non-empty and serializes as repeated `serviceId` query params.

**Returns:** `Promise<LightswitchStatus[]>` · **Session:** `session.serviceStatusBulk(serviceIds)`

::: tip Note
Throws `ValidationError` when the array is empty.
:::

## Types
<Badge type="tip" text="interface" />

```ts
interface LightswitchStatus {
  serviceInstanceId: string;
  status: string;
  message?: string;
  maintenanceUri?: string | null;
  overrideCatalogIds?: string[];
  allowedActions?: string[];
  banned?: boolean;
  launcherInfoDTO?: LightswitchLauncherInfo;
}

interface LightswitchLauncherInfo {
  appName?: string;
  catalogItemId?: string;
  namespace?: string;
}

interface LightswitchOptions {
  signal?: AbortSignal;
}
```

`status` is typically `UP` or `DOWN`. `LIGHTSWITCH_BASE_URL`, `LIGHTSWITCH_BULK_BASE_URL`, and `LIGHTSWITCH_SERVICE_ID` are exported for advanced use.
