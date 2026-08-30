import { describe, expect, it, vi } from 'vitest';
import { Locker, LockerPresetBuilder } from '../../src/locker.js';
import { ValidationError } from '../../src/core/errors.js';
import type { EpicAuthSession } from '../../src/epic/session.js';
import type { AllCosmetics } from '../../src/fortnite/types.js';

const athenaProfile = {
  profileRevision: 5,
  profileId: 'athena',
  profileChangesBaseRevision: 4,
  profileCommandRevision: 3,
  serverTime: 'now',
  responseVersion: 1,
  profileChanges: [
    {
      changeType: 'fullProfileUpdate',
      profile: {
        _id: 'p',
        items: {
          'guid-cid': {
            templateId: 'AthenaCharacter:cid_028_athena_commando_f',
            attributes: {
              favorite: true,
              item_seen: true,
              variants: [{ channel: 'Material', active: 'Mat1', owned: ['Mat1', 'Mat2'] }],
            },
          },
          'guid-bid': { templateId: 'AthenaBackpack:bid_001_test', attributes: { item_seen: false } },
          'guid-eid': { templateId: 'AthenaDance:eid_floss', attributes: {} },
          'guid-locker': { templateId: 'CosmeticLocker:cosmeticlocker_athena', attributes: {} },
          'guid-currency': { templateId: 'Currency:MtxPurchased', attributes: {} },
        },
        stats: {
          attributes: {
            favorite_character: 'guid-cid',
            favorite_backpack: 'AthenaBackpack:bid_001_test',
            favorite_glider: '',
            favorite_dance: ['guid-eid', '', '', '', '', ''],
            favorite_itemwraps: [],
          },
        },
      },
    },
  ],
};

function cosmeticSource(): { all: () => Promise<AllCosmetics> } {
  const br = [
    {
      id: 'CID_028_Athena_Commando_F',
      name: 'Renegade Raider',
      description: '',
      type: { value: 'outfit', displayValue: 'Outfit', backendValue: 'AthenaCharacter' },
      rarity: { value: 'rare', displayValue: 'Rare', backendValue: 'EFortRarity::Rare' },
      images: { smallIcon: 's', icon: 'https://img/cid.png', featured: 'https://img/cid-feat.png' },
      added: '2019',
    },
    {
      id: 'BID_001_Test',
      name: 'Test Backpack',
      description: '',
      type: { value: 'backpack', displayValue: 'Back Bling', backendValue: 'AthenaBackpack' },
      rarity: { value: 'epic', displayValue: 'Epic', backendValue: 'EFortRarity::Epic' },
      images: { smallIcon: 's', icon: 'https://img/bid.png' },
      added: '2019',
    },
    {
      id: 'EID_Floss',
      name: 'Floss',
      description: '',
      type: { value: 'emote', displayValue: 'Emote', backendValue: 'AthenaDance' },
      rarity: { value: 'rare', displayValue: 'Rare', backendValue: 'EFortRarity::Rare' },
      images: { smallIcon: 's', icon: 'https://img/floss.png' },
      added: '2018',
    },
  ];
  const empty = { br, tracks: [], instruments: [], cars: [], lego: [], legoKits: [], beans: [] };
  return { all: () => Promise.resolve(empty as unknown as AllCosmetics) };
}

function mockSession(): {
  session: EpicAuthSession;
  mcp: ReturnType<typeof vi.fn>;
  queries: ReturnType<typeof vi.fn>;
} {
  const mcp = vi.fn().mockResolvedValue({ profileRevision: 6, profileChanges: [] });
  const queries = vi.fn().mockResolvedValue(athenaProfile);
  const session = {
    accountId: 'ACC',
    queryProfile: queries,
    mcpOperation: mcp,
  } as unknown as EpicAuthSession;
  return { session, mcp, queries };
}

