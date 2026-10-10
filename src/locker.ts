import { ValidationError } from './core/errors.js';
import type {
  EosTokenOptions,
  LockerActiveLoadoutGroup,
  LockerCosmeticData,
  LockerItemCustomization,
  LockerLoadoutGroupPreset,
  LockerLoadoutPreset,
  LockerLoadoutSlot,
  LockerSchemaLoadout,
  LockerVariantTag,
} from './epic/eos.js';
import type { EpicAuthSession } from './epic/session.js';
import type { MCPResponse } from './epic/mcp.js';
import type { AllCosmetics, AnyCosmetic } from './fortnite/types.js';

export interface LockerCosmeticSource {
  all(): Promise<AllCosmetics>;
}

export const LockerSchema = {
  character: 'CosmeticLoadout:LoadoutSchema_Character',
  emotes: 'CosmeticLoadout:LoadoutSchema_Emotes',
  wraps: 'CosmeticLoadout:LoadoutSchema_Wraps',
  platform: 'CosmeticLoadout:LoadoutSchema_Platform',
  instruments: 'CosmeticLoadout:LoadoutSchema_Sparks',
  jam: 'CosmeticLoadout:LoadoutSchema_Jam',
  car: 'CosmeticLoadout:LoadoutSchema_Vehicle',
  suv: 'CosmeticLoadout:LoadoutSchema_Vehicle_SUV',
  companion: 'CosmeticLoadout:LoadoutSchema_Mimosa',
  moments: 'CosmeticLoadout:LoadoutSchema_Moments',
} as const;

export type LockerSchemaValue = (typeof LockerSchema)[keyof typeof LockerSchema];

type EmoteIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
type WrapIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type VehiclePart = 'Body' | 'Skin' | 'Wheels' | 'DriftTrail' | 'Booster' | 'Macaron' | 'Zest';

export type LockerSlotName =
  | 'character'
  | 'backpack'
  | 'pickaxe'
  | 'glider'
  | 'contrail'
  | 'shoes'
  | 'aura'
  | `emote${EmoteIndex}`
  | `wrap${WrapIndex}`
  | 'bannerIcon'
  | 'bannerColor'
  | 'lobbyMusic'
  | 'loadingScreen'
  | 'bass'
  | 'guitar'
  | 'drums'
  | 'keyboard'
  | 'microphone'
  | `jamTrack${EmoteIndex}`
  | `car${VehiclePart}`
  | `suv${VehiclePart}`
  | 'companion'
  | 'busMoment'
  | 'victoryMoment';

export interface LockerSlotDefinition {
  schema: LockerSchemaValue;
  slotTemplate: string;
  itemType: string | null;
}

export const EMOTE_SLOT_COUNT = 8;
export const WRAP_SLOT_COUNT = 7;
export const JAM_TRACK_SLOT_COUNT = 8;

const VEHICLE_PARTS: Array<[VehiclePart, string, string | null]> = [
  ['Body', 'Vehicle_Body', 'VehicleCosmetics_Body'],
  ['Skin', 'Vehicle_Skin', 'VehicleCosmetics_Skin'],
  ['Wheels', 'Vehicle_Wheel', 'VehicleCosmetics_Wheel'],
  ['DriftTrail', 'Vehicle_DriftSmoke', 'VehicleCosmetics_DriftTrail'],
  ['Booster', 'Vehicle_Booster', 'VehicleCosmetics_Booster'],
  ['Macaron', 'Vehicle_Macaron', null],
  ['Zest', 'Vehicle_Zest', null],
];

function slot(schema: LockerSchemaValue, name: string, itemType: string | null): LockerSlotDefinition {
  return { schema, slotTemplate: `CosmeticLoadoutSlotTemplate:LoadoutSlot_${name}`, itemType };
}

function indexed(prefix: string, count: number, build: (index: number) => LockerSlotDefinition): Record<string, LockerSlotDefinition> {
  return Object.fromEntries(Array.from({ length: count }, (_, index) => [`${prefix}${index}`, build(index)]));
}

