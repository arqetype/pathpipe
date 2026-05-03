import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { initializeDataSource } from '@/infrastructure/database/data-source';
import { configService } from '@/infrastructure/config/config.service';
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
