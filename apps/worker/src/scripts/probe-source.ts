/**
 * Runs the discovery pipeline against one URL and prints what it found.
 *
 * Usage:
 *   pnpm --filter worker probe https://boards.greenhouse.io/acme
 *   pnpm --filter worker probe https://acme.com/careers --fast --json
 *
 * This is the fastest way to check a company that reports "no jobs found":
 * the output names the rung of the ladder that produced the listing, so a bad
 * result points straight at the strategy that needs work.
 */
import pino from 'pino';
import pretty from 'pino-pretty';
import { HttpClient } from '@/domain/scraping/http';
import { JobDiscoveryService } from '@/domain/scraping/pipeline';

const USER_AGENT =
  process.env.WORKERS_SCRAPE_USER_AGENT ??
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 PathpipeBot/1.0';

const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const url = args.find((arg) => !arg.startsWith('-'));
  if (!url) {
    console.error('Usage: probe <careers-url> [--fast] [--json] [--verbose]');
    process.exit(1);
  }

  const fastOnly = args.includes('--fast');
  const asJson = args.includes('--json');
  const verbose = args.includes('--verbose');

  const logger = pino(
    { level: verbose ? 'debug' : 'info' },
    asJson ? pino.destination(2) : pretty({ destination: 2 }),
  );

  const http = new HttpClient({
    userAgent: USER_AGENT,
    respectRobots: process.env.WORKERS_SCRAPE_RESPECT_ROBOTS !== 'false',
    log: (data, msg) => logger.debug(data, msg),
  });
  const discovery = new JobDiscoveryService({
    http,
    log: (data, msg) => logger.info(data, msg),
  });

  const startedAt = Date.now();
  const result = await discovery.discover(url, { fastOnly });

  const summary = {
    url,
    platform: result.platform ?? null,
    strategy: result.strategy ?? null,
    jobCount: result.jobs.length,
    contentHash: result.fingerprint?.contentHash ?? null,
    error: result.error ?? null,
    seconds: Number(((Date.now() - startedAt) / 1000).toFixed(1)),
  };

  if (asJson) {
    console.log(JSON.stringify({ ...summary, jobs: result.jobs }, null, 2));
  } else {
    console.log('');
    console.log(`  source     ${summary.url}`);
    console.log(`  platform   ${summary.platform ?? '-'}`);
    console.log(`  strategy   ${summary.strategy ?? '-'}`);
    console.log(`  jobs       ${summary.jobCount}`);
    console.log(`  hash       ${summary.contentHash ?? '-'}`);
    console.log(`  took       ${summary.seconds}s`);
    if (summary.error) console.log(`  error      ${summary.error}`);
    console.log('');
    for (const job of result.jobs.slice(0, 40)) {
      const meta = [job.location, job.department, job.postedAt?.slice(0, 10)]
        .filter(Boolean)
        .join(' · ');
      console.log(`  - ${job.title}${meta ? `  (${meta})` : ''}`);
      console.log(`    ${job.url}`);
    }
    if (result.jobs.length > 40) {
      console.log(`  ... and ${result.jobs.length - 40} more`);
    }
  }

  process.exit(result.jobs.length ? 0 : 2);
};

void main();
