import { configService } from '@/infrastructure/config/config.service';
import { createWorker } from '@repo/queues';
import { QUEUES, email } from '@repo/queues';
import { Mailer } from '@repo/email';
import pino from 'pino';
import pretty from 'pino-pretty';

const logger = pino(pretty());

export async function startEmailWorker() {
  logger.info('Starting email worker...');

  const emailConfig = configService.get('email');
  const redisConfig = configService.get('redis');

  const mailer = new Mailer({
    host: emailConfig.host,
    port: emailConfig.port,
    auth: { user: emailConfig.user, pass: emailConfig.pass },
    from: emailConfig.from,
  });

  const connection = {
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password,
  };

  const worker = createWorker<email.EmailJob>(
    QUEUES.EMAIL_SENDER,
    async (job) => {
      logger.info(`Processing job ${job.id} of type ${job.data.type}`);

      switch (job.data.type) {
        case 'verification':
          await mailer.sendVerificationEmail(
            job.data.to,
            job.data.token,
            job.data.user,
          );
          break;
        case 'otp':
          await mailer.sendOTPEmail(job.data.to, job.data.otp, job.data.user);
          break;
        case 'reset-password':
          await mailer.sendResetPasswordEmail(
            job.data.to,
            job.data.token,
            job.data.user,
          );
          break;
        default:
          logger.warn(
            `Unknown job type: ${(job.data as { type: string }).type}`,
          );
      }

      logger.info(`Job ${job.id} completed`);
    },
    connection,
  );

  worker.on('completed', (job) => {
    logger.info(`Job ${job.id} finished`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} failed: ${err.message}`);
  });

  logger.info('Email worker started, waiting for jobs...');

  const shutdown = async () => {
    logger.info('Shutting down email worker...');
    await worker.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
