const { FortniteAPI, Language } = require('../../dist/index.cjs');

const client = new FortniteAPI({ language: Language.English });

async function main() {
  const banners = await client.banners.all();
  console.log(`${banners.length} banners`);

  const colors = await client.banners.colors();
  console.log(`${colors.length} banner colors`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
