import { Global, Module } from '@nestjs/common';
import { QUEUES, createQueue } from '@repo/queues';
import { EmailJob } from '@repo/queues/email';
import { JobAlertJob } from '@repo/queues/job-alert';

@Global()
@Module({
  providers: [
    {
      provide: 'EMAIL_QUEUE',
      useFactory() {
        return createQueue<EmailJob>(QUEUES.EMAIL_SENDER, {
          host: process.env.REDIS_HOST,
          port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
          password: process.env.REDIS_PASSWORD,
        });
      },
    },
    {
      provide: 'JOB_ALERT_QUEUE',
      useFactory() {
        return createQueue<JobAlertJob>(QUEUES.JOB_ALERT, {
          host: process.env.REDIS_HOST,
          port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
          password: process.env.REDIS_PASSWORD,
        });
      },
    },
    {
      provide: 'DISCOVERY_QUEUE',
      useFactory() {
        return createQueue(QUEUES.DISCOVERY_TRIGGER, {
          host: process.env.REDIS_HOST,
          port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
          password: process.env.REDIS_PASSWORD,
        });
      },
    },
  ],
  exports: ['EMAIL_QUEUE', 'JOB_ALERT_QUEUE', 'DISCOVERY_QUEUE'],
})
export class QueueModule {}
