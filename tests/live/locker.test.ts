import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  EpicGamesClient,
  Locker,
  decodeRichColor,
  type EpicAuthSession,
  type LockerActiveLoadoutGroup,
  type LockerEquippedItem,
  type LockerSnapshot,
} from '../../src/index.js';

interface EpicConfig {
  epic?: { deviceAuth?: { accountId?: string; deviceId?: string; secret?: string } };
}

const here = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(resolve(here, '../../config.json'), 'utf8')) as EpicConfig;
const deviceAuth = config.epic?.deviceAuth;
const hasDeviceAuth = !!deviceAuth?.accountId && !!deviceAuth?.deviceId && !!deviceAuth?.secret;

const PRESET_NAME = 'fnapi live test';

describe.skipIf(!hasDeviceAuth)('live locker v4 (restores the original loadout)', () => {
  let session: EpicAuthSession;
  let locker: Locker;
  let snapshot: LockerSnapshot;
  let original: LockerActiveLoadoutGroup;

  beforeAll(async () => {
    session = await new EpicGamesClient({ retry: 2 }).loginWithDeviceAuth({
      accountId: deviceAuth!.accountId!,
      deviceId: deviceAuth!.deviceId!,
      secret: deviceAuth!.secret!,
    });
    locker = new Locker(session);
    snapshot = await locker.fetch();
    original = snapshot.loadout.group;
  });

  afterAll(async () => {
    if (original) await locker.restore(original).catch(() => undefined);
    for (const preset of (await locker?.presets().catch(() => [])) ?? []) {
      if (preset.name.startsWith(PRESET_NAME)) await locker.deletePreset(preset.id).catch(() => undefined);
    }
    await session?.logout().catch(() => undefined);
  });

  it('reads every owned cosmetic and the active loadout', () => {
    expect(snapshot.items.length).toBeGreaterThan(100);
    expect(new Set(snapshot.items.map((item) => item.id)).size).toBe(snapshot.items.length);
    expect(snapshot.loadout.character?.type).toBe('AthenaCharacter');
    expect(snapshot.loadout.emotes).toHaveLength(8);
    expect(snapshot.loadout.wraps).toHaveLength(7);
    expect(snapshot.loadout.other).toEqual([]);
  });

  it('equips an emote into one slot without touching the others, then restores', async () => {
    const equipped = new Set(snapshot.loadout.emotes.map((emote) => emote?.templateId));
    const emote = snapshot.items.find((item) => item.type === 'AthenaDance' && item.cosmeticId.startsWith('eid_') && !equipped.has(item.templateId))!;
    const after = await locker.equipEmote(emote.cosmeticId, 7);
    expect(after.emotes[7]?.templateId).toBe(emote.templateId);

    const reread = await locker.loadout();
    expect(reread.emotes[7]?.templateId).toBe(emote.templateId);
    expect(reread.emotes.slice(0, 7).map((slot) => slot?.templateId)).toEqual(
      snapshot.loadout.emotes.slice(0, 7).map((slot) => slot?.templateId),
    );
    expect(reread.character?.templateId).toBe(snapshot.loadout.character?.templateId);

    const restored = await locker.restore(original);
    expect(restored.emotes[7]?.templateId).toBe(snapshot.loadout.emotes[7]?.templateId);
  });

  it('recolours a RichColor item and restores it', async () => {
    const target = (['carBody', 'suvBody', 'glider'] as const).find((name) =>
      snapshot.loadout.slots[name]?.variants.some((variant) => variant.variant === 'RichColor'),
    );
    if (!target) return;
    const richColor = (slot: LockerEquippedItem | null | undefined) =>
      slot?.variants.find((variant) => variant.variant === 'RichColor')?.additionalData;
    const before = richColor(snapshot.loadout.slots[target]);
    const after = richColor((await locker.setColor(target, before === '3F8000003F8000003F8000003F800000' ? '#000000' : '#ffffff')).slots[target]);
    expect(after).not.toBe(before);
    expect(decodeRichColor(after)).not.toBeNull();
    await locker.restore(original);
    expect((await locker.loadout()).slots[target]?.variants).toEqual(snapshot.loadout.slots[target]?.variants);
  });

  it('creates, renames, applies and deletes a loadout preset', async () => {
    const preset = await locker.savePreset(PRESET_NAME);
    expect(preset.id.startsWith('loadoutgrouppreset-')).toBe(true);

    const renamed = await locker.renamePreset(preset.id, `${PRESET_NAME} renamed`);
    expect(renamed.id).toBe(preset.id);
    expect(renamed.name).toBe(`${PRESET_NAME} renamed`);

    const applied = await locker.applyPreset(preset.id);
    expect(applied.character?.templateId).toBe(snapshot.loadout.character?.templateId);

    await locker.deletePreset(preset.id);
    expect((await locker.presets()).some((entry) => entry.id === preset.id)).toBe(false);
    await locker.restore(original);
  });

  it('re-favourites an already favourited item through MCP', async () => {
    const favorite = snapshot.items.find((item) => item.favorite);
    if (!favorite) return;
    const response = await locker.setFavorite([favorite.id], true);
    expect(response.profileId).toBe('athena');
  });
});
