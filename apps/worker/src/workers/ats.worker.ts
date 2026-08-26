import { configService } from '@/infrastructure/config/config.service';
import { apiClient } from '@/infrastructure/api/api.client';
import { HttpClient } from '@/domain/scraping/http';
import { BrowserPool } from '@/domain/scraping/browser';
import { JobDiscoveryService } from '@/domain/scraping/pipeline';
import { createLimiter } from '@/domain/scraping/limiter';
import type { ScrapeResult } from '@/domain/scraping/types';
import { Cron } from 'croner';
import pino from 'pino';
import pretty from 'pino-pretty';
import { createWorker, createQueue, QUEUES, jobAlert } from '@repo/queues';
import { CreateJobPostingDto } from '@repo/db/dto/job-posting/create-job-posting.dto';

const logger = pino(pretty());

interface JobSourceWatcher {
  userId: string;
  userEmail: string;
  userName: string;
  companyId: string;
  companyName: string;
}

interface JobSourceTask {
  url: string;
  platform: string | null;
  strategy: string | null;
  etag: string | null;
  lastModified: string | null;
  contentHash: string | null;
  jobCount: number;
  requiresBrowser: boolean;
  failureCount: number;
  lastCheckedAt: string | null;
  lastChangedAt: string | null;
  lastSyncedAt: string | null;
  watchers: JobSourceWatcher[];
}

interface InsertedJob {
  id: string;
  title: string;
  url: string;
  location: string | null;
}

interface BatchResponse {
  inserted: number;
  total: number;
  jobs: InsertedJob[];
}

type CycleMode = 'fast' | 'full';

const HOUR_MS = 60 * 60 * 1000;

const hoursSince = (iso: string | null): number =>
  iso
    ? (Date.now() - new Date(iso).getTime()) / HOUR_MS
    : Number.POSITIVE_INFINITY;

