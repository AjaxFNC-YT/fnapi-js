import { ValidationError } from './core/errors.js';
import type { EpicAuthSession } from './epic/session.js';
import type { LockerActiveLoadoutGroup } from './epic/eos.js';
import type { MCPOperation, MCPResponse } from './epic/mcp.js';
import type { AllCosmetics, AnyCosmetic } from './fortnite/types.js';

export interface LockerCosmeticSource {
  all(): Promise<AllCosmetics>;
}

export interface LockerVariant {
  channel: string;
  active: string;
  owned: string[];
}

export interface LockerItem {
  id: string;
  templateId: string;
  type: string;
  cosmeticId: string;
  favorite: boolean;
  seen: boolean;
  variants: LockerVariant[];
  name: string | null;
  cosmetic: AnyCosmetic | null;
  imageUrl: string | null;
}

export interface LockerSlot {
  type: string;
  cosmeticId: string;
  name: string | null;
  cosmetic: AnyCosmetic | null;
  imageUrl: string | null;
}

export interface LockerLoadout {
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

export interface LockerSnapshot {
  accountId: string | null;
  profileRevision: number;
  items: LockerItem[];
  loadout: LockerLoadout;
}

export interface LockerFetchOptions {
  enrich?: boolean;
  useLockerService?: boolean;
  signal?: AbortSignal;
}

export const LockerCategory = {
  character: 'Character',
  backpack: 'Backpack',
  pickaxe: 'Pickaxe',
  glider: 'Glider',
  contrail: 'SkyDiveContrail',
  musicPack: 'MusicPack',
  loadingScreen: 'LoadingScreen',
  dance: 'Dance',
  itemWrap: 'ItemWrap',
} as const;

export type LockerCategoryValue = (typeof LockerCategory)[keyof typeof LockerCategory];

export const ModularLoadout = {
  character: 'CosmeticLoadout:LoadoutSchema_Character',
  emotes: 'CosmeticLoadout:LoadoutSchema_Emotes',
  wraps: 'CosmeticLoadout:LoadoutSchema_Wraps',
  platform: 'CosmeticLoadout:LoadoutSchema_Platform',
  sparks: 'CosmeticLoadout:LoadoutSchema_Sparks',
  jam: 'CosmeticLoadout:LoadoutSchema_Jam',
  vehicle: 'CosmeticLoadout:LoadoutSchema_Vehicle',
} as const;

export type ModularLoadoutValue = (typeof ModularLoadout)[keyof typeof ModularLoadout];

const CATEGORY_BACKEND: Record<LockerCategoryValue, string> = {
  Character: 'AthenaCharacter',
  Backpack: 'AthenaBackpack',
  Pickaxe: 'AthenaPickaxe',
  Glider: 'AthenaGlider',
  SkyDiveContrail: 'AthenaSkyDiveContrail',
  MusicPack: 'AthenaMusicPack',
  LoadingScreen: 'AthenaLoadingScreen',
  Dance: 'AthenaDance',
  ItemWrap: 'AthenaItemWrap',
};

const LOCKER_ITEM_TEMPLATE = 'CosmeticLocker:cosmeticlocker_athena';

export interface LockerVariantUpdate {
  channel: string;
  active: string;
  owned?: string[];
}

export interface LockerSlotTarget {
  lockerItem?: string;
  preset?: number;
  signal?: AbortSignal;
}

export interface LockerEquipOptions extends LockerSlotTarget {
  slotIndex?: number;
  variants?: LockerVariantUpdate[];
}

export interface LockerEquipLoadout {
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

export interface ModularSlotInput {
  slotTemplate: string;
  equippedItem?: string | null;
  customizations?: { channelTag: string; variantTag: string }[];
}

export interface ModularLoadoutInput {
  slots: ModularSlotInput[];
  displayName?: string;
}

export interface DeletePresetOptions extends LockerSlotTarget {
  fallbackLoadoutIndex?: number;
  leaveNullSlot?: boolean;
}

export interface LockerPresetSlotOptions {
  slotIndex?: number;
  variants?: LockerVariantUpdate[];
}

export interface LockerPresetSlot {
  category: LockerCategoryValue;
  itemId: string | null;
  slotIndex: number;
  variants: LockerVariantUpdate[];
}

export interface ApplyPresetOptions extends LockerSlotTarget {
  name?: string;
}

const LOCKER_SLOT_NAMES: Record<string, keyof LockerLoadout> = {
  LoadoutSlot_Character: 'character',
  LoadoutSlot_Backpack: 'backpack',
  LoadoutSlot_Pickaxe: 'pickaxe',
  LoadoutSlot_Glider: 'glider',
  LoadoutSlot_Contrails: 'contrail',
  LoadoutSlot_MusicPack: 'musicPack',
  LoadoutSlot_LoadingScreen: 'loadingScreen',
};

interface LockerSlotData {
  slots?: Record<string, { items?: string[] }>;
}

interface RawItem {
  templateId?: string;
  attributes?: {
    favorite?: boolean;
    item_seen?: boolean;
    variants?: Array<{ channel?: string; active?: string; owned?: string[] }>;
    locker_slots_data?: LockerSlotData;
  };
}

const COSMETIC_TYPE = new RegExp(
  '^(Athena(Character|Backpack|Pickaxe|Glider|SkyDiveContrail|Dance|Emoji|Toy|ItemWrap|' +
    'MusicPack|LoadingScreen|Spray|PetCarrier|VictoryPose|ConsumableEmote)|Sparks|Vehicle|' +
    'CosmeticShoes|BannerToken|HomebaseBannerIcon)',
);

function templateParts(templateId: string): { type: string; cosmeticId: string } {
  const idx = templateId.indexOf(':');
  if (idx < 0) return { type: '', cosmeticId: templateId };
  return { type: templateId.slice(0, idx), cosmeticId: templateId.slice(idx + 1) };
}

function cosmeticImage(cosmetic: AnyCosmetic): string | null {
  const value = cosmetic as unknown as Record<string, unknown>;
  const images = value['images'] as Record<string, unknown> | undefined;
  if (images) {
    const pick = ['icon', 'featured', 'large', 'small', 'smallIcon', 'wide'];
    for (const key of pick) {
      if (typeof images[key] === 'string') return images[key] as string;
    }
  }
  if (typeof value['albumArt'] === 'string') return value['albumArt'] as string;
  return null;
}

function cosmeticName(cosmetic: AnyCosmetic): string | null {
  const value = cosmetic as unknown as Record<string, unknown>;
  if (typeof value['name'] === 'string') return value['name'] as string;
  if (typeof value['title'] === 'string') return value['title'] as string;
  return null;
}

export class Locker {
  private cosmeticMapCache: Map<string, AnyCosmetic> | null = null;
  private lockerContextCache: { defaultItem: string | null; loadouts: string[] } | null = null;

