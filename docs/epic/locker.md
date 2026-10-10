# Locker

The `Locker` drives a signed-in player's locker through Epic's **EOS Locker Service** (`locker/v4`), which is the same system the game uses. It reads every owned cosmetic and the equipped loadout across every section: character, emotes, wraps, banner and lobby, Festival instruments and jam tracks, cars, companions and moments. It equips items with styles and colours, and manages saved presets.

On its own it returns the ids Epic stores. Pass it the [`FortniteAPI`](/fortnite/fortnite-api) cosmetics source and set `enrich` to resolve each item to full cosmetic data **and its image link**.

```ts
import { EpicGamesClient, FortniteAPI, Locker } from 'fnapi-js';

const epic = new EpicGamesClient();
const fortnite = new FortniteAPI({ cache: { enabled: true } });

const session = await epic.loginWithDeviceAuth(creds);
const locker = new Locker(session, fortnite.cosmetics);

const snapshot = await locker.fetch({ enrich: true });
console.log(`${snapshot.items.length} cosmetics owned`);
console.log('equipped skin:', snapshot.loadout.character?.name);
console.log('image:', snapshot.loadout.character?.imageUrl);

await locker.equipEmote('EID_Floss', 0);
await locker.equipWrap('Wrap_121_JupiterZero');
```

::: info Session requirements
Every call authenticates with EOS Connect under the hood, through `session.eosToken()`, which caches the token. That requires an account-bound session such as device auth or device code, not `client_credentials`.
:::

::: tip Enrichment is opt-in
Without a cosmetics source, or with `enrich` left off, items come back with `name`, `cosmetic` and `imageUrl` set to `null`. Requesting `enrich: true` **without** a source throws a `ValidationError`. The source is fetched once and cached on the locker.
:::

## new Locker
<Badge type="tip" text="class" />

```ts
new Locker(session: EpicAuthSession, cosmetics?: LockerCosmeticSource)
```

| Parameter | Type | Description |
| --- | --- | --- |
| `session` | `EpicAuthSession` | An account-bound session. |
| `cosmetics` | `LockerCosmeticSource` | Anything with an `all()` that returns every cosmetic. Pass `client.cosmetics`. Only needed for enrichment. |

## fetch
<Badge type="info" text="method" />

```ts
fetch(options?: { enrich?: boolean; items?: boolean; signal?: AbortSignal }): Promise<LockerSnapshot>
```

Reads the locker and returns `{ accountId, items, loadout, presets, schemaPresets }`:

- `items` holds every owned cosmetic. It is paged out of `cosmetic-data`, which takes about 3 requests for a large locker.
- `loadout` is the active loadout group.
- `presets` holds the saved full-locker presets.
- `schemaPresets` holds the older per-section presets, sorted by index.

Pass `items: false` to skip the cosmetic list when you only need the loadout.

```ts
const { items, loadout, presets } = await locker.fetch({ enrich: true });
```

## items / loadout / presets
<Badge type="info" text="method" />

```ts
items(options?: { enrich?: boolean; signal?: AbortSignal }): Promise<LockerItem[]>
loadout(options?: { enrich?: boolean; signal?: AbortSignal }): Promise<LockerLoadout>
presets(signal?: AbortSignal): Promise<LockerPreset[]>
```

These are shortcuts that make only the requests they need.

## resolveImage
<Badge type="info" text="method" />

```ts
resolveImage(cosmeticId: string): Promise<string | null>
```

Looks a cosmetic id up in the cosmetics source and returns its image link. Accepts a bare id or `Type:id`.

## Equipping

Every edit reads the current active loadout group, changes only the targeted slots, and `PUT`s the whole group back. Other sections are never touched. Edits made through one `Locker` run one after another, so concurrent calls cannot overwrite each other. Each edit resolves to the updated `LockerLoadout`.

Item ids may be bare (`'CID_028_Athena_Commando_F'`) or full template ids (`'AthenaCharacter:cid_028_athena_commando_f'`). Bare ids get the slot's item type, and ids are lowercased the way the service stores them.

### equip / equipMany
<Badge type="info" text="method" />

```ts
equip(slot: LockerSlotName, item: string | null, options?: { variants?: LockerVariantSelection[]; signal?: AbortSignal }): Promise<LockerLoadout>
equipMany(changes: LockerChanges, signal?: AbortSignal): Promise<LockerLoadout>
```

