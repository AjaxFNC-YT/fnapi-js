import { EpicGamesClient } from '../../src/index.js';

const epic = new EpicGamesClient();

async function main(): Promise<void> {
  const session = await epic.loginWithDeviceCode({
    onPrompt(flow) {
      console.log('To sign in, open this link and confirm the code:');
      console.log(`  ${flow.verificationUriComplete}`);
      console.log(`  code: ${flow.userCode} (expires in ${Math.round(flow.expiresInMs / 1000)}s)`);
    },
    onPending(info) {
      process.stdout.write(`\rwaiting for authorization (poll #${info.attempt})...`);
    },
    onCanceled(error) {
      console.error(`\nlogin canceled: ${error.description ?? error.message}`);
    },
  });

  console.log(`\nlogged in as ${session.displayName} (${session.accountId})`);
  await session.logout();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
