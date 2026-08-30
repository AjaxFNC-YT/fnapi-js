import {
  EcosystemMetric,
  EpicGamesClient,
  IslandMetric,
} from '../../src/index.js';

const client = new EpicGamesClient();

async function main(): Promise<void> {
  const { data: islands } = await client.ecosystem.islands({ size: 5 });
  console.log(`${islands.length} islands on the first page`);

  const first = islands[0];
  if (!first) return;

  const island = await client.ecosystem.island(first.code);
  console.log(`${island.title} (${island.code}) — ${island.tags.join(', ')}`);

  const series = await client.ecosystem.islandMetricsByInterval(first.code, 'hour', {
    metrics: [IslandMetric.PeakCCU, IslandMetric.UniquePlayers],
  });
  console.log(`peak ccu buckets: ${series.peakCCU?.length ?? 0}`);

  const retention = await client.ecosystem.islandRetention(first.code, 'day');
  const latest = retention.intervals?.[0];
  console.log(`retention d1 ${latest?.d1 ?? 'n/a'} / d7 ${latest?.d7 ?? 'n/a'}`);

  const { data: genres } = await client.ecosystem.genres();
  const genre = genres[0];
  if (genre) {
    const board = await client.ecosystem.genreRankings(genre.slug, { size: 5 });
    console.log(`top ${genre.displayName}: ${board.data.map((entry) => entry.islandCode).join(', ')}`);
  }

  const global = await client.ecosystem.metrics('minute', {
    metrics: [EcosystemMetric.InMatchPeakCCU, EcosystemMetric.InClientPeakCCU],
  });
  console.log(`in-match peak samples: ${global.inMatchPeakCCU?.length ?? 0}`);

  const missing = await client.ecosystem.findIsland('0000-0000-0000');
  console.log(`missing lookup returned: ${missing}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
