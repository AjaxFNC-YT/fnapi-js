import { readFileSync } from 'node:fs';
import { EpicGamesClient } from '../../src/index.js';

const config = JSON.parse(readFileSync('./config.json', 'utf8')) as {
  epic?: { deviceAuth?: { accountId?: string; deviceId?: string; secret?: string } };
};

const epic = new EpicGamesClient();

async function main(): Promise<void> {
  const creds = config.epic?.deviceAuth;
  if (!creds?.accountId || !creds.deviceId || !creds.secret) {
    console.log('needs a saved device auth in config.json');
    return;
  }

  const session = await epic.loginWithDeviceAuth({
    accountId: creds.accountId,
    deviceId: creds.deviceId,
    secret: creds.secret,
  });

  const me = await session.me();
  console.log(`me: ${me.displayName} (${me.id})`);

  const byName = await session.accountByDisplayName('Ninja');
  console.log(`by display name: ${byName.id}`);

  const byId = await session.account(byName.id);
  console.log(`by id: ${byId.displayName}`);

  const many = await session.accountsByIds([me.id, byName.id]);
  console.log(`bulk lookup: ${many.length} accounts`);

  await session.logout();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
