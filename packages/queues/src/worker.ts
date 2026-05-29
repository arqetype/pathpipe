import type { ConnectionOptions, Processor, WorkerOptions } from 'bullmq';
import { Worker } from 'bullmq';
import type { QueueName } from './jobs.js';

export const DEFAULT_WORKER_OPTIONS: Partial<WorkerOptions> = {
  concurrency: 5,
  limiter: {
    max: 5,
    duration: 1_000,
  },
};

export type { Processor };

/**
 * Create a BullMQ worker instance.
 * @param name - Queue name (use QUEUES constants)
 * @param processor - Job handler function or path to processor file
 * @param connection - Redis connection config
 * @param options - Override default worker options
 */
export const createWorker = <TJobData>(
  name: QueueName,
  processor: Processor<TJobData>,
  connection: ConnectionOptions,
  options?: Omit<WorkerOptions, 'connection'>,
): Worker<TJobData> =>
  new Worker<TJobData>(name, processor, {
    connection,
    ...DEFAULT_WORKER_OPTIONS,
    ...options,
  });
