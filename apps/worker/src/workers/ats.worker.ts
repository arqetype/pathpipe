import { configService } from '@/infrastructure/config/config.service';
import { apiClient } from '@/infrastructure/api/api.client';
import { HttpClient } from '@/domain/scraping/http';
import { JobDiscoveryService } from '@/domain/scraping/pipeline';
import { createLimiter } from '@/domain/scraping/limiter';
import type { ScrapeResult } from '@/domain/scraping/types';
import { Cron } from 'croner';
import pino from 'pino';
import pretty from 'pino-pretty';
import { createWorker, QUEUES } from '@repo/queues';
import { CreateJobPostingDto } from '@repo/db/dto/job-posting/create-job-posting.dto';
import { EmploymentType } from '@repo/db/types/job-posting/employment-type';
import { RemoteType } from '@repo/db/types/job-posting/remote-type';
import {
  SeniorityLevel,
  WorkDomain,
} from '@repo/db/types/job-posting/work-domain';

const logger = pino(pretty());

interface JobSourceCompany {
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
  companies: JobSourceCompany[];
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

/** The worker emits enum values as strings; only known ones reach the API. */
const asEmploymentType = (value: string | undefined): EmploymentType | null =>
  value && value in EmploymentType ? (value as EmploymentType) : null;

const asRemoteType = (value: string | undefined): RemoteType | null =>
  value && value in RemoteType ? (value as RemoteType) : null;

const asDomain = (value: string | undefined): WorkDomain | null =>
  value && value in WorkDomain ? (value as WorkDomain) : null;

const asSeniority = (value: string | undefined): SeniorityLevel | null =>
  value && value in SeniorityLevel ? (value as SeniorityLevel) : null;

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

  const http = new HttpClient({
    userAgent: scraperConfig.userAgent,
    perHostDelayMs: scraperConfig.perHostDelayMs,
    respectRobots: scraperConfig.respectRobots,
    maxRequestsPerHost: scraperConfig.maxRequestsPerHost,
    maxRateLimitStrikes: scraperConfig.maxRateLimitStrikes,
    log: (data, msg) => logger.info(data, msg),
  });

  const discovery = new JobDiscoveryService({
    http,
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

  /** Writes one board's listing for the company behind it. */
  const syncCompany = async (
    task: JobSourceTask,
    company: JobSourceCompany,
    result: ScrapeResult,
  ): Promise<number> => {
    const source = result.resolvedUrl ?? task.url;
    const live = result.jobs;

    const dtos: CreateJobPostingDto[] = live.map((job) => ({
      title: job.title,
      url: job.url,
      externalId: job.externalId ?? null,
      description: job.description ?? null,
      descriptionHtml: job.descriptionHtml ?? null,
      location: job.location ?? null,
      locations: (job.parsedLocations ?? []).map((place) => ({
        city: place.city,
        region: place.region,
        country: place.country,
        raw: place.raw,
      })),
      department: job.department ?? null,
      domain: asDomain(job.domain),
      seniority: asSeniority(job.seniority),
      employmentType: asEmploymentType(job.employmentType),
      remoteType: asRemoteType(job.remoteType),
      salaryMin: job.salaryMin ?? null,
      salaryMax: job.salaryMax ?? null,
      salaryCurrency: job.salaryCurrency ?? null,
      source,
      postedAt: job.postedAt ?? null,
      validThrough: job.validThrough ?? null,
      companyId: company.companyId,
    }));

    let inserted = 0;
    let total = 0;
    for (let start = 0; start < dtos.length; start += SUBMIT_CHUNK_SIZE) {
      const chunk = dtos.slice(start, start + SUBMIT_CHUNK_SIZE);
      try {
        const response = await apiClient.post<BatchResponse>(
          '/job-postings/internal/batch',
          chunk,
        );
        inserted += response.jobs.length;
        total += response.total;
      } catch (err) {
        logger.error(
          { company: company.companyName, err },
          'Failed to submit jobs to API',
        );
        // A later chunk failing should not lose the ones that already landed.
      }
    }

    // The board is the authority on what is still open: anything stored for
    // this company and source that the board no longer lists has been taken
    // down. Only a complete listing may say that — a truncated one would close
    // half the board.
    if (!result.partial) {
      try {
        await apiClient.post('/internal/v1/job-postings/reconcile', {
          companyId: company.companyId,
          source,
          urls: live.map((job) => job.url),
          externalIds: live
            .map((job) => job.externalId)
            .filter((id): id is string => Boolean(id)),
        });
      } catch (err) {
        logger.warn(
          { company: company.companyName, err },
          'Failed to reconcile closed postings',
        );
      }
    }

    if (inserted) {
      logger.info(
        {
          company: company.companyName,
          inserted,
          total,
          platform: result.platform,
          strategy: result.strategy,
        },
        'New offers ingested',
      );
    }

    return inserted;
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
    for (const company of task.companies) {
      inserted += await syncCompany(task, company, result);
    }

    await reportState(task, {
      platform: result.platform ?? null,
      strategy: result.strategy ?? null,
      etag: result.fingerprint?.etag ?? null,
      lastModified: result.fingerprint?.lastModified ?? null,
      contentHash: result.fingerprint?.contentHash ?? null,
      jobCount: result.fingerprint?.jobCount ?? result.jobs.length,
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
    // Per-host budgets and rate-limit strikes are per cycle: a host that told
    // us to back off gets its next chance hours from now, not seconds.
    http.beginCycle();

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

      const inserted = results.reduce((sum, r) => sum + r.inserted, 0);

      const paused = http.pausedHosts();
      logger.info(
        {
          mode,
          sources: tasks.length,
          skipped: results.filter((r) => r.skipped).length,
          inserted,
          // Silence about a host we stopped talking to would read as "that
          // board has no jobs" rather than "we were asked to stop".
          backedOffHosts: paused.length ? paused : undefined,
          seconds: Math.round((Date.now() - startedAt) / 1000),
        },
        'Job discovery cycle complete',
      );

      await expireDatedOffers();

      // Who to tell about a new offer is a question about profiles, which live
      // in the API — the worker only says that new offers landed.
      if (inserted) {
        try {
          await apiClient.post('/internal/v1/job-postings/notify', {});
        } catch (err) {
          logger.warn({ err }, 'Failed to trigger match notifications');
        }
      }
    } finally {
      cycleRunning = false;
    }
  }

  /**
   * Closes offers that dated themselves out.
   *
   * The probe that used to fetch each offer's page is gone with the rest of the
   * crawling: an offer disappearing from its board is what reconciliation
   * already catches, and it catches it through the vendor's API rather than by
   * knocking on a page that may answer with a bot challenge.
   */
  async function expireDatedOffers(): Promise<void> {
    try {
      const { closed } = await apiClient.post<{ closed: number }>(
        '/internal/v1/job-postings/expire',
        {},
      );
      if (closed) logger.info({ closed }, 'Closed offers past their end date');
    } catch (err) {
      logger.warn({ err }, 'Failed to close expired offers');
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
    await triggerWorker.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  await new Promise(() => {});
}
