import {
  FortniteAPI,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from '../../src/index.js';

const client = new FortniteAPI({
  cache: { enabled: true, ttl: 120_000 },
  retry: { attempts: 4, minDelay: 500, maxDelay: 5_000 },
  timeout: 15_000,
});

async function main(): Promise<void> {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 3_000);

  try {
    const shop = await client.shop.get({ signal: controller.signal });
    console.log(`${shop.entries.length} entries`);

    await client.stats.byName('SomePlayer');
  } catch (err) {
    if (err instanceof ValidationError) console.error('missing API key or bad input');
    else if (err instanceof NotFoundError) console.error('not found');
    else if (err instanceof RateLimitError) console.error(`rate limited, retry after ${err.retryAfter}ms`);
    else throw err;
  }

  const maybe = await client.cosmetics.findById('CID_DOES_NOT_EXIST');
  console.log(`find helper avoids the throw: ${maybe}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
