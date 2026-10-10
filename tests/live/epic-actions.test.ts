import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { EpicGamesClient, ShopError, type EpicAuthSession } from '../../src/index.js';

interface EpicConfig {
  epic?: { deviceAuth?: { accountId?: string; deviceId?: string; secret?: string } };
}

const here = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(resolve(here, '../../config.json'), 'utf8')) as EpicConfig;
const deviceAuth = config.epic?.deviceAuth;
const hasDeviceAuth = !!deviceAuth?.accountId && !!deviceAuth?.deviceId && !!deviceAuth?.secret;

describe.skipIf(!hasDeviceAuth)('live account actions (no spending)', () => {
  let session: EpicAuthSession;

  beforeAll(async () => {
    session = await new EpicGamesClient({ retry: 2 }).loginWithDeviceAuth({
      accountId: deviceAuth!.accountId!,
      deviceId: deviceAuth!.deviceId!,
      secret: deviceAuth!.secret!,
    });
  });

  afterAll(async () => {
    await session?.logout().catch(() => undefined);
  });

  it('reads the purchase history', async () => {
    const history = await session.purchaseHistory();
    expect(history.refundCredits).toBeGreaterThanOrEqual(0);
    for (let index = 1; index < history.purchases.length; index += 1) {
      expect(history.purchases[index - 1]!.purchaseDate >= history.purchases[index]!.purchaseDate).toBe(true);
    }
  });

  it('re-applies the current Support-a-Creator code without changing it', async () => {
    const current = await session.supportACreator();
    if (!current) return;
    await session.setSupportACreator(current.code);
    expect((await session.supportACreator())?.code).toBe(current.code);
  });

  it('rejects an unknown creator code with a readable error', async () => {
    const error = await session.setSupportACreator('fnapi-no-such-creator-zzz').catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ShopError);
    expect((error as ShopError).reason).toBe('invalid-creator');
  });

  it('pre-checks a gift against real friends', async () => {
    const [friends, shop] = await Promise.all([session.friendsList(), session.shop()]);
    const entry = shop.giftable[0];
    if (!entry || friends.length === 0) return;
    const checks = await entry.checkGift(friends.slice(0, 2).map((friend) => friend.accountId));
    for (const check of checks) {
      expect(check.offerId).toBe(entry.offerId);
      if (check.eligible) {
        expect(check.price?.finalPrice).toBeGreaterThan(0);
        expect(check.items.length).toBeGreaterThan(0);
      } else {
        expect(check.reason).not.toBeNull();
        expect(check.message).toBeTruthy();
      }
    }
  });
});
