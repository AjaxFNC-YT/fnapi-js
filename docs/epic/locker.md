# Locker

The `Locker` reads a signed-in player's cosmetics from the `athena` MCP profile — every owned outfit, back bling, pickaxe, glider, emote, wrap and more, plus the currently equipped loadout. On its own it returns the raw item ids Epic stores. Pass it our [`FortniteAPI`](/fortnite/fortnite-api) cosmetics source and flip the `enrich` flag, and it resolves each item to full cosmetic data **and the image link** from fortnite-api.com.

It is a bridge between the two clients, so you construct it with an account-bound `EpicAuthSession` (for the profile) and, optionally, a cosmetics source (for enrichment):

```ts
import { EpicGamesClient, FortniteAPI, Locker } from 'fnapi-js';

const epic = new EpicGamesClient();
const fortnite = new FortniteAPI({ cache: { enabled: true } });

const session = await epic.loginWithDeviceAuth(creds);
const locker = new Locker(session, fortnite.cosmetics);

const snapshot = await locker.fetch({ enrich: true });
console.log(`${snapshot.items.length} cosmetics owned`);
console.log('equipped skin:', snapshot.loadout.character?.cosmetic?.name);
console.log('image:', snapshot.loadout.character?.imageUrl);
```

::: tip Enrichment is opt-in
Without a cosmetics source (or with `enrich` left off), items come back with `cosmetic: null` and `imageUrl: null` — just the raw locker data. Requesting `enrich: true` **without** a source throws a `ValidationError`. The source is fetched once and cached on the locker.
:::

::: info Equipped loadout & the EOS Locker Service
Epic migrated the equipped loadout out of the `athena` MCP profile into a dedicated **EOS Locker Service**. When the `athena` profile no longer carries an equipped character, the locker transparently authenticates with EOS Connect and reads the active loadout group from `locker/v4` to fill `snapshot.loadout`. This is automatic; pass `useLockerService: false` to `fetch` to disable it and use only what the MCP profile reports. It needs an account-bound session (device auth / device code), not `client_credentials`.
:::

## new Locker
<Badge type="tip" text="class" />

```ts
new Locker(session: EpicAuthSession, cosmetics?: LockerCosmeticSource)
```

| Parameter | Type | Description |
| --- | --- | --- |
| `session` | `EpicAuthSession` | An account-bound session. Its token is used to query the `athena` profile. |
| `cosmetics` | `LockerCosmeticSource` | Anything with an `all()` returning every cosmetic — pass `client.cosmetics`. Required only for enrichment. |

## fetch
<Badge type="info" text="method" />

```ts
fetch(options?: { enrich?: boolean; useLockerService?: boolean; signal?: AbortSignal }): Promise<LockerSnapshot>
```

Queries the `athena` profile and returns a `LockerSnapshot` — `{ accountId, profileRevision, items, loadout }`. With `enrich: true`, every item and every equipped slot gets its `cosmetic` and `imageUrl` filled in. If the profile has no equipped loadout, the EOS Locker Service is queried to fill it (see the note above); set `useLockerService: false` to skip that.

**Returns:** `Promise<LockerSnapshot>`

```ts
const { items, loadout } = await locker.fetch({ enrich: true });
```

## items / loadout
<Badge type="info" text="method" />

```ts
items(options?): Promise<LockerItem[]>
loadout(options?): Promise<LockerLoadout>
```

Shortcuts that return just the owned items or just the equipped loadout. Both accept the same options as `fetch`.

## resolveImage
<Badge type="info" text="method" />

```ts
resolveImage(cosmeticId: string): Promise<string | null>
```

Resolves the image link for a single cosmetic id straight from the cosmetics source (case-insensitive), independent of the profile. Returns `null` if the id is unknown or no source was provided.

**Returns:** `Promise<string | null>`

```ts
const link = await locker.resolveImage('CID_028_Athena_Commando_F');
```

## setFavorite / markSeen
<Badge type="info" text="method" />

