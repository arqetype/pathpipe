import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { initializeDataSource } from '@/infrastructure/database/data-source';
import { configService } from '@/infrastructure/config/config.service';
import { createCronRouter } from '@/infrastructure/cron/cron-trigger.controller';
import { EmailNotificationAdapter } from '@/adapters/notification/email-notification.adapter';
import { KeywordScoringAdapter } from '@/adapters/scoring/keyword-scoring.adapter';
import { CronSchedulerService } from '@/domain/services/cron-scheduler.service';
import { JobDiscoveryService } from '@/domain/services/job-discovery.service';
import { EnterpriseDiscoveryService } from '@/domain/services/enterprise-discovery.service';
import { ScoringService } from '@/domain/services/scoring.service';
import { NotificationService } from '@/domain/services/notification.service';
import { logger } from 'hono/logger';
import { ArbeitnowDiscoveryAdapter } from './adapters/discovery/arbeitnow-discovery.adapter';
import { Mailer } from '@repo/email';

const app = new Hono();
app.use(logger());

async function start() {
  try {
    await configService.validate();
    console.log('Configuration validated');

    await initializeDataSource();
    console.log('Database connected');

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

    const cronScheduler = new CronSchedulerService(
      jobDiscoveryService,
      enterpriseDiscoveryService,
      scoringService,
      notificationService,
    );

    app.route('/cron', createCronRouter(cronScheduler));

    cronScheduler.scheduleAll();
    console.log('Cron jobs scheduled');

    const port = configService.get('workers').port;
    serve({ fetch: app.fetch, port }, (info) => {
      console.log(`Workers server running on port ${info.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
