import { readFileSync } from 'node:fs';
import { EpicGamesClient, FortniteAPI, Locker } from '../../src/index.js';

const config = JSON.parse(readFileSync('./config.json', 'utf8')) as {
  epic?: { deviceAuth?: { accountId?: string; deviceId?: string; secret?: string } };
};

const epic = new EpicGamesClient();
const fortnite = new FortniteAPI({ cache: { enabled: true, ttl: 600_000 } });

async function main(): Promise<void> {
  const creds = config.epic?.deviceAuth;
  if (!creds?.accountId || !creds.deviceId || !creds.secret) {
    console.log('needs a saved device auth in config.json');
    return;
  }

  const session = await epic.loginWithDeviceAuth({
    accountId: creds.accountId,
    deviceId: creds.deviceId,
    secret: creds.secret,
  });

  const locker = new Locker(session, fortnite.cosmetics);

  const snapshot = await locker.fetch({ enrich: true });
  console.log(`${snapshot.items.length} cosmetics owned`);

  const character = snapshot.loadout.character;
  console.log(`equipped skin: ${character?.name ?? character?.cosmeticId}`);
  console.log(`image: ${character?.imageUrl}`);

  const favorites = snapshot.items.filter((item) => item.favorite);
  console.log(`\n${favorites.length} favorited items:`);
  for (const item of favorites.slice(0, 10)) {
    console.log(`  ${item.name ?? item.cosmeticId} — ${item.imageUrl ?? '(no image)'}`);
  }

  const link = await locker.resolveImage('CID_028_Athena_Commando_F');
  console.log(`\nRenegade Raider image link: ${link}`);

  const edit = process.argv.includes('--edit');
  if (edit) {
    console.log('\nediting the live locker...');
    await locker.equipLoadout({
      character: 'CID_028_Athena_Commando_F',
      pickaxe: 'DefaultPickaxe',
      dances: ['EID_Floss', null, null, null, null, null],
    });
    await locker.equipWrap('Wrap_121_JupiterZero');
    await locker.setVariants('Character', 'CID_028_Athena_Commando_F', [
      { channel: 'Material', active: 'Mat2' },
    ]);
    await locker.copyPreset(0, 3, 'Saved from fnapi');
    console.log('equipped skin + emote, wrapped every weapon, saved preset 3');
  } else {
    console.log('\npass --edit to equip a loadout, wrap, style and save a preset');
  }

  await session.logout();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
