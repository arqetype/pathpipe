import { ConnectionOptions, Queue } from 'bullmq';
import { QueueName } from './jobs';

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 2_000, // 2s → 10s → 30s
  },
  removeOnComplete: { count: 500 }, // keep last 500 completed jobs
  removeOnFail: { count: 200 }, // keep last 200 failed jobs
} as const;

type NewType = typeof DEFAULT_JOB_OPTIONS;

export const createQueue = <TJobData>(
  name: QueueName,
  connection: ConnectionOptions,
  overrides: Partial<NewType> = {},
): Queue<TJobData> =>
  new Queue<TJobData>(name, {
    connection,
    defaultJobOptions: { ...DEFAULT_JOB_OPTIONS, ...overrides },
  });