  constructor(
    private readonly session: EpicAuthSession,
    private readonly cosmetics?: LockerCosmeticSource,
  ) {}

  async fetch(options: LockerFetchOptions = {}): Promise<LockerSnapshot> {
    const response = await this.session.queryProfile('athena', options.signal ? { signal: options.signal } : {});
    const profile = extractProfile(response);
    const items = (profile['items'] ?? {}) as Record<string, RawItem>;
    const attributes = ((profile['stats'] as Record<string, unknown> | undefined)?.['attributes'] ??
      {}) as Record<string, unknown>;

    const lockerItems = parseItems(items);
    const loadout = parseLoadout(attributes, items);

    if (loadout.character === null && options.useLockerService !== false) {
      await this.applyLockerService(loadout, items, options.signal);
    }

    const snapshot: LockerSnapshot = {
      accountId: this.session.accountId,
      profileRevision: response.profileRevision,
      items: lockerItems,
      loadout,
    };

    if (options.enrich) {
      const map = await this.cosmeticMap();
      for (const item of snapshot.items) enrichSlot(item, map);
      for (const slot of loadoutSlots(loadout)) enrichSlot(slot, map);
    }

    return snapshot;
  }

  items(options?: LockerFetchOptions): Promise<LockerItem[]> {
    return this.fetch(options).then((snapshot) => snapshot.items);
  }

  loadout(options?: LockerFetchOptions): Promise<LockerLoadout> {
    return this.fetch(options).then((snapshot) => snapshot.loadout);
  }

  async resolveImage(cosmeticId: string): Promise<string | null> {
    const map = await this.cosmeticMap();
    const cosmetic = map.get(cosmeticId.toLowerCase());
    return cosmetic ? cosmeticImage(cosmetic) : null;
  }

