import { describe, expect, it, vi } from 'vitest';
import { LOCKER_SLOTS, Locker, decodeRichColor, encodeRichColor } from '../../src/locker.js';
import { ValidationError } from '../../src/core/errors.js';
import type { EpicAuthSession } from '../../src/epic/session.js';
import type {
  LockerActiveLoadoutGroup,
  LockerCosmeticData,
  LockerItemsResponse,
  LockerSchemaLoadout,
} from '../../src/epic/eos.js';
import type { AllCosmetics } from '../../src/fortnite/types.js';

const CHARACTER = 'CosmeticLoadout:LoadoutSchema_Character';
const EMOTES = 'CosmeticLoadout:LoadoutSchema_Emotes';
const VEHICLE = 'CosmeticLoadout:LoadoutSchema_Vehicle';
const template = (name: string): string => `CosmeticLoadoutSlotTemplate:LoadoutSlot_${name}`;

function activeGroup(): LockerActiveLoadoutGroup {
  return {
    accountId: 'ACC',
    athenaItemId: 'group-guid',
    updatedTime: '2026-10-09T00:00:00Z',
    loadouts: {
      [CHARACTER]: {
        shuffleType: 'DISABLED',
        loadoutSlots: [
          {
            slotTemplate: template('Character'),
            equippedItemId: 'AthenaCharacter:cid_028_athena_commando_f',
            itemCustomizations: [{ channelTag: 'Material', variantTag: 'Mat2' }],
          },
          { slotTemplate: template('Backpack'), itemCustomizations: [] },
          { slotTemplate: template('Glider'), equippedItemId: 'AthenaGlider:umbrella_test', itemCustomizations: [] },
        ],
      },
      [EMOTES]: {
        loadoutSlots: [
          { slotTemplate: template('Emote_0'), equippedItemId: 'AthenaDance:eid_floss', itemCustomizations: [] },
          { slotTemplate: template('Emote_1'), equippedItemId: 'AthenaDance:eid_wave', itemCustomizations: [] },
        ],
      },
      [VEHICLE]: {
        loadoutSlots: [
          {
            slotTemplate: template('Vehicle_Body'),
            equippedItemId: 'VehicleCosmetics_Body:carbody_test',
            itemCustomizations: [
              { channelTag: 'Vehicle.Body.Color', variantTag: 'RichColor', additionalData: '3DA3D70A3DA3D70A3DA3D70A3F800000' },
            ],
          },
        ],
      },
      'CosmeticLoadout:LoadoutSchema_Platform': {
        loadoutSlots: [
          {
            slotTemplate: template('LoadingScreen'),
            equippedItemId: 'AthenaLoadingScreen:lsid_random',
            resolvedEquippedItemId: 'AthenaLoadingScreen:lsid_143_summerdays',
            itemCustomizations: [],
          },
        ],
      },
      'CosmeticLoadout:LoadoutSchema_Future': {
        loadoutSlots: [{ slotTemplate: template('Future'), equippedItemId: 'FutureThing:x', itemCustomizations: [] }],
      },
    },
  };
}

const itemsResponse = (): LockerItemsResponse => ({
  activeLoadoutGroup: activeGroup(),
  loadoutGroupPresets: [
    {
      accountId: 'ACC',
      athenaItemId: 'preset-item',
      deploymentId: 'dep',
      presetId: 'loadoutgrouppreset-1',
      displayName: 'Sweaty',
      presetFavoriteStatus: 'FAVORITED',
      loadouts: { [CHARACTER]: activeGroup().loadouts[CHARACTER]! },
    },
  ],
  loadoutPresets: [
    {
      accountId: 'ACC',
      athenaItemId: 'schema-item-2',
      deploymentId: 'dep',
      presetId: '0002',
      presetIndex: 2,
      loadoutType: EMOTES,
      loadoutSlots: [{ slotTemplate: template('Emote_0'), equippedItemId: 'AthenaDance:eid_wave' }],
    },
    {
      accountId: 'ACC',
      athenaItemId: 'schema-item-1',
      deploymentId: 'dep',
      presetId: '0001',
      presetIndex: 1,
      displayName: 'Emotes A',
      loadoutType: EMOTES,
      loadoutSlots: [{ slotTemplate: template('Emote_0'), equippedItemId: 'AthenaDance:eid_floss' }],
    },
  ],
});

