import { configService } from '@/infrastructure/config/config.service';
import { startEmailWorker } from './workers/email.worker';
import { startAtsWorker } from './workers/ats.worker';
import pino from 'pino';

const logger = pino();
const workerType = process.argv[2] as string;

async function main() {
  try {
    await configService.validate();

    switch (workerType) {
      case 'email':
        await startEmailWorker();
        break;
      case 'ats':
        await startAtsWorker();
        break;
      default:
        console.error('Usage: worker [email|ats]');
        console.log('Available workers: email, ats');
        process.exit(1);
    }
  } catch (err) {
    logger.error(
      {
        err,
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      },
      'Failed to start worker',
    );
    process.exit(1);
  }
}

main();