The generic form behind every helper. `null` empties the slot. When the same item is re-equipped without `variants`, its current styles are kept. A new item starts with no styles unless you pass some.

```ts
await locker.equipMany({
  character: { item: 'CID_028_Athena_Commando_F', variants: [{ channel: 'Material', variant: 'Mat2' }] },
  pickaxe: 'DefaultPickaxe',
  emote0: 'EID_Floss',
  carBody: 'VehicleCosmetics_Body:carbody_alokin',
});
```

### Helpers
<Badge type="info" text="method" />

| Method | Slot |
| --- | --- |
| `equipOutfit(id, options?)` | `character` |
| `equipBackpack(id, options?)` | `backpack` |
| `equipPickaxe(id, options?)` | `pickaxe` |
| `equipGlider(id, options?)` | `glider` |
| `equipContrail(id, options?)` | `contrail` |
| `equipShoes(id, options?)` | `shoes` |
| `equipAura(id, options?)` | `aura` |
| `equipEmote(id, index = 0, options?)` | `emote0`–`emote7` |
| `equipWrap(id, index?, options?)` | `wrap0`–`wrap6`; no index wraps every slot |
| `equipJamTrack(id, index = 0, options?)` | `jamTrack0`–`jamTrack7` |
| `equipInstrument(kind, id, options?)` | `bass`, `guitar`, `drums`, `keyboard`, `microphone` |
| `equipLoadingScreen(id, options?)` | `loadingScreen` |
| `equipLobbyMusic(id, options?)` | `lobbyMusic` (`sid_…` ids become `SparksSong`, others `AthenaMusicPack`) |
| `equipCompanion(id, options?)` | `companion` |
| `setBanner(icon, color, signal?)` | `bannerIcon` + `bannerColor` |
| `clear(slot, signal?)` | empties any slot |

Car and SUV parts (`carBody`, `carSkin`, `carWheels`, `carDriftTrail`, `carBooster`, and the same with `suv…`) go through `equip`. The `carMacaron`, `carZest`, `suvMacaron` and `suvZest` slots need a full template id.

### setVariants
<Badge type="info" text="method" />

```ts
setVariants(slot: LockerSlotName, variants: LockerVariantSelection[], signal?: AbortSignal): Promise<LockerLoadout>
```

Changes styles on the equipped item and keeps it in place. Each `channel` replaces that channel and the other channels are kept.

```ts
await locker.setVariants('character', [{ channel: 'Progressive', variant: 'Stage3' }]);
```

### setColor
<Badge type="info" text="method" />

```ts
setColor(slot: LockerSlotName, color: string | RichColor, signal?: AbortSignal): Promise<LockerLoadout>
```

Recolours every RichColor channel on the equipped item, such as a custom umbrella or a car body paint. `color` can be any of these:

- `#RGB`, `#RRGGBB` or `#RRGGBBAA`
- `{ r, g, b, a }` with values from 0 to 1
- a raw 32-digit RichColor value

It throws a `ValidationError` when the equipped item has no colour channel.

::: warning Palettes
Some items only accept certain colours, and the service snaps any other value to its nearest allowed swatch. Read the returned loadout to see what was actually stored.
:::

`encodeRichColor(color)` and `decodeRichColor(additionalData)` are exported for working with these values directly. RichColor data is four big-endian float32 values (RGBA).

### restore
<Badge type="info" text="method" />

```ts
restore(loadout: LockerLoadout | { loadouts: Record<string, LockerSchemaLoadout> }, signal?: AbortSignal): Promise<LockerLoadout>
```

Puts a previously read loadout back exactly as it was. This is handy for "try it on" features:

```ts
const before = await locker.loadout();
await locker.equipOutfit('CID_028_Athena_Commando_F');
await locker.restore(before);
```

## Presets

These are the full-locker presets shown in the game's preset menu (`loadout-group-preset`).

```ts
savePreset(name: string, options?: { loadouts?: Record<string, LockerSchemaLoadout>; signal?: AbortSignal }): Promise<LockerPreset>
updatePreset(presetId: string, update: { name?: string; loadouts?: Record<string, LockerSchemaLoadout> | 'current' }, signal?: AbortSignal): Promise<LockerPreset>
renamePreset(presetId: string, name: string, signal?: AbortSignal): Promise<LockerPreset>
applyPreset(presetId: string, signal?: AbortSignal): Promise<LockerLoadout>
deletePreset(presetId: string, signal?: AbortSignal): Promise<void>
```