  setFavorite(itemIds: string[], favorite = true): Promise<MCPResponse> {
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      throw new ValidationError('"itemIds" must be a non-empty array', 'itemIds');
    }
    return this.session.mcpOperation('SetItemFavoriteStatusBatch', {
      profileId: 'athena',
      payload: { itemIds, itemFavStatus: itemIds.map(() => favorite) },
    });
  }

  markSeen(itemIds: string[]): Promise<MCPResponse> {
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      throw new ValidationError('"itemIds" must be a non-empty array', 'itemIds');
    }
    return this.session.mcpOperation('MarkItemSeen', {
      profileId: 'athena',
      payload: { itemIds },
    });
  }

  async setSlot(
    category: LockerCategoryValue,
    itemId: string | null,
    options: LockerEquipOptions = {},
  ): Promise<MCPResponse> {
    if (!CATEGORY_BACKEND[category]) {
      throw new ValidationError(`Unknown locker category "${category}"`, 'category');
    }
    const lockerItem = await this.resolveLockerItem(options);
    return this.athenaOp(
      'SetCosmeticLockerSlot',
      {
        lockerItem,
        category,
        itemToSlot: buildItemToSlot(category, itemId),
        slotIndex: options.slotIndex ?? 0,
        variantUpdates: (options.variants ?? []).map(normalizeVariant),
      },
      options.signal,
    );
  }

  equipOutfit(itemId: string, options: LockerEquipOptions = {}): Promise<MCPResponse> {
    return this.setSlot('Character', itemId, options);
  }

  equipBackpack(itemId: string, options: LockerEquipOptions = {}): Promise<MCPResponse> {
    return this.setSlot('Backpack', itemId, options);
  }

  equipPickaxe(itemId: string, options: LockerEquipOptions = {}): Promise<MCPResponse> {
    return this.setSlot('Pickaxe', itemId, options);
  }

  equipGlider(itemId: string, options: LockerEquipOptions = {}): Promise<MCPResponse> {
    return this.setSlot('Glider', itemId, options);
  }

  equipContrail(itemId: string, options: LockerEquipOptions = {}): Promise<MCPResponse> {
    return this.setSlot('SkyDiveContrail', itemId, options);
  }

  equipMusicPack(itemId: string, options: LockerEquipOptions = {}): Promise<MCPResponse> {
    return this.setSlot('MusicPack', itemId, options);
  }

  equipLoadingScreen(itemId: string, options: LockerEquipOptions = {}): Promise<MCPResponse> {
    return this.setSlot('LoadingScreen', itemId, options);
  }

  equipEmote(itemId: string, slotIndex = 0, options: LockerSlotTarget = {}): Promise<MCPResponse> {
    return this.setSlot('Dance', itemId, { ...options, slotIndex });
  }

  equipWrap(itemId: string, slotIndex = -1, options: LockerEquipOptions = {}): Promise<MCPResponse> {
    return this.setSlot('ItemWrap', itemId, { ...options, slotIndex });
  }

  clearSlot(category: LockerCategoryValue, options: LockerEquipOptions = {}): Promise<MCPResponse> {
    return this.setSlot(category, null, options);
  }

  setVariants(
    category: LockerCategoryValue,
    itemId: string,
    variants: LockerVariantUpdate[],
    options: LockerEquipOptions = {},
  ): Promise<MCPResponse> {
    return this.setSlot(category, itemId, { ...options, variants });
  }

  async equipLoadout(loadout: LockerEquipLoadout, options: LockerSlotTarget = {}): Promise<MCPResponse> {
    const lockerItem = await this.resolveLockerItem(options);
    const loadoutData: Array<Record<string, unknown>> = [];
    const push = (category: LockerCategoryValue, id: string | null | undefined, slotIndex = 0): void => {
      if (id === undefined) return;
      loadoutData.push({
        category,
        itemToSlot: buildItemToSlot(category, id),
        slotIndex,
        variantUpdates: [],
      });
    };
    push('Character', loadout.character);
    push('Backpack', loadout.backpack);
    push('Pickaxe', loadout.pickaxe);
    push('Glider', loadout.glider);
    push('SkyDiveContrail', loadout.contrail);
    push('MusicPack', loadout.musicPack);
    push('LoadingScreen', loadout.loadingScreen);
    loadout.dances?.forEach((id, index) => push('Dance', id, index));
    loadout.itemWraps?.forEach((id, index) => push('ItemWrap', id, index));

    if (loadoutData.length === 0) {
      throw new ValidationError('"loadout" must include at least one slot to equip', 'loadout');
    }
    return this.athenaOp('SetCosmeticLockerSlots', { lockerItem, loadoutData }, options.signal);
  }

