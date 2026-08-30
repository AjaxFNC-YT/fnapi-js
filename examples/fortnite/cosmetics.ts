import {
  ALL_RESPONSE_FLAGS,
  CosmeticSearchBuilder,
  CosmeticType,
  FortniteAPI,
  MatchMethod,
  Rarity,
} from '../../src/index.js';

const client = new FortniteAPI({ responseFlags: ALL_RESPONSE_FLAGS });

async function main(): Promise<void> {
  const renegade = await client.cosmetics.search({
    name: 'Renegade Raider',
    matchMethod: MatchMethod.Full,
  });
  console.log(`${renegade.name} — ${renegade.rarity.displayValue} ${renegade.type.displayValue}`);

  const query = new CosmeticSearchBuilder()
    .type(CosmeticType.outfit)
    .rarity(Rarity.Legendary)
    .matchMethod(MatchMethod.Contains)
    .addedSince(new Date('2024-01-01'));

  const outfits = await client.cosmetics.searchAll(query);
  console.log(`${outfits.length} legendary outfits added since 2024`);

  const [a, b] = await client.cosmetics.byIds([
    'CID_028_Athena_Commando_F',
    'CID_029_Athena_Commando_F_Halloween',
  ]);
  console.log(`by ids: ${a?.name}, ${b?.name}`);

  const missing = await client.cosmetics.findById('CID_DOES_NOT_EXIST');
  console.log(`missing lookup returned: ${missing}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
