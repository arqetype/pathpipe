import { type ConnectionOptions } from 'bullmq';

export const redisConnectionFromEnv = (): ConnectionOptions => ({
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
  password: process.env.REDIS_PASSWORD ?? undefined,
});