  async setBanner(iconId: string, colorId: string, options: LockerSlotTarget = {}): Promise<MCPResponse> {
    const lockerItem = await this.resolveLockerItem(options);
    return this.athenaOp(
      'SetCosmeticLockerBanner',
      {
        lockerItem,
        bannerIconTemplateName: bannerName(iconId),
        bannerColorTemplateName: bannerName(colorId),
      },
      options.signal,
    );
  }

  async renameLocker(name: string, options: LockerSlotTarget = {}): Promise<MCPResponse> {
    if (typeof name !== 'string' || name.length === 0) {
      throw new ValidationError('"name" must be a non-empty string', 'name');
    }
    const lockerItem = await this.resolveLockerItem(options);
    return this.athenaOp('SetCosmeticLockerName', { lockerItem, name }, options.signal);
  }

  createPreset(): LockerPresetBuilder {
    return new LockerPresetBuilder(this);
  }

  async applyPreset(slots: LockerPresetSlot[], options: ApplyPresetOptions = {}): Promise<MCPResponse> {
    if (!Array.isArray(slots) || slots.length === 0) {
      throw new ValidationError('A preset must contain at least one slot', 'slots');
    }
    for (const slot of slots) {
      if (!CATEGORY_BACKEND[slot.category]) {
        throw new ValidationError(`Unknown locker category "${slot.category}"`, 'category');
      }
    }
    const lockerItem = await this.resolveLockerItem(options);
    const loadoutData = slots.map((slot) => ({
      category: slot.category,
      itemToSlot: buildItemToSlot(slot.category, slot.itemId),
      slotIndex: slot.slotIndex,
      variantUpdates: slot.variants.map(normalizeVariant),
    }));

    const response = await this.athenaOp('SetCosmeticLockerSlots', { lockerItem, loadoutData }, options.signal);
    if (typeof options.name === 'string' && options.name.length > 0) {
      await this.athenaOp('SetCosmeticLockerName', { lockerItem, name: options.name }, options.signal);
    }
    return response;
  }

  copyPreset(
    sourceIndex: number,
    targetIndex: number,
    newName?: string,
    signal?: AbortSignal,
  ): Promise<MCPResponse> {
    return this.athenaOp(
      'CopyCosmeticLoadout',
      { sourceIndex, targetIndex, optNewNameForTarget: newName ?? '' },
      signal,
    );
  }

  deletePreset(index: number, options: DeletePresetOptions = {}): Promise<MCPResponse> {
    return this.athenaOp(
      'DeleteCosmeticLoadout',
      {
        index,
        fallbackLoadoutIndex: options.fallbackLoadoutIndex ?? -1,
        leaveNullSlot: options.leaveNullSlot ?? false,
      },
      options.signal,
    );
  }

  putModularLoadout(
    loadoutType: ModularLoadoutValue,
    presetId: number,
    data: ModularLoadoutInput,
    signal?: AbortSignal,
  ): Promise<MCPResponse> {
    const loadout: Record<string, unknown> = { slots: modularSlots(data.slots) };
    if (typeof data.displayName === 'string') loadout['display_name'] = data.displayName;
    return this.athenaOp(
      'PutModularCosmeticLoadout',
      { loadoutType, presetId, loadoutData: JSON.stringify(loadout) },
      signal,
    );
  }

  equipModularPreset(
    loadoutType: ModularLoadoutValue,
    presetId: number,
    signal?: AbortSignal,
  ): Promise<MCPResponse> {
    return this.athenaOp('EquipModularCosmeticLoadoutPreset', { loadoutType, presetId }, signal);
  }

  deleteModularLoadout(
    loadoutType: ModularLoadoutValue,
    presetId: number,
    signal?: AbortSignal,
  ): Promise<MCPResponse> {
    return this.athenaOp('DeleteModularCosmeticLoadout', { loadoutType, presetId }, signal);
  }

  setRandomLoadout(enabled: boolean, signal?: AbortSignal): Promise<MCPResponse> {
    return this.athenaOp('SetRandomCosmeticLoadoutFlag', { random: enabled }, signal);
  }

  setShuffleEnabled(
    loadoutType: ModularLoadoutValue,
    enabled: boolean,
    signal?: AbortSignal,
  ): Promise<MCPResponse> {
    return this.athenaOp('SetLoadoutShuffleEnabled', { loadoutType, bEnabled: enabled }, signal);
  }