```ts
setFavorite(itemIds: string[], favorite?: boolean): Promise<MCPResponse>
markSeen(itemIds: string[]): Promise<MCPResponse>
```

Convenience mutations on the `athena` profile: favourite/unfavourite items (`SetItemFavoriteStatusBatch`) or clear the "new" badge (`MarkItemSeen`). Both take **item ids** (the profile guids from `LockerItem.id`), not cosmetic ids.

```ts
const [first] = await locker.items();
if (first) await locker.setFavorite([first.id], true);
```

## Editing the locker

::: warning Real, hard-to-reverse account writes
Everything below writes to the signed-in account's live locker. There is no dry-run — the outfit, emote or preset changes exactly as the game would change it. These need an account-bound session, not `client_credentials`.
:::

Every edit method resolves the account's cosmetic-locker item automatically (the `CosmeticLocker:cosmeticlocker_athena` object), so you pass cosmetic ids, not guids. `itemId` accepts a **bare cosmetic id** (`CID_028_Athena_Commando_F`) — the backend template prefix is added for you — or a full templateId if you already have one. Pass `null` to clear a slot.

Every method also accepts a target: `{ lockerItem }` to override the resolved guid, or `{ preset }` to target a saved legacy loadout by index instead of the live one.

### Equipping slots
<Badge type="info" text="method" />

```ts
setSlot(category: LockerCategoryValue, itemId: string | null, options?: LockerEquipOptions): Promise<MCPResponse>

equipOutfit(itemId, options?)        // Character
equipBackpack(itemId, options?)      // Backpack
equipPickaxe(itemId, options?)       // Pickaxe
equipGlider(itemId, options?)        // Glider
equipContrail(itemId, options?)      // SkyDiveContrail
equipMusicPack(itemId, options?)     // MusicPack
equipLoadingScreen(itemId, options?) // LoadingScreen
equipEmote(itemId, slotIndex?, options?)  // Dance — slotIndex 0..5, default 0
equipWrap(itemId, slotIndex?, options?)   // ItemWrap — slotIndex 0..6, default -1 (all slots)
clearSlot(category, options?)             // unequip
```

The typed helpers are thin wrappers over `setSlot`, which sends `SetCosmeticLockerSlot`. `LockerEquipOptions` adds `slotIndex` and `variants`.

```ts
await locker.equipOutfit('CID_028_Athena_Commando_F');
await locker.equipEmote('EID_Floss', 0);
await locker.equipWrap('Wrap_001_FireHeart');          // every wrap slot
await locker.clearSlot('Backpack');
```

### Styles & variants
<Badge type="info" text="method" />

```ts
setVariants(category, itemId, variants: LockerVariantUpdate[], options?): Promise<MCPResponse>
```

Re-slots the item with a set of variant channels. A `LockerVariantUpdate` is `{ channel, active, owned? }`; `owned` defaults to `[]`. You can also pass `variants` through any `equip*`/`setSlot` call.

```ts
await locker.setVariants('Character', 'CID_028_Athena_Commando_F', [
  { channel: 'Material', active: 'Mat2' },
]);
```

### Equipping a whole loadout at once
<Badge type="info" text="method" />

```ts
equipLoadout(loadout: LockerEquipLoadout, options?): Promise<MCPResponse>
```

Batches every provided slot into a single `SetCosmeticLockerSlots` call. Any key you omit is left untouched; set a key to `null` to clear it. `dances` and `itemWraps` are arrays, slotted by index.

```ts
await locker.equipLoadout({
  character: 'CID_028_Athena_Commando_F',
  backpack: 'BID_004_BlackKnight',
  pickaxe: 'Pickaxe_Lockjaw',
  dances: ['EID_Floss', 'EID_Dab', null],
  itemWraps: ['Wrap_001_FireHeart'],
});
```

### Banner & name
<Badge type="info" text="method" />

```ts
setBanner(iconId: string, colorId: string, options?): Promise<MCPResponse>
renameLocker(name: string, options?): Promise<MCPResponse>
```