export const LOCKER_SLOTS = {
  character: slot(LockerSchema.character, 'Character', 'AthenaCharacter'),
  backpack: slot(LockerSchema.character, 'Backpack', 'AthenaBackpack'),
  pickaxe: slot(LockerSchema.character, 'Pickaxe', 'AthenaPickaxe'),
  glider: slot(LockerSchema.character, 'Glider', 'AthenaGlider'),
  contrail: slot(LockerSchema.character, 'Contrails', 'AthenaSkyDiveContrail'),
  shoes: slot(LockerSchema.character, 'Shoes', 'CosmeticShoes'),
  aura: slot(LockerSchema.character, 'Aura', 'SparksAura'),
  ...indexed('emote', EMOTE_SLOT_COUNT, (index) => slot(LockerSchema.emotes, `Emote_${index}`, 'AthenaDance')),
  ...indexed('wrap', WRAP_SLOT_COUNT, (index) => slot(LockerSchema.wraps, `Wrap_${index}`, 'AthenaItemWrap')),
  bannerIcon: slot(LockerSchema.platform, 'Banner_Icon', 'HomebaseBannerIcon'),
  bannerColor: slot(LockerSchema.platform, 'Banner_Color', 'HomebaseBannerColor'),
  lobbyMusic: slot(LockerSchema.platform, 'LobbyMusic', 'AthenaMusicPack'),
  loadingScreen: slot(LockerSchema.platform, 'LoadingScreen', 'AthenaLoadingScreen'),
  bass: slot(LockerSchema.instruments, 'Bass', 'SparksBass'),
  guitar: slot(LockerSchema.instruments, 'Guitar', 'SparksGuitar'),
  drums: slot(LockerSchema.instruments, 'Drum', 'SparksDrums'),
  keyboard: slot(LockerSchema.instruments, 'Keyboard', 'SparksKeyboard'),
  microphone: slot(LockerSchema.instruments, 'Microphone', 'SparksMicrophone'),
  ...indexed('jamTrack', JAM_TRACK_SLOT_COUNT, (index) => slot(LockerSchema.jam, `JamSong${index}`, 'SparksSong')),
  ...Object.fromEntries(VEHICLE_PARTS.map(([part, name, type]) => [`car${part}`, slot(LockerSchema.car, name, type)])),
  ...Object.fromEntries(VEHICLE_PARTS.map(([part, name, type]) => [`suv${part}`, slot(LockerSchema.suv, `${name}_SUV`, type)])),
  companion: slot(LockerSchema.companion, 'MimosaMain', 'CosmeticMimosa'),
  busMoment: slot(LockerSchema.moments, 'MomentsBus', 'SparksSong'),
  victoryMoment: slot(LockerSchema.moments, 'MomentsVictory', 'SparksSong'),
} as Record<LockerSlotName, LockerSlotDefinition>;

const SLOT_BY_TEMPLATE = new Map<string, LockerSlotName>(
  (Object.entries(LOCKER_SLOTS) as Array<[LockerSlotName, LockerSlotDefinition]>).map(([name, definition]) => [
    `${definition.schema}|${definition.slotTemplate}`,
    name,
  ]),
);

export const LOCKER_PRESET_PREFIX = 'loadoutgrouppreset-';

export interface LockerVariant {
  channel: string;
  active: string;
  activeData: string | null;
  owned: string[];
}

export interface LockerItem {
  id: string;
  templateId: string;
  type: string;
  cosmeticId: string;
  favorite: boolean;
  seen: boolean;
  lockedIn: boolean | null;
  variants: LockerVariant[];
  createdAt: string | null;
  updatedAt: string | null;
  name: string | null;
  cosmetic: AnyCosmetic | null;
  imageUrl: string | null;
}

export interface LockerVariantSelection {
  channel: string;
  variant: string;
  additionalData?: string;
}

export interface LockerEquippedItem {
  slot: LockerSlotName | null;
  schema: string;
  slotTemplate: string;
  templateId: string;
  type: string;
  cosmeticId: string;
  resolvedTemplateId: string | null;
  variants: LockerVariantSelection[];
  name: string | null;
  cosmetic: AnyCosmetic | null;
  imageUrl: string | null;
}

type Equipped = LockerEquippedItem | null;

export interface LockerVehicleLoadout {
  body: Equipped;
  skin: Equipped;
  wheels: Equipped;
  driftTrail: Equipped;
  booster: Equipped;
  macaron: Equipped;
  zest: Equipped;
}

export interface LockerLoadout {
  character: Equipped;
  backpack: Equipped;
  pickaxe: Equipped;
  glider: Equipped;
  contrail: Equipped;
  shoes: Equipped;
  aura: Equipped;
  emotes: Equipped[];
  wraps: Equipped[];
  banner: { icon: Equipped; color: Equipped };
  lobbyMusic: Equipped;
  loadingScreen: Equipped;
  instruments: { bass: Equipped; guitar: Equipped; drums: Equipped; keyboard: Equipped; microphone: Equipped };
  jamTracks: Equipped[];
  car: LockerVehicleLoadout;
  suv: LockerVehicleLoadout;
  companion: Equipped;
  moments: { bus: Equipped; victory: Equipped };
  slots: Partial<Record<LockerSlotName, LockerEquippedItem>>;
  other: LockerEquippedItem[];
  shuffle: Record<string, string>;
  presetId: string | null;
  updatedAt: string | null;
  group: LockerActiveLoadoutGroup;
}

export interface LockerPreset {
  id: string;
  itemId: string;
  name: string;
  favorite: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  loadouts: Record<string, LockerSchemaLoadout>;
}