- `savePreset` saves the current loadout, or the `loadouts` you pass, as a new preset.
- `updatePreset` changes a preset's name or contents. Pass `loadouts: 'current'` to overwrite it with what is equipped now.
- `applyPreset` equips the preset and marks it as the active one.
- `updatePreset`, `renamePreset` and `applyPreset` accept a preset id or its exact name.

```ts
const preset = await locker.savePreset('Tryhard');
await locker.renamePreset(preset.id, 'Sweaty');
await locker.applyPreset('Sweaty');
await locker.deletePreset(preset.id);
```

## Item actions

### setCompanionName
<Badge type="info" text="method" />

```ts
setCompanionName(item: LockerItem | string, name: string, signal?: AbortSignal): Promise<void>
```

Renames an owned companion. `item` is a `LockerItem`, a cosmetic id, a template id or the item guid.

### lockInItem
<Badge type="info" text="method" />

```ts
lockInItem(item: LockerItem | string, variants: Record<string, { variantTag: string; additionalData?: string }>, signal?: AbortSignal): Promise<void>
```

Permanently locks the styles in on an immutable item, such as a companion's colours. This cannot be undone.

### setFavorite / markSeen
<Badge type="info" text="method" />

```ts
setFavorite(itemIds: string[], favorite?: boolean, signal?: AbortSignal): Promise<MCPResponse>
markSeen(itemIds: string[], signal?: AbortSignal): Promise<MCPResponse>
```

These take item guids (`LockerItem.id`). The locker service has no endpoint for them, so they still go through the `athena` MCP profile.

## Types

### LockerItem

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Item guid. |
| `templateId` | `string` | e.g. `AthenaCharacter:cid_028_athena_commando_f`. |
| `type` / `cosmeticId` | `string` | The two halves of `templateId`. |
| `favorite` / `seen` | `boolean` | Favourited, and whether the item has been seen. |
| `lockedIn` | `boolean \| null` | Lock-in state for immutable items. |
| `variants` | `LockerVariant[]` | `{ channel, active, activeData, owned }` per style channel. |
| `createdAt` / `updatedAt` | `string \| null` | ISO timestamps. |
| `name` / `cosmetic` / `imageUrl` | | Filled in by enrichment. |

### LockerLoadout

These named sections hold a `LockerEquippedItem` or `null`:

- `character`, `backpack`, `pickaxe`, `glider`, `contrail`, `shoes`, `aura`
- `emotes` (8 entries), `wraps` (7) and `jamTracks` (8)
- `banner.icon`, `banner.color`, `lobbyMusic`, `loadingScreen`
- `instruments.{bass,guitar,drums,keyboard,microphone}`
- `car` and `suv`, each with `{ body, skin, wheels, driftTrail, booster, macaron, zest }`
- `companion`, `moments.bus`, `moments.victory`

It also has these fields:

| Field | Description |
| --- | --- |
| `slots` | Every equipped item keyed by `LockerSlotName`. |
| `other` | Items in slots this version does not know yet, so new sections still show up. |
| `shuffle` | Shuffle mode per schema. |
| `presetId` | The active preset id, if one is equipped. |
| `group` | The raw active loadout group. |

`LockerEquippedItem` is `{ slot, schema, slotTemplate, templateId, type, cosmeticId, resolvedTemplateId, variants, name, cosmetic, imageUrl }`. `resolvedTemplateId` is the item the game picked for a "random" slot.

### LockerSchema / LOCKER_SLOTS

`LockerSchema` names the ten loadout schemas, such as `LockerSchema.character` (`CosmeticLoadout:LoadoutSchema_Character`). `LOCKER_SLOTS` maps every `LockerSlotName` to its `{ schema, slotTemplate, itemType }`.

## Raw session calls

The locker is built on these `EpicAuthSession` methods, which you can also call directly:

- `lockerItems()`
- `lockerCosmeticPage({ limit, nextToken })`
- `lockerCosmetics()`
- `setActiveLoadoutGroup(group)`
- `putLoadoutGroupPreset(id, preset)`
- `updateLoadoutGroupPreset(id, preset)`
- `deleteLoadoutGroupPreset(id)`
- `setCompanionName(cosmeticItemId, name)`
- `lockInImmutableItem(itemIdentifier, variants)`
