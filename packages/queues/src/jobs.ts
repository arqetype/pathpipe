/**
 * Known queue names in the system.
 */
export const QUEUES = {
  ATS_FETCH: 'ats-fetch',
  OFFER_SCORE: 'offer-scoring',
  SCHEDULER: 'scheduler-tick',
} as const;

/** Union of all known queue names. */
export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

/** Job payload for the ATS fetch queue. */
export type AtsFetchJob = {
  companyId: string;
  triggeredBy: 'cron' | 'watch' | 'manual';
};

/** Job payload for the offer scoring queue. */
export type OfferScoreJob = {
  offerId: string;
  companyId: string;
};

/** Job payload for the scheduler tick queue. */
export type SchedulerTickJob = {
  companyId: string;
};

/** Union of all known job types. */
export type AnyJob = AtsFetchJob | OfferScoreJob | SchedulerTickJob;

/**
 * Get the job data type for a specific queue.
 * @example type Data = JobDataFor<'ats-fetch'>; // AtsFetchJob
 */
export type JobDataFor<Q extends QueueName> = Q extends typeof QUEUES.ATS_FETCH
  ? AtsFetchJob
  : Q extends typeof QUEUES.OFFER_SCORE
    ? OfferScoreJob
    : Q extends typeof QUEUES.SCHEDULER
      ? SchedulerTickJob
      : never;
