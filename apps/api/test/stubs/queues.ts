/**
 * `@repo/queues` in-memory.
 *
 * The package ships ESM and jest here runs CommonJS, and a real BullMQ queue
 * would need a Redis the suite does not start. Nothing under test reads a
 * queue: emails and alert digests are enqueued and handled by the worker.
 */
export const QUEUES = {
  EMAIL_SENDER: 'email-sender',
  JOB_ALERT: 'job-alert',
  DISCOVERY_TRIGGER: 'discovery-trigger',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

/** Everything enqueued during a test, in order, should a spec want to look. */
export const enqueued: Array<{ queue: string; name: string; data: unknown }> =
  [];

export const createQueue = (queue: string) => ({
  name: queue,
  add: (name: string, data: unknown) => {
    enqueued.push({ queue, name, data });
    return Promise.resolve({ id: String(enqueued.length) });
  },
  addBulk: (jobs: Array<{ name: string; data: unknown }>) => {
    for (const job of jobs) enqueued.push({ queue, ...job });
    return Promise.resolve([]);
  },
  close: () => Promise.resolve(),
});

const payload = (data: unknown) => data;

export const email = {
  verification: payload,
  otp: payload,
  resetPassword: payload,
  resetPasswordConfirmation: payload,
};

export const jobAlert = { digest: payload };