export async function startAtsWorker() {
  logger.info('Starting ATS worker...');

  const redisConfig = configService.get('redis');
  const workersConfig = configService.get('workers');
  const scraperConfig = configService.get('scraper');

  const connection = {
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password,
  };

  const alertQueue = createQueue<jobAlert.JobAlertJob>(
    QUEUES.JOB_ALERT,
    connection,
  );

  const http = new HttpClient({
    userAgent: scraperConfig.userAgent,
    perHostDelayMs: scraperConfig.perHostDelayMs,
    respectRobots: scraperConfig.respectRobots,
    log: (data, msg) => logger.debug(data, msg),
  });

  const browser = new BrowserPool({
    userAgent: scraperConfig.userAgent,
    concurrency: scraperConfig.browserConcurrency,
    log: (data, msg) => logger.debug(data, msg),
    onLaunchError: (err) =>
      logger.error(
        { err },
        'Headless browser failed to launch — JS-rendered boards will be skipped. Run "playwright install chromium".',
      ),
  });

  const discovery = new JobDiscoveryService({
    http,
    browser,
    maxDurationMs: scraperConfig.maxDurationMs,
    maxListingPages: scraperConfig.maxListingPages,
    respectRobotsForAts: scraperConfig.respectRobotsForAts,
    log: (data, msg) => logger.debug(data, msg),
  });

  const limit = createLimiter(scraperConfig.concurrency);
  let cycleRunning = false;

  /**
   * A source is skipped entirely when it is backing off after repeated
   * failures, or when a cheap pass cannot possibly reach it (its listing only
   * appears after a browser render) and the full pass is not due yet.
   */
  const plan = (
    task: JobSourceTask,
    mode: CycleMode,
  ): { skip: boolean; fastOnly: boolean; reconcile: boolean } => {
    const dueForFull =
      hoursSince(task.lastCheckedAt) >= scraperConfig.fullIntervalHours;

    if (task.failureCount >= scraperConfig.maxFailuresBeforeBackoff) {
      const backoffHours = Math.min(
        24,
        2 **
          Math.min(
            task.failureCount - scraperConfig.maxFailuresBeforeBackoff,
            4,
          ),
      );
      if (hoursSince(task.lastCheckedAt) < backoffHours) {
        return { skip: true, fastOnly: true, reconcile: false };
      }
    }

    const needsBrowser = task.requiresBrowser;
    if (mode === 'fast' && needsBrowser && !dueForFull) {
      return { skip: true, fastOnly: true, reconcile: false };
    }

    return {
      skip: false,
      fastOnly: mode === 'fast' && !needsBrowser && !dueForFull,
      // Re-ingest periodically even when nothing changed, so a posting lost to
      // a failed insert cannot stay missing forever.
      reconcile:
        hoursSince(task.lastSyncedAt) >= scraperConfig.reconcileIntervalHours,
    };
  };

  const reportState = async (
    task: JobSourceTask,
    patch: Record<string, unknown>,
  ): Promise<void> => {
    try {
      await apiClient.post('/internal/v1/job-sources/state', {
        url: task.url,
        ...patch,
      });
    } catch (err) {
      logger.warn({ url: task.url, err }, 'Failed to persist source state');
    }
  };

  /**
   * Postings per HTTP request to the API. A full board's descriptions can run
   * several megabytes; chunking keeps each request well under any reasonable
   * body-size limit regardless of how large a single company's listing gets.
   */
  const SUBMIT_CHUNK_SIZE = 150;

  /** Writes the listing for one watcher and alerts them about what is new. */
  const syncWatcher = async (
    task: JobSourceTask,
    watcher: JobSourceWatcher,
    result: ScrapeResult,
  ): Promise<number> => {
    const dtos: CreateJobPostingDto[] = result.jobs.map((job) => ({
      title: job.title,
      url: job.url,
      externalId: job.externalId ?? null,
      description: job.description ?? null,
      location: job.location ?? null,
      salaryMin: job.salaryMin ?? null,
      salaryMax: job.salaryMax ?? null,
      source: result.resolvedUrl ?? task.url,
      postedAt: job.postedAt ?? null,
      companyId: watcher.companyId,
      userId: watcher.userId,
    }));

    const inserted: InsertedJob[] = [];
    let total = 0;
    for (let start = 0; start < dtos.length; start += SUBMIT_CHUNK_SIZE) {
      const chunk = dtos.slice(start, start + SUBMIT_CHUNK_SIZE);
      try {
        const response = await apiClient.post<BatchResponse>(
          '/job-postings/internal/batch',
          chunk,
        );
        inserted.push(...response.jobs);
        total += response.total;
      } catch (err) {
        logger.error(
          { company: watcher.companyName, user: watcher.userId, err },
          'Failed to submit jobs to API',
        );
        // A later chunk failing should not lose the ones that already landed.
      }
    }
    const response: BatchResponse = {
      inserted: inserted.length,
      total,
      jobs: inserted,
    };

    if (!response.inserted) return 0;

    logger.info(
      {
        company: watcher.companyName,
        inserted: response.inserted,
        platform: result.platform,
        strategy: result.strategy,
      },
      'New jobs discovered, enqueuing alert',
    );

    await alertQueue.add('new-job-alert', {
      type: 'new-job-alert',
      to: watcher.userEmail,
      userName: watcher.userName,
      companyName: watcher.companyName,
      companyId: watcher.companyId,
      jobCount: response.inserted,
      // Exactly the postings that were new, not the first N of the listing.
      jobs: response.jobs.slice(0, 10).map((job) => ({
        title: job.title,
        url: job.url,
        location: job.location ?? undefined,
      })),
    });

    return response.inserted;
  };

  const processSource = async (
    task: JobSourceTask,
    mode: CycleMode,
  ): Promise<{ inserted: number; skipped: boolean }> => {
    const decision = plan(task, mode);
    if (decision.skip) return { inserted: 0, skipped: true };

    const result = await discovery.discover(task.url, {
      previous: decision.reconcile
        ? null
        : {
            etag: task.etag,
            lastModified: task.lastModified,
            contentHash: task.contentHash,
            jobCount: task.jobCount,
          },
      fastOnly: decision.fastOnly,
      knownPlatform: task.platform,
    });

    if (result.notModified) {
      await reportState(task, {
        platform: result.platform ?? task.platform,
        etag: result.fingerprint?.etag ?? task.etag,
        lastModified: result.fingerprint?.lastModified ?? task.lastModified,
      });
      return { inserted: 0, skipped: false };
    }

    if (!result.jobs.length) {
      // A cheap pass finding nothing is expected for browser-only sources; only
      // a full pass counts as a failure worth backing off from.
      const isFailure = !decision.fastOnly;
      await reportState(task, {
        error: isFailure ? (result.error ?? 'No job listings found') : null,
        platform: result.platform ?? task.platform,
        etag: result.fingerprint?.etag ?? null,
        lastModified: result.fingerprint?.lastModified ?? null,
      });
      if (isFailure) {
        logger.warn(
          { url: task.url, error: result.error },
          'No jobs found for source',
        );
      }
      return { inserted: 0, skipped: false };
    }

    let inserted = 0;
    for (const watcher of task.watchers) {
      inserted += await syncWatcher(task, watcher, result);
    }

    await reportState(task, {
      platform: result.platform ?? null,
      strategy: result.strategy ?? null,
      etag: result.fingerprint?.etag ?? null,
      lastModified: result.fingerprint?.lastModified ?? null,
      contentHash: result.fingerprint?.contentHash ?? null,
      jobCount: result.fingerprint?.jobCount ?? result.jobs.length,
      requiresBrowser: Boolean(result.usedBrowser),
      changed: task.contentHash !== result.fingerprint?.contentHash,
      synced: true,
      error: null,
    });

    return { inserted, skipped: false };
  };

  async function runDiscovery(mode: CycleMode = 'full'): Promise<void> {
    if (cycleRunning) {
      logger.info('Discovery cycle already running, skipping this tick');
      return;
    }
    cycleRunning = true;
    const startedAt = Date.now();

    try {
      let tasks: JobSourceTask[];
      try {
        tasks = await apiClient.get<JobSourceTask[]>(
          '/internal/v1/job-sources',
        );
      } catch (err) {
        logger.error({ err }, 'Failed to fetch job sources');
        return;
      }

      logger.info(
        { mode, sources: tasks.length },
        'Starting job discovery cycle',
      );

      const results = await Promise.all(
        tasks.map((task) =>
          limit(async () => {
            try {
              return await processSource(task, mode);
            } catch (err) {
              logger.error({ url: task.url, err }, 'Source failed');
              await reportState(task, {
                error: err instanceof Error ? err.message : String(err),
              });
              return { inserted: 0, skipped: false };
            }
          }),
        ),
      );

      logger.info(
        {
          mode,
          sources: tasks.length,
          skipped: results.filter((r) => r.skipped).length,
          inserted: results.reduce((sum, r) => sum + r.inserted, 0),
          seconds: Math.round((Date.now() - startedAt) / 1000),
        },
        'Job discovery cycle complete',
      );
    } finally {
      cycleRunning = false;
      // The pool also self-closes when idle; closing here releases Chromium
      // immediately between cycles.
      await browser.close();
    }
  }

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

  const fastCron = new Cron(
    scraperConfig.fastCron,
    { timezone: workersConfig.cronTimezone },
    async () => {
      await runDiscovery('fast');
    },
  );

  const fullCron = new Cron(
    scraperConfig.fullCron,
    { timezone: workersConfig.cronTimezone },
    async () => {
      await runDiscovery('full');
    },
  );

  logger.info(
    {
      fast: scraperConfig.fastCron,
      full: scraperConfig.fullCron,
      timezone: workersConfig.cronTimezone,
      concurrency: scraperConfig.concurrency,
    },
    'ATS worker scheduled',
  );

  const triggerWorker = createWorker(
    QUEUES.DISCOVERY_TRIGGER,
    async (job) => {
      logger.info(`Triggered by ${job.id}, running discovery...`);
      await runDiscovery('full');
    },
    connection,
  );

  triggerWorker.on('completed', (job) => {
    logger.info(`Trigger job ${job.id} completed`);
  });
  triggerWorker.on('failed', (job, err) => {
    logger.error(`Trigger job ${job?.id} failed: ${err.message}`);
  });

  const shutdown = async () => {
    logger.info('Shutting down ATS worker...');
    fastCron.stop();
    fullCron.stop();
    await browser.close();
    await alertQueue.close();
    await triggerWorker.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  await new Promise(() => {});
}
