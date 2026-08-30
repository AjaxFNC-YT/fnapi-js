import { ConfigurationError, EpicGamesClient } from '../../src/index.js';

async function main(): Promise<void> {
  const custom = { name: 'my-app', clientId: 'your-client-id', clientSecret: 'your-secret' };

  const guarded = new EpicGamesClient();
  try {
    guarded.client(custom);
  } catch (error) {
    if (error instanceof ConfigurationError) {
      console.log(`blocked as expected: ${error.message}`);
    }
  }

  const epic = new EpicGamesClient({ allowCustomClients: true });
  const resolved = epic.client(custom);
  console.log(`custom client allowed: ${resolved.clientId}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
