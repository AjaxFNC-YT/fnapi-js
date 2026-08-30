import { readFileSync } from 'node:fs';
import { EpicGamesClient } from '../../src/index.js';

const config = JSON.parse(readFileSync('./config.json', 'utf8')) as {
  epic?: { deviceAuth?: { accountId?: string; deviceId?: string; secret?: string } };
};

const epic = new EpicGamesClient();

async function main(): Promise<void> {
  const creds = config.epic?.deviceAuth;
  if (!creds?.accountId || !creds.deviceId || !creds.secret) {
    console.log('needs a saved device auth in config.json — and you must be in a party in-game');
    return;
  }

  const session = await epic.loginWithDeviceAuth({
    accountId: creds.accountId,
    deviceId: creds.deviceId,
    secret: creds.secret,
  });

  const party = await session.getParty();
  console.log(`in party ${party.id} with ${party.members.length} member(s)`);
  console.log(`leader: ${party.leader?.accountId}`);

  console.log('\nNOTE: fake cosmetics change only your party-meta representation — they show in');
  console.log('the lobby for OTHER members of the party, not on your real account or in a match.\n');

  const me = party.me;
  if (!me) return;

  await me.fakeApplyCosmetics({
    outfit: 'CID_028_Athena_Commando_F',
    backpack: 'BID_004_BlackKnight',
    pickaxe: 'DefaultPickaxe',
    shoes: 'Shoes_Test',
    sidekick: 'PetCarrier_Doggo',
    crowns: 12,
  });
  console.log('applied a fake outfit + backpack + pickaxe + kicks + sidekick + crown');

  await me.fakeOutfit('CID_028_Athena_Commando_F', {
    colors: { primary: 5, secondary: 12 },
    sticker: 'Emoji_Wow',
  });
  console.log('re-styled the outfit with colours + a sticker');

  await me.fakeInstruments({ guitar: 'Sparks_Guitar_Cool', drums: 'Sparks_Drum_Cool' });
  console.log('set fake festival instruments');

  await me.fakeBanner('brSeason01', 'DefaultColor18');
  console.log('set a fake banner');

  await me.fakeSidekickAnim('Interact');
  console.log('played the sidekick interact animation');

  await me.fakeEmote('EID_Floss');
  console.log('playing a fake emote');

  await me.fakeEmoji('Emoji_Wow');
  console.log('playing a fake emoji');

  await me.fakeJamTrack('sid_placeholder_430', 'Bass');
  console.log('playing a fake jam track (bass stem)');

  await me.fakeLevel(215);
  console.log('bumped the fake battle pass level');

  await me.fakeReady(true);
  console.log('set ready');

  await session.logout();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