export interface LockerSchemaPreset {
  id: string;
  itemId: string;
  index: number;
  name: string | null;
  schema: string;
  items: LockerEquippedItem[];
  createdAt: string | null;
  updatedAt: string | null;
}

export interface LockerSnapshot {
  accountId: string | null;
  items: LockerItem[];
  loadout: LockerLoadout;
  presets: LockerPreset[];
  schemaPresets: LockerSchemaPreset[];
}

export interface LockerFetchOptions {
  enrich?: boolean;
  items?: boolean;
  signal?: AbortSignal;
}

export interface LockerEquipOptions {
  variants?: LockerVariantSelection[];
  signal?: AbortSignal;
}

export interface LockerSlotChange {
  item: string | null;
  variants?: LockerVariantSelection[];
}

export type LockerChanges = Partial<Record<LockerSlotName, string | null | LockerSlotChange>>;

export interface LockerSavePresetOptions {
  loadouts?: Record<string, LockerSchemaLoadout>;
  signal?: AbortSignal;
}

export interface RichColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export type InstrumentSlot = 'bass' | 'guitar' | 'drums' | 'keyboard' | 'microphone';

export class Locker {
  private cosmeticMapCache: Map<string, AnyCosmetic> | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly session: EpicAuthSession,
    private readonly cosmetics?: LockerCosmeticSource,
  ) {}

  async fetch(options: LockerFetchOptions = {}): Promise<LockerSnapshot> {
    const request = tokenOptions(options.signal);
    const [response, owned] = await Promise.all([
      this.session.lockerItems(request),
      options.items === false ? Promise.resolve([]) : this.session.lockerCosmetics(request),
    ]);
    const snapshot: LockerSnapshot = {
      accountId: this.session.accountId,
      items: owned.map(toLockerItem),
      loadout: toLoadout(response.activeLoadoutGroup ?? { loadouts: {} }),
      presets: (response.loadoutGroupPresets ?? []).map(toPreset),
      schemaPresets: (response.loadoutPresets ?? []).map(toSchemaPreset).sort((a, b) => a.index - b.index),
    };
    if (options.enrich) await this.enrichSnapshot(snapshot);
    return snapshot;
  }

  async items(options: Omit<LockerFetchOptions, 'items'> = {}): Promise<LockerItem[]> {
    const items = (await this.session.lockerCosmetics(tokenOptions(options.signal))).map(toLockerItem);
    if (options.enrich) {
      const map = await this.cosmeticMap();
      for (const item of items) enrich(item, map);
    }
    return items;
  }

  async loadout(options: Omit<LockerFetchOptions, 'items'> = {}): Promise<LockerLoadout> {
    const response = await this.session.lockerItems(tokenOptions(options.signal));
    const loadout = toLoadout(response.activeLoadoutGroup ?? { loadouts: {} });
    if (options.enrich) {
      const map = await this.cosmeticMap();
      for (const item of equippedItems(loadout)) enrich(item, map);
    }
    return loadout;
  }

  async presets(signal?: AbortSignal): Promise<LockerPreset[]> {
    const response = await this.session.lockerItems(tokenOptions(signal));
    return (response.loadoutGroupPresets ?? []).map(toPreset);
  }

  async resolveImage(cosmeticId: string): Promise<string | null> {
    const cosmetic = (await this.cosmeticMap()).get(cosmeticPart(cosmeticId).toLowerCase());
    return cosmetic ? cosmeticImage(cosmetic) : null;
  }

  equip(slotName: LockerSlotName, item: string | null, options: LockerEquipOptions = {}): Promise<LockerLoadout> {
    const change: LockerSlotChange = { item, ...(options.variants ? { variants: options.variants } : {}) };
    return this.equipMany({ [slotName]: change } as LockerChanges, options.signal);
  }

  equipMany(changes: LockerChanges, signal?: AbortSignal): Promise<LockerLoadout> {
    const entries = Object.entries(changes).filter(([, value]) => value !== undefined) as Array<
      [LockerSlotName, string | null | LockerSlotChange]
    >;
    if (entries.length === 0) throw new ValidationError('"changes" must include at least one slot', 'changes');
    const resolved = entries.map(([name, value]) => {
      const definition = slotDefinition(name);
      const change = typeof value === 'object' && value !== null ? value : { item: value };
      return { definition, templateId: resolveTemplateId(name, definition, change.item), variants: change.variants };
    });
    return this.mutate((loadouts) => {
      for (const { definition, templateId, variants } of resolved) {
        const target = slotIn(loadouts, definition);
        const sameItem = templateId !== null && sameTemplate(target.equippedItemId, templateId);
        if (templateId === null) delete target.equippedItemId;
        else target.equippedItemId = templateId;
        delete target.resolvedEquippedItemId;
        if (variants) target.itemCustomizations = variants.map(toCustomization);
        else if (!sameItem) target.itemCustomizations = [];
      }
    }, signal);
  }

  clear(slotName: LockerSlotName, signal?: AbortSignal): Promise<LockerLoadout> {
    return this.equip(slotName, null, signal ? { signal } : {});
  }

  setVariants(slotName: LockerSlotName, variants: LockerVariantSelection[], signal?: AbortSignal): Promise<LockerLoadout> {
    const definition = slotDefinition(slotName);
    return this.mutate((loadouts) => {
      const target = slotIn(loadouts, definition);
      if (!target.equippedItemId) throw new ValidationError(`Nothing is equipped in "${slotName}"`, 'slot');
      const next = [...(target.itemCustomizations ?? [])];
      for (const variant of variants) {
        const existing = next.findIndex((entry) => entry.channelTag === variant.channel);
        if (existing >= 0) next[existing] = toCustomization(variant);
        else next.push(toCustomization(variant));
      }
      target.itemCustomizations = next;
    }, signal);
  }

  setColor(slotName: LockerSlotName, color: string | RichColor, signal?: AbortSignal): Promise<LockerLoadout> {
    const definition = slotDefinition(slotName);
    const additionalData = encodeRichColor(color);
    return this.mutate((loadouts) => {
      const target = slotIn(loadouts, definition);
      const channels = (target.itemCustomizations ?? []).filter(isRichColor);
      if (channels.length === 0) {
        throw new ValidationError(`The item in "${slotName}" has no colour channel equipped`, 'slot');
      }
      for (const channel of channels) channel.additionalData = additionalData;
    }, signal);
  }

  equipOutfit(item: string, options?: LockerEquipOptions): Promise<LockerLoadout> {
    return this.equip('character', item, options);
  }

  equipBackpack(item: string, options?: LockerEquipOptions): Promise<LockerLoadout> {
    return this.equip('backpack', item, options);
  }

  equipPickaxe(item: string, options?: LockerEquipOptions): Promise<LockerLoadout> {
    return this.equip('pickaxe', item, options);
  }

  equipGlider(item: string, options?: LockerEquipOptions): Promise<LockerLoadout> {
    return this.equip('glider', item, options);
  }

  equipContrail(item: string, options?: LockerEquipOptions): Promise<LockerLoadout> {
    return this.equip('contrail', item, options);
  }

  equipShoes(item: string, options?: LockerEquipOptions): Promise<LockerLoadout> {
    return this.equip('shoes', item, options);
  }

  equipAura(item: string, options?: LockerEquipOptions): Promise<LockerLoadout> {
    return this.equip('aura', item, options);
  }

  equipEmote(item: string, index = 0, options?: LockerEquipOptions): Promise<LockerLoadout> {
    return this.equip(indexedSlot('emote', index, EMOTE_SLOT_COUNT), item, options);
  }

  equipWrap(item: string, index?: number, options: LockerEquipOptions = {}): Promise<LockerLoadout> {
    if (index !== undefined) return this.equip(indexedSlot('wrap', index, WRAP_SLOT_COUNT), item, options);
    const change: LockerSlotChange = { item, ...(options.variants ? { variants: options.variants } : {}) };
    const changes = Object.fromEntries(Array.from({ length: WRAP_SLOT_COUNT }, (_, slotIndex) => [`wrap${slotIndex}`, change]));
    return this.equipMany(changes as LockerChanges, options.signal);
  }

  equipJamTrack(item: string, index = 0, options?: LockerEquipOptions): Promise<LockerLoadout> {
    return this.equip(indexedSlot('jamTrack', index, JAM_TRACK_SLOT_COUNT), item, options);
  }

  equipInstrument(instrument: InstrumentSlot, item: string, options?: LockerEquipOptions): Promise<LockerLoadout> {
    return this.equip(instrument, item, options);
  }

  equipLoadingScreen(item: string, options?: LockerEquipOptions): Promise<LockerLoadout> {
    return this.equip('loadingScreen', item, options);
  }

  equipLobbyMusic(item: string, options?: LockerEquipOptions): Promise<LockerLoadout> {
    return this.equip('lobbyMusic', item, options);
  }

  equipCompanion(item: string, options?: LockerEquipOptions): Promise<LockerLoadout> {
    return this.equip('companion', item, options);
  }

  setBanner(icon: string, color: string, signal?: AbortSignal): Promise<LockerLoadout> {
    return this.equipMany({ bannerIcon: icon, bannerColor: color }, signal);
  }

  async savePreset(name: string, options: LockerSavePresetOptions = {}): Promise<LockerPreset> {
    requireName(name);
    const loadouts = options.loadouts ?? (await this.currentLoadouts(options.signal));
    const saved = await this.session.putLoadoutGroupPreset(
      `${LOCKER_PRESET_PREFIX}${uuid()}`,
      { displayName: name, loadouts: cleanLoadouts(loadouts), athenaItemId: uuid(), creationTime: new Date().toISOString() },
      tokenOptions(options.signal),
    );
    return toPreset(saved);
  }

  async updatePreset(
    presetId: string,
    update: { name?: string; loadouts?: Record<string, LockerSchemaLoadout> | 'current' },
    signal?: AbortSignal,
  ): Promise<LockerPreset> {
    const existing = await this.findPreset(presetId, signal);
    if (update.name !== undefined) requireName(update.name);
    const loadouts =
      update.loadouts === 'current' ? await this.currentLoadouts(signal) : (update.loadouts ?? existing.loadouts);
    const saved = await this.session.updateLoadoutGroupPreset(
      existing.id,
      { displayName: update.name ?? existing.name, loadouts: cleanLoadouts(loadouts) },
      tokenOptions(signal),
    );
    return toPreset(saved);
  }

  renamePreset(presetId: string, name: string, signal?: AbortSignal): Promise<LockerPreset> {
    return this.updatePreset(presetId, { name }, signal);
  }

  async deletePreset(presetId: string, signal?: AbortSignal): Promise<void> {
    await this.session.deleteLoadoutGroupPreset(presetId, tokenOptions(signal));
  }

  async applyPreset(presetId: string, signal?: AbortSignal): Promise<LockerLoadout> {
    const preset = await this.findPreset(presetId, signal);
    return this.enqueue(async () => {
      const group = await this.session.setActiveLoadoutGroup(
        { loadouts: cleanLoadouts(preset.loadouts), equippedPresetId: preset.id, equippedPresetItemId: preset.itemId },
        tokenOptions(signal),
      );
      return toLoadout(group.loadouts ? group : { ...group, loadouts: preset.loadouts });
    });
  }

  restore(group: Pick<LockerActiveLoadoutGroup, 'loadouts'> | LockerLoadout, signal?: AbortSignal): Promise<LockerLoadout> {
    const loadouts = 'group' in group ? group.group.loadouts : group.loadouts;
    return this.enqueue(async () => {
      const updated = await this.session.setActiveLoadoutGroup({ loadouts: cleanLoadouts(loadouts) }, tokenOptions(signal));
      return toLoadout(updated.loadouts ? updated : { ...updated, loadouts });
    });
  }

  async setCompanionName(item: LockerItem | string, name: string, signal?: AbortSignal): Promise<void> {
    requireName(name);
    const owned = typeof item === 'string' ? await this.findItem(item, signal) : item;
    await this.session.setCompanionName(`${owned.templateId}:${owned.id}`, name, tokenOptions(signal));
  }

  async lockInItem(
    item: LockerItem | string,
    variants: Record<string, LockerVariantTag>,
    signal?: AbortSignal,
  ): Promise<void> {
    const owned = typeof item === 'string' ? await this.findItem(item, signal) : item;
    await this.session.lockInImmutableItem(`${owned.templateId}:${owned.id}`, variants, tokenOptions(signal));
  }

  setFavorite(itemIds: string[], favorite = true, signal?: AbortSignal): Promise<MCPResponse> {
    requireIds(itemIds);
    return this.session.mcpOperation('SetItemFavoriteStatusBatch', {
      profileId: 'athena',
      payload: { itemIds, itemFavStatus: itemIds.map(() => favorite) },
      ...(signal ? { signal } : {}),
    });
  }

  markSeen(itemIds: string[], signal?: AbortSignal): Promise<MCPResponse> {
    requireIds(itemIds);
    return this.session.mcpOperation('MarkItemSeen', {
      profileId: 'athena',
      payload: { itemIds },
      ...(signal ? { signal } : {}),
    });
  }

  private mutate(edit: (loadouts: Record<string, LockerSchemaLoadout>) => void, signal?: AbortSignal): Promise<LockerLoadout> {
    return this.enqueue(async () => {
      const loadouts = cleanLoadouts(await this.currentLoadouts(signal));
      edit(loadouts);
      const updated = await this.session.setActiveLoadoutGroup({ loadouts }, tokenOptions(signal));
      return toLoadout(updated.loadouts ? updated : { ...updated, loadouts });
    });
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task);
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async currentLoadouts(signal?: AbortSignal): Promise<Record<string, LockerSchemaLoadout>> {
    const response = await this.session.lockerItems(tokenOptions(signal));
    return response.activeLoadoutGroup?.loadouts ?? {};
  }

  private async findPreset(presetId: string, signal?: AbortSignal): Promise<LockerPreset> {
    const preset = (await this.presets(signal)).find((entry) => entry.id === presetId || entry.name === presetId);
    if (!preset) throw new ValidationError(`No locker preset "${presetId}"`, 'presetId');
    return preset;
  }

  private async findItem(item: string, signal?: AbortSignal): Promise<LockerItem> {
    const wanted = item.toLowerCase();
    const owned = (await this.session.lockerCosmetics(tokenOptions(signal))).find(
      (entry) =>
        entry.athenaItemId === item ||
        entry.templateId.toLowerCase() === wanted ||
        cosmeticPart(entry.templateId).toLowerCase() === wanted,
    );
    if (!owned) throw new ValidationError(`"${item}" is not in this locker`, 'item');
    return toLockerItem(owned);
  }

  private async enrichSnapshot(snapshot: LockerSnapshot): Promise<void> {
    const map = await this.cosmeticMap();
    for (const item of snapshot.items) enrich(item, map);
    for (const item of equippedItems(snapshot.loadout)) enrich(item, map);
    for (const preset of snapshot.schemaPresets) for (const item of preset.items) enrich(item, map);
  }

  private async cosmeticMap(): Promise<Map<string, AnyCosmetic>> {
    if (!this.cosmetics) {
      throw new ValidationError(
        'Pass a cosmetics source (e.g. `client.cosmetics`) to the Locker to enrich or resolve images.',
        'cosmetics',
      );
    }
    if (this.cosmeticMapCache) return this.cosmeticMapCache;
    const all = await this.cosmetics.all();
    const map = new Map<string, AnyCosmetic>();
    for (const group of [all.br, all.tracks, all.instruments, all.cars, all.lego, all.legoKits, all.beans] as AnyCosmetic[][]) {
      for (const cosmetic of group) map.set(cosmetic.id.toLowerCase(), cosmetic);
    }
    this.cosmeticMapCache = map;
    return map;
  }
}

