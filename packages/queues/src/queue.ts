import type { ConnectionOptions } from 'bullmq';
import { Queue } from 'bullmq';
import type { QueueName } from './jobs.js';

/** Default job options applied to all queues. */
export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 2_000,
  },
  removeOnComplete: { count: 500 },
  removeOnFail: { count: 200 },
} as const;

export type { JobsOptions } from 'bullmq';

/**
 * Create a BullMQ queue instance.
 * @param name - Queue name (use QUEUES constants)
 * @param connection - Redis connection config
 * @param overrides - Override default job options
 */
export const createQueue = <TJobData>(
  name: QueueName,
  connection: ConnectionOptions,
  overrides: Partial<typeof DEFAULT_JOB_OPTIONS> = {},
): Queue<TJobData> =>
  new Queue<TJobData>(name, {
    connection,
    defaultJobOptions: { ...DEFAULT_JOB_OPTIONS, ...overrides },
  });