describe('Locker.fetch parsing', () => {
  it('parses cosmetic items and skips non-cosmetics', async () => {
    const { session } = mockSession();
    const snapshot = await new Locker(session).fetch();

    expect(snapshot.accountId).toBe('ACC');
    expect(snapshot.profileRevision).toBe(5);
    expect(snapshot.items.map((i) => i.cosmeticId).sort()).toEqual([
      'bid_001_test',
      'cid_028_athena_commando_f',
      'eid_floss',
    ]);

    const cid = snapshot.items.find((i) => i.type === 'AthenaCharacter')!;
    expect(cid.favorite).toBe(true);
    expect(cid.seen).toBe(true);
    expect(cid.variants[0]).toEqual({ channel: 'Material', active: 'Mat1', owned: ['Mat1', 'Mat2'] });
    expect(cid.cosmetic).toBeNull();
    expect(cid.imageUrl).toBeNull();
  });

  it('resolves the equipped loadout from item ids and template ids', async () => {
    const { session } = mockSession();
    const loadout = await new Locker(session).loadout();

    expect(loadout.character?.cosmeticId).toBe('cid_028_athena_commando_f');
    expect(loadout.backpack?.cosmeticId).toBe('bid_001_test');
    expect(loadout.dances).toHaveLength(1);
    expect(loadout.dances[0]?.cosmeticId).toBe('eid_floss');
    expect(loadout.glider).toBeNull();
  });

  it('falls back to the EOS locker service when the athena profile has no equipped loadout', async () => {
    const migratedProfile = {
      profileRevision: 7,
      profileChanges: [
        {
          changeType: 'fullProfileUpdate',
          profile: {
            items: { 'g': { templateId: 'AthenaCharacter:cid_028_athena_commando_f', attributes: {} } },
            stats: { attributes: { locker_loadout_migration: 'LockerReadDualWrite' } },
          },
        },
      ],
    };
    const lockerItems = vi.fn().mockResolvedValue({
      activeLoadoutGroup: {
        loadouts: {
          'CosmeticLoadout:LoadoutSchema_Character': {
            loadoutSlots: [
              { slotTemplate: 'CosmeticLoadoutSlotTemplate:LoadoutSlot_Character', equippedItemId: 'AthenaCharacter:CID_405' },
              { slotTemplate: 'CosmeticLoadoutSlotTemplate:LoadoutSlot_Pickaxe', equippedItemId: 'AthenaPickaxe:Pickaxe_723' },
              { slotTemplate: 'CosmeticLoadoutSlotTemplate:LoadoutSlot_Glider', equippedItemId: 'AthenaGlider:Umbrella_12' },
            ],
          },
          'CosmeticLoadout:LoadoutSchema_Emotes': {
            loadoutSlots: [
              { slotTemplate: 'CosmeticLoadoutSlotTemplate:LoadoutSlot_Emote_1', equippedItemId: 'AthenaDance:EID_Floss' },
            ],
          },
        },
      },
    });
    const session = {
      accountId: 'ACC',
      queryProfile: vi.fn().mockResolvedValue(migratedProfile),
      lockerItems,
    } as unknown as EpicAuthSession;

    const loadout = await new Locker(session).loadout();
    expect(lockerItems).toHaveBeenCalledTimes(1);
    expect(loadout.character?.cosmeticId).toBe('CID_405');
    expect(loadout.pickaxe?.cosmeticId).toBe('Pickaxe_723');
    expect(loadout.glider?.cosmeticId).toBe('Umbrella_12');
    expect(loadout.dances[0]?.cosmeticId).toBe('EID_Floss');
  });

  it('skips the EOS locker service when useLockerService is false', async () => {
    const lockerItems = vi.fn();
    const session = {
      accountId: 'ACC',
      queryProfile: vi.fn().mockResolvedValue({ profileRevision: 1, profileChanges: [] }),
      lockerItems,
    } as unknown as EpicAuthSession;

    await new Locker(session).fetch({ useLockerService: false });
    expect(lockerItems).not.toHaveBeenCalled();
  });

  it('resolves the equipped loadout from a CosmeticLocker locker_slots_data', async () => {
    const profile = {
      profileRevision: 9,
      profileChanges: [
        {
          changeType: 'fullProfileUpdate',
          profile: {
            items: {
              'guid-locker': {
                templateId: 'CosmeticLocker:cosmeticlocker_athena',
                attributes: {
                  locker_slots_data: {
                    slots: {
                      Character: { items: ['AthenaCharacter:CID_029_Athena_Commando_F_Halloween'] },
                      Pickaxe: { items: ['AthenaPickaxe:DefaultPickaxe'] },
                      Dance: { items: ['AthenaDance:EID_Floss', '', '', '', '', ''] },
                      Glider: { items: [''] },
                    },
                  },
                },
              },
            },
            stats: {
              attributes: {
                last_applied_loadout: 'guid-locker',
                loadouts: ['guid-locker'],
                active_loadout_index: 0,
              },
            },
          },
        },
      ],
    };
    const session = {
      accountId: 'ACC',
      queryProfile: vi.fn().mockResolvedValue(profile),
    } as unknown as EpicAuthSession;

    const loadout = await new Locker(session).loadout();
    expect(loadout.character?.cosmeticId).toBe('CID_029_Athena_Commando_F_Halloween');
    expect(loadout.pickaxe?.cosmeticId).toBe('DefaultPickaxe');
    expect(loadout.dances).toHaveLength(1);
    expect(loadout.dances[0]?.cosmeticId).toBe('EID_Floss');
    expect(loadout.glider).toBeNull();
  });
});