  private athenaOp(operation: MCPOperation, payload: Record<string, unknown>, signal?: AbortSignal): Promise<MCPResponse> {
    return this.session.mcpOperation(operation, {
      profileId: 'athena',
      payload,
      ...(signal ? { signal } : {}),
    });
  }

  private async lockerContext(signal?: AbortSignal): Promise<{ defaultItem: string | null; loadouts: string[] }> {
    if (this.lockerContextCache) return this.lockerContextCache;
    const response = await this.session.queryProfile('athena', signal ? { signal } : {});
    const profile = extractProfile(response);
    const items = (profile['items'] ?? {}) as Record<string, RawItem>;
    const attributes = ((profile['stats'] as Record<string, unknown> | undefined)?.['attributes'] ??
      {}) as Record<string, unknown>;

    const loadouts = Array.isArray(attributes['loadouts'])
      ? (attributes['loadouts'] as unknown[]).filter((guid): guid is string => typeof guid === 'string')
      : [];
    const lastApplied = typeof attributes['last_applied_loadout'] === 'string'
      ? (attributes['last_applied_loadout'] as string)
      : null;

    let defaultItem = lastApplied ?? loadouts[0] ?? null;
    if (!defaultItem) {
      for (const [guid, raw] of Object.entries(items)) {
        if (raw.templateId === LOCKER_ITEM_TEMPLATE) {
          defaultItem = guid;
          break;
        }
      }
    }

    this.lockerContextCache = { defaultItem, loadouts };
    return this.lockerContextCache;
  }

  private async resolveLockerItem(target: LockerSlotTarget): Promise<string> {
    if (target.lockerItem) return target.lockerItem;
    const context = await this.lockerContext(target.signal);
    if (typeof target.preset === 'number') {
      const guid = context.loadouts[target.preset];
      if (!guid) throw new ValidationError(`No locker preset at index ${target.preset}`, 'preset');
      return guid;
    }
    if (!context.defaultItem) {
      throw new ValidationError('Could not find the athena cosmetic locker on this profile', 'lockerItem');
    }
    return context.defaultItem;
  }

  private async applyLockerService(
    loadout: LockerLoadout,
    items: Record<string, RawItem>,
    signal?: AbortSignal,
  ): Promise<void> {
    try {
      const response = await this.session.lockerItems(signal ? { signal } : {});
      if (response.activeLoadoutGroup) mergeActiveLoadout(loadout, response.activeLoadoutGroup, items);
    } catch {
      // The EOS locker service may be unavailable (e.g. a client_credentials session); keep the athena result.
    }
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
    const groups: AnyCosmetic[][] = [
      all.br,
      all.tracks,
      all.instruments,
      all.cars,
      all.lego,
      all.legoKits,
      all.beans,
    ];
    for (const group of groups) {
      for (const cosmetic of group) {
        map.set(cosmetic.id.toLowerCase(), cosmetic);
      }
    }
    this.cosmeticMapCache = map;
    return map;
  }
}

export class LockerPresetBuilder {
  private readonly slots: LockerPresetSlot[] = [];
  private presetName: string | null = null;

  constructor(private readonly locker: Locker) {}

  slot(
    category: LockerCategoryValue,
    itemId: string | null,
    options: LockerPresetSlotOptions = {},
  ): this {
    const slotIndex = options.slotIndex ?? 0;
    const entry: LockerPresetSlot = {
      category,
      itemId,
      slotIndex,
      variants: options.variants ?? [],
    };
    const existing = this.slots.findIndex(
      (slot) => slot.category === category && slot.slotIndex === slotIndex,
    );
    if (existing >= 0) this.slots[existing] = entry;
    else this.slots.push(entry);
    return this;
  }

  character(itemId: string | null, options: LockerPresetSlotOptions = {}): this {
    return this.slot('Character', itemId, { ...options, slotIndex: 0 });
  }

  backpack(itemId: string | null, options: LockerPresetSlotOptions = {}): this {
    return this.slot('Backpack', itemId, { ...options, slotIndex: 0 });
  }

  pickaxe(itemId: string | null, options: LockerPresetSlotOptions = {}): this {
    return this.slot('Pickaxe', itemId, { ...options, slotIndex: 0 });
  }

