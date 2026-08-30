import { FortniteAPI } from '../../src/index.js';

const client = new FortniteAPI();

async function main(): Promise<void> {
  const map = await client.map.get();
  console.log(`${map.pois.length} named locations`);

  const news = await client.news.br();
  console.log(`${news.motds?.length ?? 0} battle royale messages`);

  const playlists = await client.playlists.all();
  console.log(`${playlists.length} playlists`);

  const banners = await client.banners.all();
  const colors = await client.banners.colors();
  console.log(`${banners.length} banners, ${colors.length} banner colors`);

  const creator = await client.creatorCode.get('ninja');
  console.log(`creator code ${creator.code} -> ${creator.account.name} (${creator.status})`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
