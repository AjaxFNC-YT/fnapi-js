# Islands (Content Service)

UEFN islands are published through Epic's content service (`content-service.bfda`). The session wraps the three calls that matter — the cooked package for an island code, its AES key, and launching it on the account — and handles the parts that usually trip people up: the service only accepts a **Valkyrie (UEFN) client** token, the package lookup needs the **client build** major / minor / changelist, and the key comes back base64 while every tool wants hex.

```ts
const session = await epic.loginWithDeviceAuth(creds);

const keys = await session.islandKeys('7865-8305-9184');
console.log(keys[0]?.guid, keys[0]?.key); // 92431145-... 0x2F7A955B...
```

::: tip No setup
The Valkyrie token is minted from the session through an exchange code and cached like the launcher token. The build is read from the launcher's live Fortnite build (cached for five minutes) — the CL the server reports at `/fortnite/api/version` is a different number and the content service rejects it.
:::

## session.islandPackage
<Badge type="info" text="method" />

```ts
islandPackage(linkCode: string, options?: CookedPackageOptions & { build?: { major; minor; changelist } }): Promise<CookedContentPackage>
```

Returns the v4 cooked content package: `status`, `projectId`, `projectFlags` (title, owner, `liveLink` with its version and publish date), every `content` module with its `binaryVersion` and plugin URIs, `isEncrypted`, and `resolved.root` — the module id and version the key belongs to. `options.platform` (default `windows`) and `options.role` (default `client`) pass through; `options.build` skips the launcher lookup.

## session.islandKeys
<Badge type="info" text="method" />

```ts
islandKeys(linkCode: string, options?): Promise<IslandKey[]>
```

Fetches the package and, if it is encrypted, posts the root module to `module/key/batch`. Each `IslandKey` has `moduleId`, `version`, `guid`, the raw `keyBase64` and `key` — the same key as `0x`-prefixed upper-case hex, ready for FModel or CUE4Parse. An unencrypted island returns `[]`.

## session.launchIsland
<Badge type="info" text="method" />

```ts
launchIsland(linkCode: string, options?: { signal?: AbortSignal }): Promise<IslandLaunchResult>
```

Sends the island to the account's game client. `status` is `notified` when Fortnite is running and switched to it, or `queued` when it will load on the next launch.

## ContentServiceManager
<Badge type="tip" text="class" />

`epic.contentService` exposes the raw calls for your own Valkyrie token: `cookedPackage(token, linkCode, build, options?)`, `moduleKeys(token, modules)` and `launch(token, linkCode)`. The helpers `parseFortniteBuild(buildVersion)`, `contentKeyToHex(base64)` and `toIslandKey(entry)` are exported too.
