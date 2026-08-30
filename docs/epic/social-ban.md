# SocialBanManager

Reads Epic's dedicated **social-ban** service (`social-ban-public-service-prod`) — the record of active social bans and warnings on an account (chat, party, and social-feature suspensions). Exposed as `client.socialBan` on `EpicGamesClient` and mirrored with `session.socialBan()` on a live `EpicAuthSession`. It also backs the `social` signal in [`session.checkBan()`](/epic/session#matchmaking). Every method requires a bearer token.

```ts
import { EpicGamesClient } from 'fnapi-js';

const epic = new EpicGamesClient();
const session = await epic.loginWithDeviceAuth(creds);

const status = await session.socialBan();
if (status.active) console.log(status.bans, status.warnings);
```

## socialBan.status
<Badge type="info" text="method" />

```ts
status(accessToken: string, accountId: string, options?: SocialBanOptions): Promise<SocialBanStatus>
```

Fetches the social-ban record for an account.

| Parameter | Type | Description |
| --- | --- | --- |
| `accessToken` | `string` | Bearer token. |
| `accountId` | `string` | Account to query. |
| `options.signal` | `AbortSignal` | Optional abort signal. |

**Returns:** `Promise<SocialBanStatus>` · **Session:** `session.socialBan(accountId?)`

## Types
<Badge type="tip" text="interface" />

```ts
interface SocialBanStatus {
  active: boolean;
  bans: SocialBanEntry[];
  warnings: SocialBanEntry[];
}

interface SocialBanEntry {
  [key: string]: unknown;
}

interface SocialBanOptions {
  signal?: AbortSignal;
}
```

`active` is `true` when the `bans` array is non-empty. The service returns `{ bans: [], warnings: [] }` for a clean account, and may reply with an empty `204` body — both are normalised to empty arrays. Ban and warning entries are typed permissively (`{ [key: string]: unknown }`) because Epic does not publish a schema for populated records. `SOCIAL_BAN_BASE_URL` is exported for advanced use.
