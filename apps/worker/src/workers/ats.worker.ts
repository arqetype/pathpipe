import pino from 'pino';
import pretty from 'pino-pretty';

const logger = pino(pretty());

export async function startAtsWorker() {
  logger.info('ATS worker not implemented yet');

  const shutdown = async () => {
    logger.info('Shutting down ATS worker...');
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  await new Promise(() => {});
}
