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

const logger = pino(pretty());

// Store failures never fail a cycle.
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
    // runDiscovery guards itself; seeding does not.
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