`setBanner` takes short banner template names (`brs10level100`, `defaultcolor10`); a `Type:` prefix is stripped for you. `renameLocker` renames the loadout preset.

### Presets (legacy loadout slots)
<Badge type="info" text="method" />

```ts
copyPreset(sourceIndex: number, targetIndex: number, newName?: string, signal?): Promise<MCPResponse>
deletePreset(index: number, options?: { fallbackLoadoutIndex?: number; leaveNullSlot?: boolean }): Promise<MCPResponse>
```

`copyPreset` saves the loadout at `sourceIndex` into `targetIndex` (`CopyCosmeticLoadout`) — copy from index `0` (the live locker) to save the current fit as a preset. `deletePreset` removes one (`DeleteCosmeticLoadout`); `fallbackLoadoutIndex` defaults to `-1` (none).

```ts
await locker.copyPreset(0, 3, 'Sweaty Fit');
await locker.deletePreset(3);
```

### Preset builder
<Badge type="info" text="method" />

```ts
createPreset(): LockerPresetBuilder
applyPreset(slots: LockerPresetSlot[], options?: ApplyPresetOptions): Promise<MCPResponse>
```

`createPreset()` returns a fluent `LockerPresetBuilder` for assembling a full fit one cosmetic at a time — each with its own styles (variants) — then applying it in a single `SetCosmeticLockerSlots` write. Build up the slots, then call `.apply()` (or its alias `.save()`).

```ts
const response = await locker
  .createPreset()
  .character('CID_028_Athena_Commando_F', {
    variants: [{ channel: 'Material', active: 'Mat2' }],
  })
  .backpack('BID_004_BlackKnight')
  .pickaxe('Pickaxe_Lockjaw')
  .glider('Glider_Warpaint')
  .emote(0, 'EID_Floss')
  .emote(1, 'EID_Dab')
  .wrap(-1, 'Wrap_001_FireHeart')
  .clear('SkyDiveContrail')
  .name('Sweaty Fit')
  .apply();
```

Per-category shortcuts (`character`, `backpack`, `pickaxe`, `glider`, `contrail`, `musicPack`, `loadingScreen`) target slot `0`; `emote(slotIndex, id)` and `wrap(slotIndex, id)` take an index (`-1` applies a wrap to every slot). `slot(category, itemId, options)` is the general form, `clear(category, slotIndex?)` empties a slot with `null`, and adding the same category+index again replaces the earlier entry. `.name(...)` triggers a follow-up `SetCosmeticLockerName`. Apply into a preset slot instead of the live locker with `.apply({ preset: 3 })`.

Prefer `applyPreset(slots, options)` directly when you already have a `LockerPresetSlot[]` in hand — the builder's `.build()` returns exactly that.

### Modular loadouts (current per-section system)
<Badge type="info" text="method" />

```ts
putModularLoadout(loadoutType: ModularLoadoutValue, presetId: number, data: ModularLoadoutInput, signal?): Promise<MCPResponse>
equipModularPreset(loadoutType: ModularLoadoutValue, presetId: number, signal?): Promise<MCPResponse>
deleteModularLoadout(loadoutType: ModularLoadoutValue, presetId: number, signal?): Promise<MCPResponse>
```

The modern locker stores presets per section (`ModularLoadout.character`, `.emotes`, `.wraps`, `.platform`, `.sparks`, `.jam`, `.vehicle`). `putModularLoadout` writes a preset — `data` is `{ slots, displayName? }` where each slot is `{ slotTemplate, equippedItem?, customizations? }` — and the SDK stringifies it into the `loadoutData` field Epic expects. `equipModularPreset` applies a saved preset; `deleteModularLoadout` removes one.

```ts
import { ModularLoadout } from 'fnapi-js';

await locker.putModularLoadout(ModularLoadout.character, 1, {
  displayName: 'Preset 1',
  slots: [
    { slotTemplate: 'CosmeticLoadoutSlotTemplate:LoadoutSlot_Character', equippedItem: 'AthenaCharacter:CID_028_Athena_Commando_F' },
    { slotTemplate: 'CosmeticLoadoutSlotTemplate:LoadoutSlot_Pickaxe', equippedItem: 'AthenaPickaxe:Pickaxe_Lockjaw' },
  ],
});
await locker.equipModularPreset(ModularLoadout.character, 1);
```