export function encodeRichColor(color: string | RichColor): string {
  if (typeof color === 'string') {
    const hex = color.trim().replace(/^#/, '');
    if (/^[0-9a-f]{32}$/i.test(hex)) return hex.toUpperCase();
    const full = /^[0-9a-f]{3,4}$/i.test(hex) ? [...hex].map((digit) => digit + digit).join('') : hex;
    if (!/^([0-9a-f]{6}|[0-9a-f]{8})$/i.test(full)) {
      throw new ValidationError('"color" must be #RGB, #RRGGBB, #RRGGBBAA or 32 hex digits', 'color');
    }
    const bytes = full.match(/../g)!.map((pair) => Number.parseInt(pair, 16) / 255);
    return encodeRichColor({ r: bytes[0]!, g: bytes[1]!, b: bytes[2]!, a: bytes[3] ?? 1 });
  }
  const view = new DataView(new ArrayBuffer(16));
  [color.r, color.g, color.b, color.a].forEach((value, index) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new ValidationError('"color" channels must be finite numbers', 'color');
    }
    view.setFloat32(index * 4, value);
  });
  return Array.from(new Uint8Array(view.buffer), (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function decodeRichColor(additionalData: string | null | undefined): RichColor | null {
  if (!additionalData || !/^[0-9a-f]{32}$/i.test(additionalData)) return null;
  const view = new DataView(new Uint8Array(additionalData.match(/../g)!.map((pair) => Number.parseInt(pair, 16))).buffer);
  return { r: view.getFloat32(0), g: view.getFloat32(4), b: view.getFloat32(8), a: view.getFloat32(12) };
}

function tokenOptions(signal?: AbortSignal): EosTokenOptions {
  return signal ? { signal } : {};
}

function slotDefinition(name: LockerSlotName): LockerSlotDefinition {
  const definition = LOCKER_SLOTS[name];
  if (!definition) throw new ValidationError(`Unknown locker slot "${name}"`, 'slot');
  return definition;
}

function indexedSlot(prefix: string, index: number, count: number): LockerSlotName {
  if (!Number.isInteger(index) || index < 0 || index >= count) {
    throw new ValidationError(`"index" must be between 0 and ${count - 1}`, 'index');
  }
  return `${prefix}${index}` as LockerSlotName;
}

function resolveTemplateId(name: LockerSlotName, definition: LockerSlotDefinition, item: string | null): string | null {
  if (item === null) return null;
  if (typeof item !== 'string' || item.trim().length === 0) {
    throw new ValidationError(`"${name}" item must be a cosmetic id or null`, 'item');
  }
  const value = item.trim();
  const colon = value.indexOf(':');
  if (colon > 0) return `${value.slice(0, colon)}:${value.slice(colon + 1).toLowerCase()}`;
  const id = value.toLowerCase();
  const type =
    (definition.slotTemplate.endsWith('LobbyMusic') && id.startsWith('sid_')) ? 'SparksSong' : definition.itemType;
  if (!type) throw new ValidationError(`"${name}" needs a full template id (Type:id)`, 'item');
  return `${type}:${id}`;
}

function sameTemplate(a: string | undefined, b: string): boolean {
  return typeof a === 'string' && a.toLowerCase() === b.toLowerCase();
}

function slotIn(loadouts: Record<string, LockerSchemaLoadout>, definition: LockerSlotDefinition): LockerLoadoutSlot {
  const schema = (loadouts[definition.schema] ??= { loadoutSlots: [], shuffleType: 'DISABLED' });
  let target = schema.loadoutSlots.find((entry) => entry.slotTemplate === definition.slotTemplate);
  if (!target) {
    target = { slotTemplate: definition.slotTemplate, itemCustomizations: [] };
    schema.loadoutSlots.push(target);
  }
  return target;
}

function cleanLoadouts(loadouts: Record<string, LockerSchemaLoadout>): Record<string, LockerSchemaLoadout> {
  return Object.fromEntries(
    Object.entries(loadouts).map(([schema, loadout]) => [
      schema,
      {
        ...(loadout.shuffleType ? { shuffleType: loadout.shuffleType } : {}),
        loadoutSlots: (loadout.loadoutSlots ?? []).map((entry) => ({
          slotTemplate: entry.slotTemplate,
          ...(entry.equippedItemId ? { equippedItemId: entry.equippedItemId } : {}),
          itemCustomizations: (entry.itemCustomizations ?? []).map((custom) => ({ ...custom })),
        })),
      },
    ]),
  );
}

function toCustomization(variant: LockerVariantSelection): LockerItemCustomization {
  if (!variant?.channel || !variant.variant) {
    throw new ValidationError('Each variant needs a "channel" and a "variant"', 'variants');
  }
  return {
    channelTag: variant.channel,
    variantTag: variant.variant,
    ...(variant.additionalData !== undefined ? { additionalData: variant.additionalData } : {}),
  };
}

function isRichColor(custom: LockerItemCustomization): boolean {
  return custom.variantTag === 'RichColor' || (custom.channelTag ?? '').includes('RichColor');
}

function templateParts(templateId: string): { type: string; cosmeticId: string } {
  const index = templateId.indexOf(':');
  if (index < 0) return { type: '', cosmeticId: templateId };
  return { type: templateId.slice(0, index), cosmeticId: templateId.slice(index + 1) };
}

function cosmeticPart(value: string): string {
  return templateParts(value).cosmeticId;
}

function toLockerItem(raw: LockerCosmeticData): LockerItem {
  const { type, cosmeticId } = templateParts(raw.templateId);
  const channels = new Set([...Object.keys(raw.activeVariants ?? {}), ...Object.keys(raw.ownedVariants ?? {})]);
  return {
    id: raw.athenaItemId,
    templateId: raw.templateId,
    type,
    cosmeticId,
    favorite: raw.favoriteStatus === 'FAVORITED',
    seen: raw.itemSeenStatus !== 'UNSEEN',
    lockedIn: typeof raw.lockedIn === 'boolean' ? raw.lockedIn : null,
    variants: [...channels].map((channel) => {
      const active = raw.activeVariants?.[channel];
      const owned = (raw.ownedVariants?.[channel] ?? []).map((entry) => entry.variantTag);
      return {
        channel,
        active: active?.variantTag ?? '',
        activeData: active?.additionalData ?? null,
        owned: active?.variantTag && !owned.includes(active.variantTag) ? [active.variantTag, ...owned] : owned,
      };
    }),
    createdAt: raw.creationTime ?? null,
    updatedAt: raw.updatedTime ?? null,
    name: null,
    cosmetic: null,
    imageUrl: null,
  };
}

function toEquipped(schema: string, entry: LockerLoadoutSlot): LockerEquippedItem | null {
  if (!entry.equippedItemId) return null;
  const { type, cosmeticId } = templateParts(entry.equippedItemId);
  return {
    slot: SLOT_BY_TEMPLATE.get(`${schema}|${entry.slotTemplate}`) ?? null,
    schema,
    slotTemplate: entry.slotTemplate,
    templateId: entry.equippedItemId,
    type,
    cosmeticId,
    resolvedTemplateId: entry.resolvedEquippedItemId ?? null,
    variants: (entry.itemCustomizations ?? [])
      .filter((custom) => custom.channelTag && custom.variantTag)
      .map((custom) => ({
        channel: custom.channelTag!,
        variant: custom.variantTag!,
        ...(custom.additionalData ? { additionalData: custom.additionalData } : {}),
      })),
    name: null,
    cosmetic: null,
    imageUrl: null,
  };
}

function toLoadout(group: LockerActiveLoadoutGroup): LockerLoadout {
  const slots: Partial<Record<LockerSlotName, LockerEquippedItem>> = {};
  const other: LockerEquippedItem[] = [];
  const shuffle: Record<string, string> = {};
  for (const [schema, loadout] of Object.entries(group.loadouts ?? {})) {
    if (loadout.shuffleType) shuffle[schema] = loadout.shuffleType;
    for (const entry of loadout.loadoutSlots ?? []) {
      const item = toEquipped(schema, entry);
      if (!item) continue;
      if (item.slot) slots[item.slot] = item;
      else other.push(item);
    }
  }
  const get = (name: LockerSlotName): Equipped => slots[name] ?? null;
  const list = (prefix: string, count: number): Equipped[] =>
    Array.from({ length: count }, (_, index) => get(`${prefix}${index}` as LockerSlotName));
  const vehicle = (prefix: 'car' | 'suv'): LockerVehicleLoadout => ({
    body: get(`${prefix}Body`),
    skin: get(`${prefix}Skin`),
    wheels: get(`${prefix}Wheels`),
    driftTrail: get(`${prefix}DriftTrail`),
    booster: get(`${prefix}Booster`),
    macaron: get(`${prefix}Macaron`),
    zest: get(`${prefix}Zest`),
  });
  return {
    character: get('character'),
    backpack: get('backpack'),
    pickaxe: get('pickaxe'),
    glider: get('glider'),
    contrail: get('contrail'),
    shoes: get('shoes'),
    aura: get('aura'),
    emotes: list('emote', EMOTE_SLOT_COUNT),
    wraps: list('wrap', WRAP_SLOT_COUNT),
    banner: { icon: get('bannerIcon'), color: get('bannerColor') },
    lobbyMusic: get('lobbyMusic'),
    loadingScreen: get('loadingScreen'),
    instruments: {
      bass: get('bass'),
      guitar: get('guitar'),
      drums: get('drums'),
      keyboard: get('keyboard'),
      microphone: get('microphone'),
    },
    jamTracks: list('jamTrack', JAM_TRACK_SLOT_COUNT),
    car: vehicle('car'),
    suv: vehicle('suv'),
    companion: get('companion'),
    moments: { bus: get('busMoment'), victory: get('victoryMoment') },
    slots,
    other,
    shuffle,
    presetId: group.equippedPresetId ?? null,
    updatedAt: group.updatedTime ?? null,
    group,
  };
}

function toPreset(raw: LockerLoadoutGroupPreset): LockerPreset {
  return {
    id: raw.presetId,
    itemId: raw.athenaItemId,
    name: raw.displayName,
    favorite: raw.presetFavoriteStatus === 'FAVORITED',
    createdAt: raw.creationTime ?? null,
    updatedAt: raw.updatedTime ?? null,
    loadouts: raw.loadouts ?? {},
  };
}

function toSchemaPreset(raw: LockerLoadoutPreset): LockerSchemaPreset {
  return {
    id: raw.presetId,
    itemId: raw.athenaItemId,
    index: raw.presetIndex,
    name: raw.displayName ?? null,
    schema: raw.loadoutType,
    items: (raw.loadoutSlots ?? []).map((entry) => toEquipped(raw.loadoutType, entry)).filter(nonNull),
    createdAt: raw.creationTime ?? null,
    updatedAt: raw.updatedTime ?? null,
  };
}

function equippedItems(loadout: LockerLoadout): LockerEquippedItem[] {
  return [...Object.values(loadout.slots), ...loadout.other].filter(nonNull);
}

function enrich(target: LockerItem | LockerEquippedItem, map: Map<string, AnyCosmetic>): void {
  const cosmetic = map.get(target.cosmeticId.toLowerCase()) ?? null;
  target.cosmetic = cosmetic;
  target.name = cosmetic ? cosmeticName(cosmetic) : null;
  target.imageUrl = cosmetic ? cosmeticImage(cosmetic) : null;
}

function cosmeticImage(cosmetic: AnyCosmetic): string | null {
  const value = cosmetic as unknown as Record<string, unknown>;
  const images = value['images'] as Record<string, unknown> | undefined;
  if (images) {
    for (const key of ['icon', 'featured', 'large', 'small', 'smallIcon', 'wide']) {
      if (typeof images[key] === 'string') return images[key] as string;
    }
  }
  return typeof value['albumArt'] === 'string' ? (value['albumArt'] as string) : null;
}

function cosmeticName(cosmetic: AnyCosmetic): string | null {
  const value = cosmetic as unknown as Record<string, unknown>;
  if (typeof value['name'] === 'string') return value['name'] as string;
  return typeof value['title'] === 'string' ? (value['title'] as string) : null;
}

function requireName(name: unknown): void {
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new ValidationError('"name" must be a non-empty string', 'name');
  }
}

function requireIds(itemIds: unknown): void {
  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    throw new ValidationError('"itemIds" must be a non-empty array', 'itemIds');
  }
}

function uuid(): string {
  const crypto = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (crypto?.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    return (char === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}

function nonNull<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}
