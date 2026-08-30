import { readFileSync } from 'node:fs';
import { EpicGamesClient } from '../../src/index.js';

const config = JSON.parse(readFileSync('./config.json', 'utf8')) as {
  epic?: { deviceAuth?: { accountId?: string; deviceId?: string; secret?: string } };
};

const epic = new EpicGamesClient();

async function createAndSave(): Promise<void> {
  const login = await epic.loginWithDeviceCode({
    onPrompt: (flow) => console.log('Open', flow.verificationUriComplete),
  });

  const android = await login.switchClient('fortniteAndroid');
  const deviceAuth = await android.createDeviceAuth();

  console.log('save these for silent logins:');
  console.log(JSON.stringify(
    { accountId: deviceAuth.accountId, deviceId: deviceAuth.deviceId, secret: deviceAuth.secret },
    null,
    2,
  ));

  await android.logout();
  await login.logout();
}

async function silentLogin(): Promise<void> {
  const creds = config.epic?.deviceAuth;
  if (!creds?.accountId || !creds.deviceId || !creds.secret) {
    console.log('no saved device auth in config.json — run createAndSave() first');
    return;
  }

  const session = await epic.loginWithDeviceAuth({
    accountId: creds.accountId,
    deviceId: creds.deviceId,
    secret: creds.secret,
  });

  const me = await session.me();
  console.log(`logged in as ${me.displayName}`);

  const auths = await session.listDeviceAuths();
  console.log(`${auths.length} device auths on this account`);

  await session.ensureValid();
  await session.logout();
}

async function main(): Promise<void> {
  await silentLogin();
  void createAndSave;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