  glider(itemId: string | null, options: LockerPresetSlotOptions = {}): this {
    return this.slot('Glider', itemId, { ...options, slotIndex: 0 });
  }

  contrail(itemId: string | null, options: LockerPresetSlotOptions = {}): this {
    return this.slot('SkyDiveContrail', itemId, { ...options, slotIndex: 0 });
  }

  musicPack(itemId: string | null, options: LockerPresetSlotOptions = {}): this {
    return this.slot('MusicPack', itemId, { ...options, slotIndex: 0 });
  }

  loadingScreen(itemId: string | null, options: LockerPresetSlotOptions = {}): this {
    return this.slot('LoadingScreen', itemId, { ...options, slotIndex: 0 });
  }

  emote(slotIndex: number, itemId: string | null, options: LockerPresetSlotOptions = {}): this {
    return this.slot('Dance', itemId, { ...options, slotIndex });
  }

  wrap(slotIndex: number, itemId: string | null, options: LockerPresetSlotOptions = {}): this {
    return this.slot('ItemWrap', itemId, { ...options, slotIndex });
  }

  clear(category: LockerCategoryValue, slotIndex = 0): this {
    return this.slot(category, null, { slotIndex });
  }

  name(name: string): this {
    this.presetName = name;
    return this;
  }

  get size(): number {
    return this.slots.length;
  }

  build(): LockerPresetSlot[] {
    return this.slots.map((slot) => ({ ...slot, variants: [...slot.variants] }));
  }

  apply(options: LockerSlotTarget = {}): Promise<MCPResponse> {
    const applyOptions: ApplyPresetOptions = { ...options };
    if (this.presetName !== null) applyOptions.name = this.presetName;
    return this.locker.applyPreset(this.build(), applyOptions);
  }

  save(options: LockerSlotTarget = {}): Promise<MCPResponse> {
    return this.apply(options);
  }
}

function extractProfile(response: MCPResponse): Record<string, unknown> {
  const changes = response.profileChanges as Array<Record<string, unknown>>;
  const full = changes.find((change) => change['changeType'] === 'fullProfileUpdate');
  return (full?.['profile'] ?? {}) as Record<string, unknown>;
}

function parseItems(items: Record<string, RawItem>): LockerItem[] {
  const result: LockerItem[] = [];
  for (const [id, raw] of Object.entries(items)) {
    if (typeof raw.templateId !== 'string') continue;
    const { type, cosmeticId } = templateParts(raw.templateId);
    if (!COSMETIC_TYPE.test(type)) continue;

    result.push({
      id,
      templateId: raw.templateId,
      type,
      cosmeticId,
      favorite: raw.attributes?.favorite === true,
      seen: raw.attributes?.item_seen === true,
      variants: (raw.attributes?.variants ?? []).map((variant) => ({
        channel: variant.channel ?? '',
        active: variant.active ?? '',
        owned: variant.owned ?? [],
      })),
      name: null,
      cosmetic: null,
      imageUrl: null,
    });
  }
  return result;
}

function slotFrom(value: unknown, items: Record<string, RawItem>): LockerSlot | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  let templateId = value;
  if (!value.includes(':')) {
    const item = items[value];
    if (typeof item?.templateId !== 'string') return null;
    templateId = item.templateId;
  }
  const { type, cosmeticId } = templateParts(templateId);
  return { type, cosmeticId, name: null, cosmetic: null, imageUrl: null };
}

function appliedLoadoutSlots(
  attributes: Record<string, unknown>,
  items: Record<string, RawItem>,
): Record<string, { items?: string[] }> | undefined {
  const applied = attributes['last_applied_loadout'];
  let loadout = typeof applied === 'string' ? items[applied] : undefined;

  if (!loadout) {
    const loadouts = Array.isArray(attributes['loadouts']) ? (attributes['loadouts'] as unknown[]) : [];
    const index = typeof attributes['active_loadout_index'] === 'number' ? attributes['active_loadout_index'] : 0;
    const guid = loadouts[index] ?? loadouts[0];
    if (typeof guid === 'string') loadout = items[guid];
  }

  if (!loadout) {
    const entry = Object.values(items).find((item) => item.attributes?.locker_slots_data?.slots);
    loadout = entry;
  }

  return loadout?.attributes?.locker_slots_data?.slots;
}

