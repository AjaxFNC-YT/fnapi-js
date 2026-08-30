import { Fortnite } from '../src/index.js';

const fn = new Fortnite();

async function main(): Promise<void> {
  const aes = await fn.dilly.aes.keys();
  console.log(`[dilly] main key ${aes.mainKey}`);

  const { data: islands } = await fn.epic.ecosystem.islands({ size: 3 });
  console.log(`[epic] ${islands.length} discovery islands`);

  const cosmetics = await fn.fortniteapi.cosmetics.all();
  console.log(`[fortniteapi] ${cosmetics.br.length} battle royale cosmetics catalogued`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
