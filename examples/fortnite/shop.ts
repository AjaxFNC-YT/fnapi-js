import { FortniteAPI, Language } from '../../src/index.js';

const client = new FortniteAPI({ language: Language.English });

async function main(): Promise<void> {
  const shop = await client.shop.get();
  console.log(`${shop.entries.length} entries for ${shop.date}`);

  for (const entry of shop.entries.slice(0, 5)) {
    const item = entry.brItems?.[0];
    console.log(`  ${item?.name ?? entry.devName} — ${entry.finalPrice} V-Bucks`);
  }

  const sections = await client.shop.sections();
  console.log(`\n${sections.size} sections:`);
  for (const [name, entries] of sections) {
    console.log(`  ${name}: ${entries.length} offers`);
  }

  const inShop = await client.shop.isInShop('CID_028_Athena_Commando_F');
  console.log(`\nRenegade Raider in the shop today? ${inShop}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
