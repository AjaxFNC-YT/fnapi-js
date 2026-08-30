import { EpicGamesClient } from '../../src/index.js';

const epic = new EpicGamesClient();

async function main(): Promise<void> {
  const session = await epic.loginClientCredentials();
  console.log(`app token for ${session.client.name}: ${session.accessToken.slice(0, 8)}...`);
  console.log(`account bound? ${session.accountId !== null}`);

  const verified = await session.verify();
  console.log(`verified client ${verified.client_id}, expires in ${verified.expires_in}s`);

  await session.logout();
  console.log('session killed');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