### Random & shuffle toggles
<Badge type="info" text="method" />

```ts
setRandomLoadout(enabled: boolean, signal?): Promise<MCPResponse>
setShuffleEnabled(loadoutType: ModularLoadoutValue, enabled: boolean, signal?): Promise<MCPResponse>
```

`setRandomLoadout` toggles the "random outfit each match" flag; `setShuffleEnabled` toggles shuffle for a modular section.

## Types

### LockerItem

```ts
interface LockerItem {
  id: string;            // profile item guid — use this for mutations
  templateId: string;    // e.g. AthenaCharacter:cid_028_athena_commando_f
  type: string;          // AthenaCharacter, AthenaDance, ...
  cosmeticId: string;    // cid_028_athena_commando_f
  favorite: boolean;
  seen: boolean;
  variants: LockerVariant[];
  name: string | null;           // filled by enrich (works for tracks too)
  cosmetic: AnyCosmetic | null;  // filled by enrich
  imageUrl: string | null;       // filled by enrich
}
```

### LockerLoadout

```ts
interface LockerLoadout {
  character: LockerSlot | null;
  backpack: LockerSlot | null;
  pickaxe: LockerSlot | null;
  glider: LockerSlot | null;
  contrail: LockerSlot | null;
  musicPack: LockerSlot | null;
  loadingScreen: LockerSlot | null;
  dances: LockerSlot[];
  itemWraps: LockerSlot[];
}
```

A `LockerSlot` is `{ type, cosmeticId, cosmetic, imageUrl }`, with `cosmetic`/`imageUrl` populated by enrichment.

### LockerCategory / ModularLoadout

`LockerCategory` maps friendly names to the backend categories `setSlot` expects; `ModularLoadout` maps sections to their schema ids.

```ts
LockerCategory = {
  character: 'Character', backpack: 'Backpack', pickaxe: 'Pickaxe',
  glider: 'Glider', contrail: 'SkyDiveContrail', musicPack: 'MusicPack',
  loadingScreen: 'LoadingScreen', dance: 'Dance', itemWrap: 'ItemWrap',
};

ModularLoadout = {
  character: 'CosmeticLoadout:LoadoutSchema_Character',
  emotes: 'CosmeticLoadout:LoadoutSchema_Emotes',
  wraps: 'CosmeticLoadout:LoadoutSchema_Wraps',
  platform: 'CosmeticLoadout:LoadoutSchema_Platform',
  sparks: 'CosmeticLoadout:LoadoutSchema_Sparks',
  jam: 'CosmeticLoadout:LoadoutSchema_Jam',
  vehicle: 'CosmeticLoadout:LoadoutSchema_Vehicle',
};
```

### Edit inputs

```ts
interface LockerVariantUpdate {
  channel: string;          // e.g. 'Material'
  active: string;           // e.g. 'Mat2'
  owned?: string[];         // defaults to []
}

interface LockerSlotTarget {
  lockerItem?: string;      // override the resolved CosmeticLocker guid
  preset?: number;          // target a saved loadout by index
  signal?: AbortSignal;
}

interface LockerEquipOptions extends LockerSlotTarget {
  slotIndex?: number;
  variants?: LockerVariantUpdate[];
}

interface LockerEquipLoadout {
  character?: string | null;
  backpack?: string | null;
  pickaxe?: string | null;
  glider?: string | null;
  contrail?: string | null;
  musicPack?: string | null;
  loadingScreen?: string | null;
  dances?: (string | null)[];
  itemWraps?: (string | null)[];
}

interface ModularSlotInput {
  slotTemplate: string;
  equippedItem?: string | null;
  customizations?: { channelTag: string; variantTag: string }[];
}

interface ModularLoadoutInput {
  slots: ModularSlotInput[];
  displayName?: string;
}
```
