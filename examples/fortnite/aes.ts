import { FortniteAPI, KeyFormat } from '../../src/index.js';

const client = new FortniteAPI();

async function main(): Promise<void> {
  const aes = await client.aes.get();
  console.log(`build ${aes.build}`);
  console.log(`main key ${aes.mainKey}`);
  console.log(`${aes.dynamicKeys.length} dynamic keys`);

  const base64 = await client.aes.get({ keyFormat: KeyFormat.Base64 });
  console.log(`main key (base64) ${base64.mainKey}`);

  const first = aes.dynamicKeys[0];
  if (first) {
    const key = await client.aes.dynamicKey(first.pakGuid);
    console.log(`key for ${first.pakGuid}: ${key}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
