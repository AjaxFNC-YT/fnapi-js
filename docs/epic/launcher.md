# Launcher & Build Info

Everything needed to watch Fortnite builds: the server version, the live client build from the launcher, platform assets with their manifests, and the launcher installers.

```ts
const version = await epic.game.version();
console.log(version.version, version.cln);

const session = await epic.loginWithDeviceAuth(creds);
const build = await session.fortniteBuild();
console.log(build.version, build.changelist, build.buildVersion);
```

## game.version
<Badge type="info" text="method" />

```ts
epic.game.version(options?: { signal?: AbortSignal }): Promise<FortniteVersion>
session.fortniteVersion(options?): Promise<FortniteVersion>
```

`/fortnite/api/version` — no login. Returns the **server** build: `version` (`42.30`), `cln`, `build`, `branch`, `buildDate`, `serverDate` and `moduleName`. The server changelist is usually ahead of the client build; use `fortniteBuild` when you need the version players actually download.

## session.fortniteBuild
<Badge type="info" text="method" />

```ts
fortniteBuild(options?: LauncherBuildOptions): Promise<FortniteBuild>
```

Reads the live Windows build from the launcher and parses it into `{ buildVersion, version, major, minor, changelist, branch }`. Cached for five minutes; pass `cache: false` to bypass.

## session.launcherBuild / session.launcherAssets
<Badge type="info" text="method" />

```ts
launcherBuild(options?: LauncherBuildOptions): Promise<LauncherBuild>
launcherAssets(options?: { platform?; namespace?; label?; signal?; cache? }): Promise<LauncherAsset[]>
```

`launcherBuild` returns the v2 build elements for an app — `buildVersion`, `hash`, `labelName` and the signed `manifests` (CDN uri plus token query params). `LauncherBuildOptions`: `platform` (default `Windows`), `namespace` (`fn`), `catalogItemId` (Fortnite's `4fe75bbc5a674f4f9b356b5c90567da5`), `appName` (`Fortnite`), `label` (`Live`), `signal`, `cache`. `launcherAssets` lists every app in a namespace on a platform with its current `buildVersion`.

Both need a launcherApp token, which the session mints and caches for you. `epic.launcher` exposes the same calls for your own token.

## session.fortniteApk
<Badge type="info" text="method" />

```ts
fortniteApk(options?: Omit<LauncherBuildOptions, 'platform'>): Promise<LauncherApk>
```

The direct Fortnite APK for the live Android build: `{ buildVersion, manifestId, url, sizeBytes }`, where `url` is `https://epicgames-download1.akamaized.net/Builds/Fortnite/Apk/<manifestId>.apk`. `apkFromBuild(element)` derives the same from any Android build element. There is no iOS equivalent — Epic answers `download_info_not_found` for an iOS app binary.

## Platforms and device profiles

`launcherBuild` uses `GET` unless a device profile is given. Android only answers to a `POST` describing the device (`compatible_build_not_found` otherwise), so `platform: 'Android'` sends the built-in `ANDROID_DEVICE_PROFILE` automatically; pass `device` to send your own. iOS has no downloadable build on this endpoint.

## session.launcherAsset
<Badge type="info" text="method" />

```ts
launcherAsset(options?: { platform?; catalogItemId?; appName?; label?; signal?; cache? }): Promise<LauncherAppAsset>
```

The v1 single-app endpoint (`/launcher/api/public/assets/{platform}/{catalogItemId}/{appName}`). It returns one object — `buildVersion`, `expires` and `items` keyed by `MANIFEST` / `CHUNKS`, each with `distribution`, `path`, `signature`, optional `hash` and `additionalDistributions`. It answers for Windows and Switch; Mac, iOS and Android return 404 here with a launcher token.

## launcher.installer
<Badge type="info" text="method" />

```ts
epic.launcher.installer(app: LauncherInstaller | string): Promise<LauncherInstallerDownload>
epic.launcher.installerUrl(app: LauncherInstaller | string): string
```

No login. `installer` follows Epic's redirect without downloading and returns the real file `url` and `fileName`; `installerUrl` builds the redirecting API url. `LauncherInstaller` lists the known apps: `LauncherWindows`, `LauncherMac`, `UnrealEngineWindows`, `UnrealEngineMac`, `EpicGamesStoreAndroid` (the Epic Games Store app — for the Fortnite APK use [`fortniteApk`](#session-fortniteapk)) and `BuildPatchTool`.
