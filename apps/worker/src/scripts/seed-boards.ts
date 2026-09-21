import { existsSync } from 'node:fs';
import { seedBoards } from '@/domain/discovery/seed';
import { VENDORS } from '@/domain/discovery/vendors';

/**
 * Command line front for board seeding. The work itself lives in
 * `domain/discovery/seed.ts`, which the ATS worker's daily cron calls too — the
 * schedule and this script run the same code.
 *
 *   pnpm --filter worker seed:boards -- --file src/scripts/boards/verified.txt
 *   pnpm --filter worker seed:boards -- --yc --limit 400 --dry-run
 *   pnpm --filter worker seed:boards -- --feeds --limit 5000
 *   pnpm --filter worker seed:boards -- --companies --platform lever
 */

const usage = `
Usage: pnpm --filter worker seed:boards -- [options]

Sources (at least one):
  --file <path>       Board names, or full careers URLs, one per line
  --yc                Y Combinator's public company directory
  --feeds             Public job feeds (Himalayas, Arbeitnow, Remote OK, Jobicy)
  --companies         Companies already in the database with no board yet

Options:
  --platform <name>   Only ask one vendor (${VENDORS.map((v) => v.platform).join(', ')})
  --limit <n>         Stop after n candidate companies (default 500)
  --concurrency <n>   Parallel probes (default 4)
  --out <path>        Write the confirmed board names to a file
  --dry-run           Print what would be created, write nothing
  --help              Show this
`;

const main = async (): Promise<void> => {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.length === 0) {
    console.log(usage);
    return;
  }

  const flag = (name: string): string | undefined => {
    const index = argv.indexOf(name);
    return index >= 0 ? argv[index + 1] : undefined;
  };

  const platformName = flag('--platform');
  const vendors = platformName
    ? VENDORS.filter((vendor) => vendor.platform === platformName)
    : VENDORS;
  if (!vendors.length) {
    console.error(`Unknown platform: ${platformName}`);
    console.log(usage);
    process.exitCode = 1;
    return;
  }

  const file = flag('--file');
  if (file && !existsSync(file)) {
    console.error(`No such file: ${file}`);
    process.exitCode = 1;
    return;
  }

  if (
    !file &&
    !['--yc', '--feeds', '--companies'].some((f) => argv.includes(f))
  ) {
    console.log(usage);
    console.log('Nothing to check — pass at least one source.');
    return;
  }

  await seedBoards({
    file,
    yc: argv.includes('--yc'),
    feeds: argv.includes('--feeds'),
    companies: argv.includes('--companies'),
    vendors,
    limit: Number.parseInt(flag('--limit') ?? '500', 10) || 500,
    concurrency: Number.parseInt(flag('--concurrency') ?? '4', 10) || 4,
    out: flag('--out'),
    dryRun: argv.includes('--dry-run'),
  });
};

void main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
