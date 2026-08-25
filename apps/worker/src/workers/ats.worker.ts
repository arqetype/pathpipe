import { configService } from '@/infrastructure/config/config.service';
import { apiClient } from '@/infrastructure/api/api.client';
import { ScraperService } from '@/domain/services/scraper.service';
import { Cron } from 'croner';
import pino from 'pino';
import pretty from 'pino-pretty';
import { createWorker, createQueue, QUEUES, jobAlert } from '@repo/queues';
import { CreateJobPostingDto } from '@repo/db/dto/job-posting/create-job-posting.dto';

const logger = pino(pretty());

interface WatchedCompany {
  userId: string;
  userEmail: string;
  userName: string;
  companyId: string;
  companyName: string;
  careersUrl: string | null;
  website: string | null;
}

export async function startAtsWorker() {
  logger.info('Starting ATS worker...');

  const redisConfig = configService.get('redis');
  const workersConfig = configService.get('workers');

  const connection = {
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password,
  };

  const alertQueue = createQueue<jobAlert.JobAlertJob>(
    QUEUES.JOB_ALERT,
    connection,
  );
  const scraper = new ScraperService();

  async function runDiscovery() {
    logger.info('Starting job discovery cycle...');

    let companies: WatchedCompany[];
    try {
      companies = await apiClient.get<WatchedCompany[]>(
        '/internal/v1/watched-companies',
      );
    } catch (err) {
      logger.error({ err }, 'Failed to fetch watched companies');
      return;
    }

    logger.info(`Found ${companies.length} watched companies to check`);

    for (const company of companies) {
      const careersUrl = company.careersUrl ?? company.website;
      if (!careersUrl) {
        logger.warn(
          { company: company.companyName },
          'No careers URL found, skipping',
        );
        continue;
      }

      logger.info(
        { company: company.companyName, url: careersUrl },
        'Scraping careers page',
      );
      const result = await scraper.scrapeCareersPage(careersUrl);

      if (result.error) {
        logger.warn(
          { company: company.companyName, error: result.error },
          'Scrape failed',
        );
        continue;
      }

      if (result.jobs.length === 0) {
        logger.info({ company: company.companyName }, 'No jobs found');
        continue;
      }

      logger.info(
        { company: company.companyName, count: result.jobs.length },
        'Jobs found',
      );

      const dtos: CreateJobPostingDto[] = result.jobs.map((job) => ({
        title: job.title,
        url: job.url,
        description: job.description ?? null,
        location: job.location ?? null,
        salaryMin: job.salaryMin ?? null,
        salaryMax: job.salaryMax ?? null,
        source: careersUrl,
        postedAt: job.postedAt ?? null,
        companyId: company.companyId,
        userId: company.userId,
      }));

      let inserted: number;
      try {
        const resp = await apiClient.post<{ inserted: number; total: number }>(
          '/job-postings/internal/batch',
          dtos,
        );
        inserted = resp.inserted;
      } catch (err) {
        logger.error(
          { company: company.companyName, err },
          'Failed to submit jobs to API',
        );
        continue;
      }

      if (inserted > 0) {
        logger.info(
          { company: company.companyName, inserted },
          'New jobs discovered, enqueuing alert',
        );

        await alertQueue.add('new-job-alert', {
          type: 'new-job-alert',
          to: company.userEmail,
          userName: company.userName,
          companyName: company.companyName,
          companyId: company.companyId,
          jobCount: inserted,
          jobs: result.jobs.slice(0, inserted).map((j) => ({
            title: j.title,
            url: j.url,
            location: j.location,
          })),
        });
      }
    }

    logger.info('Job discovery cycle complete');
  }

  logger.info('ATS worker started, waiting for API...');

  // Wait for API to be ready before first run
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

  // Run immediately on startup
  await runDiscovery();

  // Schedule recurring runs (every hour)
  const cronExpr = '0 * * * *';
  const cronJob = new Cron(
    cronExpr,
    { timezone: workersConfig.cronTimezone },
    async () => {
      await runDiscovery();
    },
  );

  logger.info(
    `ATS worker started, scheduled: "${cronExpr}" (${workersConfig.cronTimezone})`,
  );

  // Listen for manual trigger via API
  const triggerWorker = createWorker(
    QUEUES.DISCOVERY_TRIGGER,
    async (job) => {
      logger.info(`Triggered by ${job.id}, running discovery...`);
      await runDiscovery();
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
    cronJob.stop();
    await alertQueue.close();
    await triggerWorker.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  await new Promise(() => {});
}
