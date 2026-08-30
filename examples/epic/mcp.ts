import { readFileSync } from 'node:fs';
import { EpicGamesClient, MCPProfile } from '../../src/index.js';

const config = JSON.parse(readFileSync('./config.json', 'utf8')) as {
  epic?: { deviceAuth?: { accountId?: string; deviceId?: string; secret?: string } };
};

const epic = new EpicGamesClient({ allowCustomMcpOperations: true });

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

  const athena = await session.queryProfile(MCPProfile.athena);
  console.log(`athena revision ${athena.profileRevision}, ${athena.profileChanges.length} changes`);

  const core = await session.queryProfile(MCPProfile.commonCore);
  console.log(`common_core revision ${core.profileRevision}`);

  await session.mcpOperation('MarkItemSeen', {
    profileId: MCPProfile.athena,
    payload: { itemIds: [] },
  });

  await session.logout();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
