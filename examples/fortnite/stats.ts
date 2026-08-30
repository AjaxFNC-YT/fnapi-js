import { readFileSync } from 'node:fs';
import { AccountType, FortniteAPI, StatsImage, TimeWindow } from '../../src/index.js';

const config = JSON.parse(readFileSync('./config.json', 'utf8')) as { apiKey: string };

const client = new FortniteAPI({ apiKey: config.apiKey });

async function main(): Promise<void> {
  const stats = await client.stats.byName('Ninja', {
    accountType: AccountType.Epic,
    timeWindow: TimeWindow.Lifetime,
    image: StatsImage.All,
  });

  const solo = stats.stats.all?.solo;
  console.log(`${stats.account.name}: ${solo?.wins} solo wins, ${solo?.kd} K/D`);
  console.log(`battle pass level ${stats.battlePass.level}`);

  const byId = await client.stats.findById(stats.account.id);
  console.log(`by id: ${byId?.account.name ?? 'not found'}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