const owned: LockerCosmeticData[] = [
  {
    templateId: 'AthenaCharacter:cid_028_athena_commando_f',
    cosmeticItemId: 'AthenaCharacter:cid_028_athena_commando_f',
    athenaItemId: 'guid-cid',
    activeVariants: { Material: { variantTag: 'Mat2' } },
    ownedVariants: { Material: [{ variantTag: 'Mat3' }] },
    favoriteStatus: 'FAVORITED',
    creationTime: '2019-01-01T00:00:00Z',
    updatedTime: '2020-01-01T00:00:00Z',
  },
  {
    templateId: 'AthenaDance:eid_floss',
    cosmeticItemId: 'AthenaDance:eid_floss',
    athenaItemId: 'guid-eid',
    activeVariants: {},
    itemSeenStatus: 'UNSEEN',
    lockedIn: false,
  },
  {
    templateId: 'CosmeticMimosa:companion_test',
    cosmeticItemId: 'CosmeticMimosa:companion_test',
    athenaItemId: 'guid-pet',
    activeVariants: {},
  },
];

function cosmeticSource(): { all: () => Promise<AllCosmetics> } {
  const br = [
    { id: 'CID_028_Athena_Commando_F', name: 'Renegade Raider', images: { icon: 'https://img/cid.png' } },
    { id: 'EID_Floss', name: 'Floss', images: { icon: 'https://img/floss.png' } },
  ];
  const all = { br, tracks: [], instruments: [], cars: [], lego: [], legoKits: [], beans: [] };
  return { all: () => Promise.resolve(all as unknown as AllCosmetics) };
}

function mockSession() {
  const setActiveLoadoutGroup = vi.fn(async (group: { loadouts: Record<string, LockerSchemaLoadout> }) => ({
    ...activeGroup(),
    ...group,
  }));
  const fns = {
    lockerItems: vi.fn(async () => itemsResponse()),
    lockerCosmetics: vi.fn(async () => owned),
    setActiveLoadoutGroup,
    putLoadoutGroupPreset: vi.fn(async (presetId: string, preset: Record<string, unknown>) => ({
      accountId: 'ACC',
      deploymentId: 'dep',
      presetId,
      ...preset,
    })),
    updateLoadoutGroupPreset: vi.fn(async (presetId: string, preset: Record<string, unknown>) => ({
      accountId: 'ACC',
      deploymentId: 'dep',
      athenaItemId: 'preset-item',
      presetId,
      ...preset,
    })),
    deleteLoadoutGroupPreset: vi.fn(async () => ({})),
    setCompanionName: vi.fn(async () => undefined),
    lockInImmutableItem: vi.fn(async (_itemIdentifier: string, _variants: unknown) => undefined),
    mcpOperation: vi.fn(async () => ({ profileRevision: 6, profileId: 'athena', profileChanges: [] })),
  };
  const session = { accountId: 'ACC', ...fns } as unknown as EpicAuthSession;
  return { session, ...fns };
}

function sentLoadouts(fn: ReturnType<typeof vi.fn>): Record<string, LockerSchemaLoadout> {
  return (fn.mock.calls.at(-1)![0] as { loadouts: Record<string, LockerSchemaLoadout> }).loadouts;
}

function sentSlot(fn: ReturnType<typeof vi.fn>, schema: string, name: string) {
  return sentLoadouts(fn)[schema]!.loadoutSlots.find((entry) => entry.slotTemplate === template(name));
}