function parseLoadout(attributes: Record<string, unknown>, items: Record<string, RawItem>): LockerLoadout {
  const slots = appliedLoadoutSlots(attributes, items);

  const single = (slotKey: string, legacyKey: string): LockerSlot | null => {
    const equipped = slots?.[slotKey]?.items?.find((value) => typeof value === 'string' && value.length > 0);
    if (equipped) return slotFrom(equipped, items);
    return slotFrom(attributes[legacyKey], items);
  };

  const many = (slotKey: string, legacyKey: string): LockerSlot[] => {
    const fromSlots = (slots?.[slotKey]?.items ?? []).map((value) => slotFrom(value, items)).filter(nonNull);
    if (fromSlots.length > 0) return fromSlots;
    const legacy = Array.isArray(attributes[legacyKey]) ? (attributes[legacyKey] as unknown[]) : [];
    return legacy.map((value) => slotFrom(value, items)).filter(nonNull);
  };

  return {
    character: single('Character', 'favorite_character'),
    backpack: single('Backpack', 'favorite_backpack'),
    pickaxe: single('Pickaxe', 'favorite_pickaxe'),
    glider: single('Glider', 'favorite_glider'),
    contrail: single('SkyDiveContrail', 'favorite_skydivecontrail'),
    musicPack: single('MusicPack', 'favorite_musicpack'),
    loadingScreen: single('LoadingScreen', 'favorite_loadingscreen'),
    dances: many('Dance', 'favorite_dance'),
    itemWraps: many('ItemWrap', 'favorite_itemwraps'),
  };
}

function slotTemplateName(slotTemplate: string): string {
  const key = slotTemplate.split(':').pop() ?? slotTemplate;
  return key;
}

function mergeActiveLoadout(
  loadout: LockerLoadout,
  group: LockerActiveLoadoutGroup,
  items: Record<string, RawItem>,
): void {
  const dances: LockerSlot[] = [];
  for (const schema of Object.values(group.loadouts ?? {})) {
    for (const slot of schema.loadoutSlots ?? []) {
      if (!slot.equippedItemId) continue;
      const parsed = slotFrom(slot.equippedItemId, items);
      if (!parsed) continue;
      const name = slotTemplateName(slot.slotTemplate);
      if (name.startsWith('LoadoutSlot_Emote')) {
        dances.push(parsed);
        continue;
      }
      const key = LOCKER_SLOT_NAMES[name];
      if (key) (loadout[key] as LockerSlot) = parsed;
    }
  }
  if (dances.length > 0) loadout.dances = dances;
}

function loadoutSlots(loadout: LockerLoadout): LockerSlot[] {
  return [
    loadout.character,
    loadout.backpack,
    loadout.pickaxe,
    loadout.glider,
    loadout.contrail,
    loadout.musicPack,
    loadout.loadingScreen,
    ...loadout.dances,
    ...loadout.itemWraps,
  ].filter(nonNull);
}

function enrichSlot(slot: LockerItem | LockerSlot, map: Map<string, AnyCosmetic>): void {
  const cosmetic = map.get(slot.cosmeticId.toLowerCase()) ?? null;
  slot.cosmetic = cosmetic;
  slot.name = cosmetic ? cosmeticName(cosmetic) : null;
  slot.imageUrl = cosmetic ? cosmeticImage(cosmetic) : null;
}

function nonNull<T>(value: T | null): value is T {
  return value !== null;
}

function buildItemToSlot(category: LockerCategoryValue, itemId: string | null | undefined): string {
  if (!itemId) return '';
  if (itemId.includes(':')) return itemId;
  return `${CATEGORY_BACKEND[category]}:${itemId}`;
}

function normalizeVariant(variant: LockerVariantUpdate): { channel: string; active: string; owned: string[] } {
  return { channel: variant.channel, active: variant.active, owned: variant.owned ?? [] };
}

function modularSlots(slots: ModularSlotInput[]): Array<Record<string, unknown>> {
  return slots.map((slot) => {
    const entry: Record<string, unknown> = { slot_template: slot.slotTemplate };
    if (slot.equippedItem) entry['equipped_item'] = slot.equippedItem;
    if (slot.customizations && slot.customizations.length > 0) {
      entry['customization_info'] = slot.customizations.map((info) => ({
        channel_tag: info.channelTag,
        variant_tag: info.variantTag,
      }));
    }
    return entry;
  });
}

function bannerName(value: string): string {
  const idx = value.indexOf(':');
  return idx < 0 ? value : value.slice(idx + 1);
}
