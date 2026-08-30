import { Client } from 'fnbr';
import { CosmeticSearchBuilder, CosmeticType, FortniteAPI, MatchMethod } from '../../dist/index.js';

const client = new Client();
const fnapi = new FortniteAPI({ cache: { enabled: true, ttl: 600_000 } });

async function findCosmetic(type, name) {
  return fnapi.cosmetics.find(
    new CosmeticSearchBuilder().type(type).name(name).matchMethod(MatchMethod.Contains),
  );
}

async function handleCommand(message) {
  if (!message.content.startsWith('!')) return;

  const args = message.content.slice(1).split(' ');
  const command = args.shift().toLowerCase();
  const name = args.join(' ');

  if (command === 'outfit' || command === 'skin') {
    const skin = await findCosmetic(CosmeticType.outfit, name);
    if (!skin) {
      await message.reply(`Couldn't find the skin "${name}"`);
      return;
    }
    await message.client.party.me.setOutfit(skin.id);
    await message.reply(`Set the skin to ${skin.name}!`);
  } else if (command === 'emote' || command === 'dance') {
    const emote = await findCosmetic(CosmeticType.emote, name);
    if (!emote) {
      await message.reply(`Couldn't find the emote "${name}"`);
      return;
    }
    await message.client.party.me.setEmote(emote.id);
    await message.reply(`Set the emote to ${emote.name}!`);
  }
}

client.on('friend:message', (message) => {
  console.log(`${message.author.displayName}: ${message.content}`);
  handleCommand(message).catch((error) => console.error(error));
});

client.on('ready', () => {
  console.log(`Logged in as ${client.user.displayName}`);
});

client.login();
