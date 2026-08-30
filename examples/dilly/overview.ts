import { DillyAPI } from '../../src/index.js';

const client = new DillyAPI();

async function main(): Promise<void> {
  const versions = await client.common.versions();
  const latest = versions[0];
  console.log(`tracked versions: ${versions.length}`);
  if (latest) {
    console.log(`latest build ${latest.version.build} (${latest.meta.tag}/${latest.meta.state})`);
  }

  const aes = await client.aes.keys();
  console.log(`main key ${aes.mainKey} with ${aes.dynamicKeys.length} dynamic keys`);

  const bundles = await client.cosmetics.bundles();
  console.log(`cosmetic bundles: ${bundles.entries}`);

  const seasons = await client.exports.seasons();
  const season = seasons.jsonOutput[seasons.jsonOutput.length - 1];
  console.log(`newest season key: ${season?.key ?? 'n/a'}`);

  const search = await client.exports.search({ query: 'renegaderaider' });
  console.log(`search hits: ${search.jsonOutput.length}`);

  const mappings = await client.mappings.list();
  console.log(`usmap mappings: ${mappings.length}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
