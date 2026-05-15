export const QUEUES = {
  ATS_FETCH: 'ats-fetch',
  OFFER_SCORE: 'offer-scoring',
  SCHEDULER: 'scheduler-tick',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

export type AtsFetchJob = {
  companyId: string;
  triggeredBy: 'cron' | 'watch' | 'manual';
};

export type OfferScoreJob = {
  offerId: string;
  companyId: string;
};

export type SchedulerTickJob = {
  companyId: string;
};

export type AnyJob = AtsFetchJob | OfferScoreJob | SchedulerTickJob;
