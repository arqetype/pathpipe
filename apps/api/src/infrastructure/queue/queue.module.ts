import { Global, Module } from '@nestjs/common';
import { QUEUES, createQueue } from '@repo/queues';
import { EmailJob } from '@repo/queues/email';

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
  ],
  exports: ['EMAIL_QUEUE'],
})
export class QueueModule {}
