import { EpicGamesClient, type StatusComponent, type StatusIncident } from '../../src/index.js';

const epic = new EpicGamesClient();

function line(char = '─', width = 60): string {
  return char.repeat(width);
}

function printComponents(components: StatusComponent[]): void {
  const groups = components.filter((component) => component.group);
  const children = components.filter((component) => !component.group);
  const byGroup = new Map<string | null, StatusComponent[]>();

  for (const child of children) {
    const key = child.group_id ?? null;
    const bucket = byGroup.get(key) ?? [];
    bucket.push(child);
    byGroup.set(key, bucket);
  }

  for (const group of groups) {
    console.log(`\n▸ ${group.name}  [${group.status}]`);
    const members = (byGroup.get(group.id) ?? []).sort((a, b) => a.position - b.position);
    for (const member of members) {
      console.log(`    - ${member.name.padEnd(38)} ${member.status}`);
    }
  }

  const ungrouped = (byGroup.get(null) ?? []).sort((a, b) => a.position - b.position);
  if (ungrouped.length > 0) {
    console.log('\n▸ (ungrouped)');
    for (const member of ungrouped) {
      console.log(`    - ${member.name.padEnd(38)} ${member.status}`);
    }
  }
}

function printIncidents(title: string, incidents: StatusIncident[]): void {
  console.log(`\n${line()}`);
  console.log(`${title} (${incidents.length})`);
  console.log(line());

  if (incidents.length === 0) {
    console.log('  none');
    return;
  }

  for (const incident of incidents) {
    console.log(`\n• ${incident.name}`);
    console.log(`  status: ${incident.status}   impact: ${incident.impact}`);
    console.log(`  started: ${incident.started_at}   resolved: ${incident.resolved_at ?? '—'}`);
    console.log(`  link: ${incident.shortlink}`);
    for (const update of incident.incident_updates) {
      console.log(`    [${update.status}] ${update.display_at}`);
      console.log(`      ${update.body.replace(/\s+/g, ' ').trim()}`);
    }
  }
}

async function main(): Promise<void> {
  const summary = await epic.status.summary();

  console.log(line('═'));
  console.log(`${summary.page.name}`);
  console.log(`overall: ${summary.status.indicator}  —  ${summary.status.description}`);
  console.log(`updated: ${summary.page.updated_at}`);
  console.log(`fortnite operational: ${await epic.status.isFortniteOperational()}`);
  console.log(line('═'));

  console.log('\nCOMPONENTS');
  console.log(line());
  printComponents(summary.components);

  console.log('\n\nFORTNITE COMPONENTS ONLY');
  console.log(line());
  const fortnite = await epic.status.fortniteComponents();
  for (const component of fortnite) {
    console.log(`  - ${component.name.padEnd(38)} ${component.status}`);
  }

  printIncidents('ACTIVE INCIDENTS', summary.incidents);
  printIncidents('ALL PAST INCIDENTS', await epic.status.incidents());

  const maintenances = await epic.status.maintenances();
  console.log(`\n${line()}`);
  console.log(`SCHEDULED MAINTENANCES (${maintenances.length})`);
  console.log(line());
  for (const window of maintenances) {
    console.log(`\n• ${window.name}  [${window.status}]`);
    console.log(`  for: ${window.scheduled_for ?? '—'}  until: ${window.scheduled_until ?? '—'}`);
  }

  console.log(`\n${line('═')}`);
  console.log('RAW SUMMARY JSON');
  console.log(line('═'));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
