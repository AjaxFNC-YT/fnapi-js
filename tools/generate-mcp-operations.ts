import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { MCP_OPERATIONS_SOURCE_URL } from '../src/epic/mcp.js';

interface GitHubContentEntry {
  name: string;
  type: string;
}

async function main(): Promise<void> {
  const url = process.argv[2] ?? MCP_OPERATIONS_SOURCE_URL;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'fnapi-js-generator',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch operations (${response.status} ${response.statusText})`);
  }

  const entries = (await response.json()) as GitHubContentEntry[];
  const operations = entries
    .filter((entry) => entry.type === 'file' && entry.name.endsWith('.md'))
    .map((entry) => entry.name.slice(0, -'.md'.length))
    .sort((a, b) => a.localeCompare(b));

  if (operations.length === 0) {
    throw new Error('No operations found at source URL');
  }

  const here = dirname(fileURLToPath(import.meta.url));
  const target = join(here, '..', 'src', 'epic', 'mcp-operations.generated.ts');

  const lines = ['export const MCP_OPERATIONS = ['];
  let row = ' ';
  for (const op of operations) {
    const token = ` '${op}',`;
    if ((row + token).length > 96) {
      lines.push(row);
      row = ' ';
    }
    row += token;
  }
  if (row.trim().length > 0) lines.push(row);
  lines.push('] as const;');

  writeFileSync(target, lines.join('\n') + '\n', 'utf8');
  process.stdout.write(`Wrote ${operations.length} operations to ${target}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
