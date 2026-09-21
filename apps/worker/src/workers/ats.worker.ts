import { configService } from '@/infrastructure/config/config.service';
import { apiClient } from '@/infrastructure/api/api.client';
import { HttpClient } from '@/infrastructure/http/http';
import { JobDiscoveryService } from '@/domain/discovery/pipeline';
import { createLimiter } from '@/domain/discovery/limiter';
import { seedBoards } from '@/domain/discovery/seed';
import { ingestListing } from '@/domain/discovery/ingest';
import { runDiscoveryCycle, type SourceStore } from '@/domain/discovery/cycle';
import type { JobSource } from '@/domain/discovery/cycle';
import { SCHEDULED_SEED, type CycleMode } from '@/domain/discovery/schedule';
import { Cron } from 'croner';
import pino from 'pino';
import pretty from 'pino-pretty';
import { createWorker, QUEUES } from '@repo/queues';

/**
 * Entry point for job discovery: config in, dependencies built, cron and queue
 * wired to one domain call. Every rule about when a source is due, what its
 * answer means and what gets written back lives in `domain/discovery/cycle.ts`
 * and `domain/discovery/schedule.ts`.
 */

const logger = pino(pretty());

/** The API, in the shape the cycle asks for. Failures here never fail a cycle. */
const apiSourceStore: SourceStore = {
  list: () => apiClient.get<JobSource[]>('/internal/v1/job-sources'),

  saveState: async (url, patch) => {
    try {
      await apiClient.post('/internal/v1/job-sources/state', { url, ...patch });
    } catch (err) {
      logger.warn({ url, err }, 'Failed to persist source state');
    }
  },

  notifyNewOffers: async () => {
    try {
      await apiClient.post('/internal/v1/job-postings/notify', {});
    } catch (err) {
      logger.warn({ err }, 'Failed to trigger match notifications');
    }
  },

  /**
   * Closes offers that dated themselves out.
   *
   * The probe that used to fetch each offer's page is gone with the rest of the
   * crawling: an offer disappearing from its board is what reconciliation
   * already catches, and it catches it through the vendor's API rather than by
   * knocking on a page that may answer with a bot challenge.
   */
  expireDatedOffers: async () => {
    try {
      const { closed } = await apiClient.post<{ closed: number }>(
        '/internal/v1/job-postings/expire',
        {},
      );
      return closed;
    } catch (err) {
      logger.warn({ err }, 'Failed to close expired offers');
      return 0;
    }
  },
};

export async function startAtsWorker() {
  logger.info('Starting ATS worker...');

  const redisConfig = configService.get('redis');
  const workersConfig = configService.get('workers');
  const config = configService.get('discovery');

  const http = new HttpClient({
    userAgent: config.userAgent,
    perHostDelayMs: config.perHostDelayMs,
    respectRobots: config.respectRobots,
    maxRequestsPerHost: config.maxRequestsPerHost,
    maxRateLimitStrikes: config.maxRateLimitStrikes,
    log: (data, msg) => logger.info(data, msg),
  });

  const discovery = new JobDiscoveryService({
    http,
    respectRobotsForAts: config.respectRobotsForAts,
    log: (data, msg) => logger.debug(data, msg),
  });

  const limit = createLimiter(config.concurrency);
  let cycleRunning = false;

  const runDiscovery = async (mode: CycleMode): Promise<void> => {
    if (cycleRunning) {
      logger.info('Discovery cycle already running, skipping this tick');
      return;
    }
    cycleRunning = true;
    try {
      const summary = await runDiscoveryCycle(
        {
          sources: apiSourceStore,
          discover: (url, options) => discovery.discover(url, options),
          ingest: (company, result, listingUrl) =>
            ingestListing(company, result, listingUrl, logger),
          http,
          limit,
          policy: config,
          log: logger,
        },
        mode,
      );
      if (summary) logger.info(summary, 'Job discovery cycle complete');
    } finally {
      cycleRunning = false;
    }
  };

  /**
   * Refills the company list discovery works from.
   *
   * Companies are only read once somebody knows their board exists, and the
   * roster of who is hiring moves every day — so the same seeding the CLI runs
   * happens on a schedule. Safe to repeat: the API call behind it is an upsert.
   */
  const runSeeding = async (): Promise<void> => {
    logger.info('Starting board discovery');
    try {
      const boards = await seedBoards({
        ...SCHEDULED_SEED,
        log: (msg) => {
          const line = msg.trim();
          if (line) logger.info(line);
        },
      });
      logger.info({ boards: boards.length }, 'Board discovery complete');
    } catch (err) {
      logger.warn({ err }, 'Board discovery failed');
    }
  };

  logger.info('ATS worker started, waiting for API...');

  for (let i = 0; i < 30; i++) {
    try {
      await apiClient.get<{ status: string }>('/internal/v1/health');
      logger.info('API is ready');
      break;
    } catch {
      logger.info(`Waiting for API... (${i + 1}/30)`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  await runDiscovery('full');

  const schedule = (
    expression: string,
    run: () => Promise<void>,
    // `runDiscovery` keeps its own guard, and says so in the log when a tick
    // lands on a running cycle. Seeding has no such guard, so croner holds it.
    protect = false,
  ): Cron =>
    new Cron(
      expression,
      { timezone: workersConfig.cronTimezone, protect },
      run,
    );

  const crons = [
    schedule(config.fastCron, () => runDiscovery('fast')),
    schedule(config.fullCron, () => runDiscovery('full')),
    schedule(config.seedCron, runSeeding, true),
  ];

  logger.info(
    {
      fast: config.fastCron,
      full: config.fullCron,
      seed: config.seedCron,
      timezone: workersConfig.cronTimezone,
      concurrency: config.concurrency,
    },
    'ATS worker scheduled',
  );

  const triggerWorker = createWorker(
    QUEUES.DISCOVERY_TRIGGER,
    async (job) => {
      logger.info(`Triggered by ${job.id}, running discovery...`);
      await runDiscovery('full');
    },
    {
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
    },
  );

  triggerWorker.on('completed', (job) => {
    logger.info(`Trigger job ${job.id} completed`);
  });
  triggerWorker.on('failed', (job, err) => {
    logger.error(`Trigger job ${job?.id} failed: ${err.message}`);
  });

  const shutdown = async () => {
    logger.info('Shutting down ATS worker...');
    for (const cron of crons) cron.stop();
    await triggerWorker.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  await new Promise(() => {});
}
