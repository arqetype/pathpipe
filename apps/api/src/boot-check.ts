import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

void NestFactory.create(AppModule, { logger: ['error'] }).then(async (app) => {
  await app.init();
  console.log('BOOT OK');
  await app.close();
  process.exit(0);
});