describe('Locker enrichment', () => {
  it('attaches cosmetic data and image urls when enrich is set', async () => {
    const { session } = mockSession();
    const snapshot = await new Locker(session, cosmeticSource()).fetch({ enrich: true });

    const cid = snapshot.items.find((i) => i.cosmeticId === 'cid_028_athena_commando_f')!;
    expect(cid.name).toBe('Renegade Raider');
    expect(cid.cosmetic).not.toBeNull();
    expect(cid.imageUrl).toBe('https://img/cid.png');

    expect(snapshot.loadout.character?.imageUrl).toBe('https://img/cid.png');
    expect(snapshot.loadout.backpack?.imageUrl).toBe('https://img/bid.png');
    expect(snapshot.loadout.dances[0]?.imageUrl).toBe('https://img/floss.png');
  });

  it('caches the cosmetic source across calls', async () => {
    const source = cosmeticSource();
    const spy = vi.spyOn(source, 'all');
    const { session } = mockSession();
    const locker = new Locker(session, source);

    await locker.fetch({ enrich: true });
    await locker.resolveImage('CID_028_Athena_Commando_F');

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('resolveImage looks up an image by cosmetic id, case-insensitively', async () => {
    const { session } = mockSession();
    const locker = new Locker(session, cosmeticSource());
    expect(await locker.resolveImage('cid_028_athena_commando_f')).toBe('https://img/cid.png');
    expect(await locker.resolveImage('Nope')).toBeNull();
  });

  it('throws when enrichment is requested without a cosmetics source', async () => {
    const { session } = mockSession();
    await expect(new Locker(session).fetch({ enrich: true })).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('Locker mutations', () => {
  it('setFavorite calls SetItemFavoriteStatusBatch on the athena profile', async () => {
    const { session, mcp } = mockSession();
    await new Locker(session).setFavorite(['a', 'b'], true);

    expect(mcp).toHaveBeenCalledWith('SetItemFavoriteStatusBatch', {
      profileId: 'athena',
      payload: { itemIds: ['a', 'b'], itemFavStatus: [true, true] },
    });
  });

  it('markSeen calls MarkItemSeen', async () => {
    const { session, mcp } = mockSession();
    await new Locker(session).markSeen(['a']);

    expect(mcp).toHaveBeenCalledWith('MarkItemSeen', {
      profileId: 'athena',
      payload: { itemIds: ['a'] },
    });
  });

  it('rejects empty item id lists', () => {
    const { session } = mockSession();
    expect(() => new Locker(session).setFavorite([])).toThrow(ValidationError);
    expect(() => new Locker(session).markSeen([])).toThrow(ValidationError);
  });
});

describe('Locker editing', () => {
  it('equipOutfit resolves the locker item and builds a full templateId', async () => {
    const { session, mcp } = mockSession();
    await new Locker(session).equipOutfit('CID_028_Athena_Commando_F');

    expect(mcp).toHaveBeenCalledWith('SetCosmeticLockerSlot', {
      profileId: 'athena',
      payload: {
        lockerItem: 'guid-locker',
        category: 'Character',
        itemToSlot: 'AthenaCharacter:CID_028_Athena_Commando_F',
        slotIndex: 0,
        variantUpdates: [],
      },
    });
  });

  it('keeps a full templateId as-is when one is passed', async () => {
    const { session, mcp } = mockSession();
    await new Locker(session).equipPickaxe('AthenaPickaxe:DefaultPickaxe');

    expect(mcp.mock.calls[0]?.[1].payload.itemToSlot).toBe('AthenaPickaxe:DefaultPickaxe');
  });

  it('equipEmote targets a Dance slot index', async () => {
    const { session, mcp } = mockSession();
    await new Locker(session).equipEmote('EID_Floss', 2);

    expect(mcp).toHaveBeenCalledWith('SetCosmeticLockerSlot', {
      profileId: 'athena',
      payload: {
        lockerItem: 'guid-locker',
        category: 'Dance',
        itemToSlot: 'AthenaDance:EID_Floss',
        slotIndex: 2,
        variantUpdates: [],
      },
    });
  });

  it('equipWrap defaults to applying to every wrap slot', async () => {
    const { session, mcp } = mockSession();
    await new Locker(session).equipWrap('Wrap_001_Test');

    expect(mcp.mock.calls[0]?.[1].payload).toMatchObject({
      category: 'ItemWrap',
      itemToSlot: 'AthenaItemWrap:Wrap_001_Test',
      slotIndex: -1,
    });
  });

  it('clearSlot sends an empty itemToSlot', async () => {
    const { session, mcp } = mockSession();
    await new Locker(session).clearSlot('Backpack');

    expect(mcp.mock.calls[0]?.[1].payload.itemToSlot).toBe('');
  });

  it('setVariants forwards variant updates and fills owned', async () => {
    const { session, mcp } = mockSession();
    await new Locker(session).setVariants('Character', 'CID_028', [
      { channel: 'Material', active: 'Mat2' },
    ]);

    expect(mcp.mock.calls[0]?.[1].payload.variantUpdates).toEqual([
      { channel: 'Material', active: 'Mat2', owned: [] },
    ]);
  });

  it('equipLoadout batches every provided slot', async () => {
    const { session, mcp } = mockSession();
    await new Locker(session).equipLoadout({
      character: 'CID_028',
      glider: null,
      dances: ['EID_Floss', 'EID_Dab'],
      itemWraps: ['Wrap_A'],
    });

    expect(mcp).toHaveBeenCalledWith('SetCosmeticLockerSlots', {
      profileId: 'athena',
      payload: {
        lockerItem: 'guid-locker',
        loadoutData: [
          { category: 'Character', itemToSlot: 'AthenaCharacter:CID_028', slotIndex: 0, variantUpdates: [] },
          { category: 'Glider', itemToSlot: '', slotIndex: 0, variantUpdates: [] },
          { category: 'Dance', itemToSlot: 'AthenaDance:EID_Floss', slotIndex: 0, variantUpdates: [] },
          { category: 'Dance', itemToSlot: 'AthenaDance:EID_Dab', slotIndex: 1, variantUpdates: [] },
          { category: 'ItemWrap', itemToSlot: 'AthenaItemWrap:Wrap_A', slotIndex: 0, variantUpdates: [] },
        ],
      },
    });
  });

  it('equipLoadout rejects an empty loadout', async () => {
    const { session } = mockSession();
    await expect(new Locker(session).equipLoadout({})).rejects.toBeInstanceOf(ValidationError);
  });

  it('setBanner strips prefixes to short template names', async () => {
    const { session, mcp } = mockSession();
    await new Locker(session).setBanner('BannerToken:brs10level100', 'defaultcolor10');

    expect(mcp).toHaveBeenCalledWith('SetCosmeticLockerBanner', {
      profileId: 'athena',
      payload: {
        lockerItem: 'guid-locker',
        bannerIconTemplateName: 'brs10level100',
        bannerColorTemplateName: 'defaultcolor10',
      },
    });
  });

  it('renameLocker sets the loadout name', async () => {
    const { session, mcp } = mockSession();
    await new Locker(session).renameLocker('My Fit');

    expect(mcp).toHaveBeenCalledWith('SetCosmeticLockerName', {
      profileId: 'athena',
      payload: { lockerItem: 'guid-locker', name: 'My Fit' },
    });
  });

  it('copyPreset and deletePreset use the loadout preset ops', async () => {
    const { session, mcp } = mockSession();
    const locker = new Locker(session);
    await locker.copyPreset(0, 3, 'Preset 3');
    await locker.deletePreset(3, { fallbackLoadoutIndex: 0, leaveNullSlot: true });

    expect(mcp).toHaveBeenNthCalledWith(1, 'CopyCosmeticLoadout', {
      profileId: 'athena',
      payload: { sourceIndex: 0, targetIndex: 3, optNewNameForTarget: 'Preset 3' },
    });
    expect(mcp).toHaveBeenNthCalledWith(2, 'DeleteCosmeticLoadout', {
      profileId: 'athena',
      payload: { index: 3, fallbackLoadoutIndex: 0, leaveNullSlot: true },
    });
  });

  it('putModularLoadout stringifies the loadout data', async () => {
    const { session, mcp } = mockSession();
    await new Locker(session).putModularLoadout('CosmeticLoadout:LoadoutSchema_Character', 1, {
      displayName: 'Preset',
      slots: [
        {
          slotTemplate: 'CosmeticLoadoutSlotTemplate:LoadoutSlot_Character',
          equippedItem: 'AthenaCharacter:CID_028',
          customizations: [{ channelTag: 'Material', variantTag: 'Mat2' }],
        },
        { slotTemplate: 'CosmeticLoadoutSlotTemplate:LoadoutSlot_Backpack' },
      ],
    });

    expect(mcp).toHaveBeenCalledWith('PutModularCosmeticLoadout', {
      profileId: 'athena',
      payload: {
        loadoutType: 'CosmeticLoadout:LoadoutSchema_Character',
        presetId: 1,
        loadoutData: JSON.stringify({
          slots: [
            {
              slot_template: 'CosmeticLoadoutSlotTemplate:LoadoutSlot_Character',
              equipped_item: 'AthenaCharacter:CID_028',
              customization_info: [{ channel_tag: 'Material', variant_tag: 'Mat2' }],
            },
            { slot_template: 'CosmeticLoadoutSlotTemplate:LoadoutSlot_Backpack' },
          ],
          display_name: 'Preset',
        }),
      },
    });
  });

  it('equipModularPreset and deleteModularLoadout target a preset id', async () => {
    const { session, mcp } = mockSession();
    const locker = new Locker(session);
    await locker.equipModularPreset('CosmeticLoadout:LoadoutSchema_Emotes', 4);
    await locker.deleteModularLoadout('CosmeticLoadout:LoadoutSchema_Emotes', 4);

    expect(mcp).toHaveBeenNthCalledWith(1, 'EquipModularCosmeticLoadoutPreset', {
      profileId: 'athena',
      payload: { loadoutType: 'CosmeticLoadout:LoadoutSchema_Emotes', presetId: 4 },
    });
    expect(mcp).toHaveBeenNthCalledWith(2, 'DeleteModularCosmeticLoadout', {
      profileId: 'athena',
      payload: { loadoutType: 'CosmeticLoadout:LoadoutSchema_Emotes', presetId: 4 },
    });
  });

  it('setRandomLoadout and setShuffleEnabled toggle the flags', async () => {
    const { session, mcp } = mockSession();
    const locker = new Locker(session);
    await locker.setRandomLoadout(true);
    await locker.setShuffleEnabled('CosmeticLoadout:LoadoutSchema_Character', false);

    expect(mcp).toHaveBeenNthCalledWith(1, 'SetRandomCosmeticLoadoutFlag', {
      profileId: 'athena',
      payload: { random: true },
    });
    expect(mcp).toHaveBeenNthCalledWith(2, 'SetLoadoutShuffleEnabled', {
      profileId: 'athena',
      payload: { loadoutType: 'CosmeticLoadout:LoadoutSchema_Character', bEnabled: false },
    });
  });

  it('honours an explicit lockerItem override without querying the profile', async () => {
    const { session, mcp, queries } = mockSession();
    await new Locker(session).equipOutfit('CID_028', { lockerItem: 'custom-guid' });

    expect(queries).not.toHaveBeenCalled();
    expect(mcp.mock.calls[0]?.[1].payload.lockerItem).toBe('custom-guid');
  });

  it('targets a preset loadout by index when the profile lists loadouts', async () => {
    const mcp = vi.fn().mockResolvedValue({ profileRevision: 6, profileChanges: [] });
    const queries = vi.fn().mockResolvedValue({
      profileRevision: 5,
      profileChanges: [
        {
          changeType: 'fullProfileUpdate',
          profile: {
            items: { 'guid-locker': { templateId: 'CosmeticLocker:cosmeticlocker_athena', attributes: {} } },
            stats: { attributes: { loadouts: ['guid-live', 'guid-preset-1', 'guid-preset-2'] } },
          },
        },
      ],
    });
    const session = { accountId: 'ACC', queryProfile: queries, mcpOperation: mcp } as unknown as EpicAuthSession;

    await new Locker(session).equipOutfit('CID_028', { preset: 2 });
    expect(mcp.mock.calls[0]?.[1].payload.lockerItem).toBe('guid-preset-2');
  });
});

describe('Locker preset builder', () => {
  it('createPreset returns a builder bound to the locker', () => {
    const { session } = mockSession();
    expect(new Locker(session).createPreset()).toBeInstanceOf(LockerPresetBuilder);
  });

  it('builds a loadout from queued slots and applies it in one op', async () => {
    const { session, mcp } = mockSession();
    const locker = new Locker(session);

    await locker
      .createPreset()
      .character('CID_028', { variants: [{ channel: 'Material', active: 'Mat2' }] })
      .backpack('BID_001')
      .emote(1, 'EID_Dab')
      .clear('Glider')
      .apply();

    expect(mcp).toHaveBeenCalledWith('SetCosmeticLockerSlots', {
      profileId: 'athena',
      payload: {
        lockerItem: 'guid-locker',
        loadoutData: [
          {
            category: 'Character',
            itemToSlot: 'AthenaCharacter:CID_028',
            slotIndex: 0,
            variantUpdates: [{ channel: 'Material', active: 'Mat2', owned: [] }],
          },
          { category: 'Backpack', itemToSlot: 'AthenaBackpack:BID_001', slotIndex: 0, variantUpdates: [] },
          { category: 'Dance', itemToSlot: 'AthenaDance:EID_Dab', slotIndex: 1, variantUpdates: [] },
          { category: 'Glider', itemToSlot: '', slotIndex: 0, variantUpdates: [] },
        ],
      },
    });
  });

  it('replaces a slot when the same category and index is added twice', async () => {
    const { session, mcp } = mockSession();
    const preset = new Locker(session).createPreset().character('CID_A').character('CID_B');

    expect(preset.size).toBe(1);
    await preset.apply();
    expect(mcp.mock.calls[0]?.[1].payload.loadoutData[0].itemToSlot).toBe('AthenaCharacter:CID_B');
  });

  it('names the loadout with a follow-up op when name is set', async () => {
    const { session, mcp } = mockSession();
    await new Locker(session).createPreset().character('CID_028').name('Sweaty Fit').apply();

    expect(mcp).toHaveBeenNthCalledWith(1, 'SetCosmeticLockerSlots', expect.anything());
    expect(mcp).toHaveBeenNthCalledWith(2, 'SetCosmeticLockerName', {
      profileId: 'athena',
      payload: { lockerItem: 'guid-locker', name: 'Sweaty Fit' },
    });
  });

  it('targets a preset index when applying', async () => {
    const mcp = vi.fn().mockResolvedValue({ profileRevision: 6, profileChanges: [] });
    const queries = vi.fn().mockResolvedValue({
      profileRevision: 5,
      profileChanges: [
        {
          changeType: 'fullProfileUpdate',
          profile: {
            items: { 'guid-locker': { templateId: 'CosmeticLocker:cosmeticlocker_athena', attributes: {} } },
            stats: { attributes: { loadouts: ['guid-live', 'guid-preset-1'] } },
          },
        },
      ],
    });
    const session = { accountId: 'ACC', queryProfile: queries, mcpOperation: mcp } as unknown as EpicAuthSession;

    await new Locker(session).createPreset().character('CID_028').apply({ preset: 1 });
    expect(mcp.mock.calls[0]?.[1].payload.lockerItem).toBe('guid-preset-1');
  });

  it('rejects applying an empty preset', async () => {
    const { session } = mockSession();
    await expect(new Locker(session).createPreset().apply()).rejects.toBeInstanceOf(ValidationError);
  });
});
