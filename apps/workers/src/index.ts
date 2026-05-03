import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { initializeDataSource } from '@/infrastructure/database/data-source';
import { configService } from '@/infrastructure/config/config.service';
import { createCronRouter } from '@/infrastructure/cron/cron-trigger.controller';
import { createTaskRouter } from '@/infrastructure/task/task-result.controller';
import { TaskRepository } from '@/infrastructure/task/task-repository';
import { EmailNotificationAdapter } from '@/adapters/notification/email-notification.adapter';
import { KeywordScoringAdapter } from '@/adapters/scoring/keyword-scoring.adapter';
import { CronSchedulerService } from '@/domain/services/cron-scheduler.service';
import { JobDiscoveryService } from '@/domain/services/job-discovery.service';
import { EnterpriseDiscoveryService } from '@/domain/services/enterprise-discovery.service';
import { ScoringService } from '@/domain/services/scoring.service';
import { NotificationService } from '@/domain/services/notification.service';
import { ArbeitnowDiscoveryAdapter } from './adapters/discovery/arbeitnow-discovery.adapter';
import { Mailer } from '@repo/email';
import pino from 'pino';
import pretty from 'pino-pretty';

const app = new Hono();
const logger = pino(pretty());

app.use(async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  logger.info(`${c.req.method} ${c.req.path} - ${c.res.status} (${ms}ms)`);
});

async function start() {
  try {
    await configService.validate();
    logger.info('Configuration validated');

    await initializeDataSource();
    logger.info('Database connected');

    const emailConfig = configService.get('email');

    const mailer = new Mailer({
      host: emailConfig.host,
      port: emailConfig.port,
      auth: { user: emailConfig.user, pass: emailConfig.pass },
      from: emailConfig.from,
    });

    const emailAdapter = new EmailNotificationAdapter(mailer);
    const scoringAdapter = new KeywordScoringAdapter();

    const jobDiscoveryService = new JobDiscoveryService([
      new ArbeitnowDiscoveryAdapter(),
    ]);
    const enterpriseDiscoveryService = new EnterpriseDiscoveryService();
    const scoringService = new ScoringService(scoringAdapter);
    const notificationService = new NotificationService(emailAdapter);
    const taskRepository = new TaskRepository();

    const cronScheduler = new CronSchedulerService(
      jobDiscoveryService,
      enterpriseDiscoveryService,
      scoringService,
      notificationService,
      taskRepository,
    );

    app.route('/cron', createCronRouter(cronScheduler));
    app.route('/tasks', createTaskRouter(taskRepository));

    cronScheduler.scheduleAll();
    logger.info('Cron jobs scheduled');

    const port = configService.get('workers').port;
    serve({ fetch: app.fetch, port }, (info) => {
      logger.info(`Workers server running on port ${info.port}`);
    });
  } catch (error) {
    logger.error('Failed to start server:' + error);
    process.exit(1);
  }
}

start();