describe('Locker reading (v4)', () => {
  it('maps owned cosmetic-data into locker items', async () => {
    const { session } = mockSession();
    const items = await new Locker(session).items();
    expect(items[0]).toMatchObject({
      id: 'guid-cid',
      type: 'AthenaCharacter',
      cosmeticId: 'cid_028_athena_commando_f',
      favorite: true,
      seen: true,
      lockedIn: null,
      variants: [{ channel: 'Material', active: 'Mat2', activeData: null, owned: ['Mat2', 'Mat3'] }],
      createdAt: '2019-01-01T00:00:00Z',
    });
    expect(items[1]).toMatchObject({ favorite: false, seen: false, lockedIn: false, variants: [] });
  });

  it('maps the active loadout group into named slots', async () => {
    const { session } = mockSession();
    const loadout = await new Locker(session).loadout();
    expect(loadout.character).toMatchObject({
      slot: 'character',
      templateId: 'AthenaCharacter:cid_028_athena_commando_f',
      variants: [{ channel: 'Material', variant: 'Mat2' }],
    });
    expect(loadout.backpack).toBeNull();
    expect(loadout.emotes.map((emote) => emote?.cosmeticId ?? null)).toEqual([
      'eid_floss', 'eid_wave', null, null, null, null, null, null,
    ]);
    expect(loadout.wraps).toHaveLength(7);
    expect(loadout.car.body?.variants[0]?.additionalData).toBe('3DA3D70A3DA3D70A3DA3D70A3F800000');
    expect(loadout.loadingScreen?.resolvedTemplateId).toBe('AthenaLoadingScreen:lsid_143_summerdays');
    expect(loadout.other.map((entry) => entry.templateId)).toEqual(['FutureThing:x']);
    expect(loadout.shuffle[CHARACTER]).toBe('DISABLED');
  });

  it('fetches presets, schema presets in index order, and can skip cosmetic-data', async () => {
    const { session, lockerCosmetics } = mockSession();
    const snapshot = await new Locker(session).fetch({ items: false });
    expect(lockerCosmetics).not.toHaveBeenCalled();
    expect(snapshot.items).toEqual([]);
    expect(snapshot.presets[0]).toMatchObject({ id: 'loadoutgrouppreset-1', name: 'Sweaty', favorite: true, itemId: 'preset-item' });
    expect(snapshot.schemaPresets.map((preset) => preset.index)).toEqual([1, 2]);
    expect(snapshot.schemaPresets[0]?.items[0]?.slot).toBe('emote0');
  });

  it('enriches items and equipped slots from a cosmetics source', async () => {
    const { session } = mockSession();
    const snapshot = await new Locker(session, cosmeticSource()).fetch({ enrich: true });
    expect(snapshot.items[0]?.name).toBe('Renegade Raider');
    expect(snapshot.loadout.character?.imageUrl).toBe('https://img/cid.png');
    expect(snapshot.loadout.emotes[0]?.name).toBe('Floss');
    await expect(new Locker(session).fetch({ enrich: true })).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('Locker equipping (v4)', () => {
  it('rewrites only the target slot and sends every loadout back', async () => {
    const { session, setActiveLoadoutGroup } = mockSession();
    const loadout = await new Locker(session).equipEmote('EID_Hype', 1);

    expect(sentSlot(setActiveLoadoutGroup, EMOTES, 'Emote_1')).toEqual({
      slotTemplate: template('Emote_1'),
      equippedItemId: 'AthenaDance:eid_hype',
      itemCustomizations: [],
    });
    expect(sentSlot(setActiveLoadoutGroup, EMOTES, 'Emote_0')?.equippedItemId).toBe('AthenaDance:eid_floss');
    expect(Object.keys(sentLoadouts(setActiveLoadoutGroup))).toHaveLength(5);
    expect(sentSlot(setActiveLoadoutGroup, 'CosmeticLoadout:LoadoutSchema_Platform', 'LoadingScreen')).not.toHaveProperty(
      'resolvedEquippedItemId',
    );
    expect(loadout.emotes[1]?.cosmeticId).toBe('eid_hype');
  });

  it('keeps styles when re-equipping the same item and resets them for a new one', async () => {
    const { session, setActiveLoadoutGroup } = mockSession();
    const locker = new Locker(session);
    await locker.equipOutfit('CID_028_Athena_Commando_F');
    expect(sentSlot(setActiveLoadoutGroup, CHARACTER, 'Character')?.itemCustomizations).toEqual([
      { channelTag: 'Material', variantTag: 'Mat2' },
    ]);
    await locker.equipOutfit('cid_999', { variants: [{ channel: 'Progressive', variant: 'Stage2' }] });
    expect(sentSlot(setActiveLoadoutGroup, CHARACTER, 'Character')).toMatchObject({
      equippedItemId: 'AthenaCharacter:cid_999',
      itemCustomizations: [{ channelTag: 'Progressive', variantTag: 'Stage2' }],
    });
  });

  it('fills empty and missing slots, adds missing schemas, and clears slots', async () => {
    const { session, setActiveLoadoutGroup } = mockSession();
    const locker = new Locker(session);
    await locker.equipBackpack('bid_001');
    expect(sentSlot(setActiveLoadoutGroup, CHARACTER, 'Backpack')?.equippedItemId).toBe('AthenaBackpack:bid_001');

    await locker.equipInstrument('guitar', 'sparks_guitar_x');
    expect(sentSlot(setActiveLoadoutGroup, 'CosmeticLoadout:LoadoutSchema_Sparks', 'Guitar')?.equippedItemId).toBe(
      'SparksGuitar:sparks_guitar_x',
    );

    await locker.clear('glider');
    expect(sentSlot(setActiveLoadoutGroup, CHARACTER, 'Glider')).toEqual({
      slotTemplate: template('Glider'),
      itemCustomizations: [],
    });
  });

  it('equips a wrap into every slot, banners together, and picks song types for lobby music', async () => {
    const { session, setActiveLoadoutGroup } = mockSession();
    const locker = new Locker(session);
    await locker.equipWrap('wrap_006_ice');
    const wraps = sentLoadouts(setActiveLoadoutGroup)['CosmeticLoadout:LoadoutSchema_Wraps']!.loadoutSlots;
    expect(wraps.map((entry) => entry.equippedItemId)).toEqual(Array(7).fill('AthenaItemWrap:wrap_006_ice'));

    await locker.setBanner('brs10doublepump', 'defaultcolor22');
    expect(sentSlot(setActiveLoadoutGroup, 'CosmeticLoadout:LoadoutSchema_Platform', 'Banner_Icon')?.equippedItemId).toBe(
      'HomebaseBannerIcon:brs10doublepump',
    );

    await locker.equipLobbyMusic('sid_placeholder_1');
    expect(sentSlot(setActiveLoadoutGroup, 'CosmeticLoadout:LoadoutSchema_Platform', 'LobbyMusic')?.equippedItemId).toBe(
      'SparksSong:sid_placeholder_1',
    );
    await locker.equipLobbyMusic('MusicPack_001');
    expect(sentSlot(setActiveLoadoutGroup, 'CosmeticLoadout:LoadoutSchema_Platform', 'LobbyMusic')?.equippedItemId).toBe(
      'AthenaMusicPack:musicpack_001',
    );
  });

  it('validates slot indexes and untyped slots before any request', async () => {
    const { session, lockerItems } = mockSession();
    const locker = new Locker(session);
    expect(() => locker.equipEmote('eid_x', 8)).toThrow(ValidationError);
    expect(() => locker.equipWrap('wrap_x', 7)).toThrow(ValidationError);
    expect(() => locker.equip('carMacaron', 'thing')).toThrow(ValidationError);
    expect(() => locker.equipMany({})).toThrow(ValidationError);
    expect(lockerItems).not.toHaveBeenCalled();
    await locker.equip('carMacaron', 'VehicleCosmetics_Macaron:thing');
  });

  it('merges style changes and recolours RichColor channels', async () => {
    const { session, setActiveLoadoutGroup } = mockSession();
    const locker = new Locker(session);
    await locker.setVariants('character', [{ channel: 'Parts', variant: 'Stage1' }]);
    expect(sentSlot(setActiveLoadoutGroup, CHARACTER, 'Character')?.itemCustomizations).toEqual([
      { channelTag: 'Material', variantTag: 'Mat2' },
      { channelTag: 'Parts', variantTag: 'Stage1' },
    ]);

    await locker.setColor('carBody', '#ff0000');
    expect(sentSlot(setActiveLoadoutGroup, VEHICLE, 'Vehicle_Body')?.itemCustomizations?.[0]?.additionalData).toBe(
      '3F80000000000000000000003F800000',
    );
    await expect(locker.setColor('glider', '#fff')).rejects.toBeInstanceOf(ValidationError);
    await expect(locker.setVariants('backpack', [{ channel: 'a', variant: 'b' }])).rejects.toBeInstanceOf(ValidationError);
  });

  it('runs equips one after another so concurrent edits do not overwrite each other', async () => {
    const { session, setActiveLoadoutGroup, lockerItems } = mockSession();
    let group = activeGroup();
    lockerItems.mockImplementation(async () => ({ activeLoadoutGroup: structuredClone(group) }));
    setActiveLoadoutGroup.mockImplementation(async (next) => {
      group = { ...group, loadouts: next.loadouts };
      return group;
    });
    const locker = new Locker(session);
    await Promise.all([locker.equipEmote('eid_a', 2), locker.equipEmote('eid_b', 3)]);
    const emotes = group.loadouts[EMOTES]!.loadoutSlots.map((entry) => entry.equippedItemId);
    expect(emotes).toContain('AthenaDance:eid_a');
    expect(emotes).toContain('AthenaDance:eid_b');
  });

  it('restores a previously captured loadout', async () => {
    const { session, setActiveLoadoutGroup } = mockSession();
    const locker = new Locker(session);
    const before = await locker.loadout();
    await locker.restore(before);
    expect(sentLoadouts(setActiveLoadoutGroup)[CHARACTER]?.loadoutSlots[0]?.equippedItemId).toBe(
      'AthenaCharacter:cid_028_athena_commando_f',
    );
  });
});

describe('Locker presets (v4)', () => {
  it('saves the current loadout as a new group preset', async () => {
    const { session, putLoadoutGroupPreset } = mockSession();
    const preset = await new Locker(session).savePreset('Tryhard');
    const [presetId, body] = putLoadoutGroupPreset.mock.calls[0] as [string, Record<string, unknown>];
    expect(presetId).toMatch(/^loadoutgrouppreset-[0-9a-f-]{36}$/);
    expect(body).toMatchObject({ displayName: 'Tryhard' });
    expect(Object.keys(body['loadouts'] as object)).toHaveLength(5);
    expect(preset.name).toBe('Tryhard');
    await expect(new Locker(session).savePreset('  ')).rejects.toBeInstanceOf(ValidationError);
  });

  it('renames through PATCH, applies with the preset ids, and deletes', async () => {
    const { session, updateLoadoutGroupPreset, setActiveLoadoutGroup, deleteLoadoutGroupPreset } = mockSession();
    const locker = new Locker(session);
    const renamed = await locker.renamePreset('Sweaty', 'Chill');
    expect(updateLoadoutGroupPreset.mock.calls[0]?.[0]).toBe('loadoutgrouppreset-1');
    expect(renamed.name).toBe('Chill');

    await locker.applyPreset('loadoutgrouppreset-1');
    expect(setActiveLoadoutGroup.mock.calls[0]?.[0]).toMatchObject({
      equippedPresetId: 'loadoutgrouppreset-1',
      equippedPresetItemId: 'preset-item',
    });

    await locker.deletePreset('loadoutgrouppreset-1');
    expect(deleteLoadoutGroupPreset).toHaveBeenCalledWith('loadoutgrouppreset-1', {});
    await expect(locker.applyPreset('nope')).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('Locker item actions', () => {
  it('names a companion and locks in an item using templateId:guid', async () => {
    const { session, setCompanionName, lockInImmutableItem } = mockSession();
    const locker = new Locker(session);
    await locker.setCompanionName('companion_test', 'Pebble');
    expect(setCompanionName).toHaveBeenCalledWith('CosmeticMimosa:companion_test:guid-pet', 'Pebble', {});

    await locker.lockInItem('guid-pet', { 'Immutable.AdditivePose': { variantTag: 'Stage0' } });
    expect(lockInImmutableItem.mock.calls[0]?.[0]).toBe('CosmeticMimosa:companion_test:guid-pet');
    await expect(locker.setCompanionName('companion_missing', 'x')).rejects.toBeInstanceOf(ValidationError);
  });

  it('favourites and marks seen through athena MCP', async () => {
    const { session, mcpOperation } = mockSession();
    const locker = new Locker(session);
    await locker.setFavorite(['a', 'b'], false);
    expect(mcpOperation).toHaveBeenCalledWith('SetItemFavoriteStatusBatch', {
      profileId: 'athena',
      payload: { itemIds: ['a', 'b'], itemFavStatus: [false, false] },
    });
    await locker.markSeen(['a']);
    expect(mcpOperation).toHaveBeenLastCalledWith('MarkItemSeen', { profileId: 'athena', payload: { itemIds: ['a'] } });
    expect(() => locker.setFavorite([])).toThrow(ValidationError);
    expect(() => locker.markSeen([])).toThrow(ValidationError);
  });
});

describe('RichColor encoding', () => {
  it('round-trips hex and float colours', () => {
    expect(encodeRichColor('#ffffff')).toBe('3F8000003F8000003F8000003F800000');
    expect(encodeRichColor('#000')).toBe('0000000000000000000000003F800000');
    expect(encodeRichColor('7f7fc99e7f7fc99e7f7fc99e7f7fc99e')).toBe('7F7FC99E7F7FC99E7F7FC99E7F7FC99E');
    expect(decodeRichColor('3DA3D70A3DA3D70A3DA3D70A3F800000')?.r).toBeCloseTo(0.08);
    expect(decodeRichColor(encodeRichColor({ r: 0.25, g: 0.5, b: 0.75, a: 1 }))).toEqual({ r: 0.25, g: 0.5, b: 0.75, a: 1 });
    expect(decodeRichColor('nope')).toBeNull();
    expect(() => encodeRichColor('#12345')).toThrow(ValidationError);
  });

  it('covers every schema with a slot definition', () => {
    expect(Object.keys(LOCKER_SLOTS)).toHaveLength(7 + 8 + 7 + 4 + 5 + 8 + 7 + 7 + 3);
  });
});
