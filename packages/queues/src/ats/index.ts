import { QUEUES } from '../jobs.js';

export const fetchQueueName = QUEUES.ATS_FETCH;
export const scoreQueueName = QUEUES.OFFER_SCORE;

export type AtsFetchJob = {
  companyId: string;
  triggeredBy: 'cron' | 'watch' | 'manual';
};

export type OfferScoreJob = { offerId: string; companyId: string };

export const fetch = (data: AtsFetchJob): AtsFetchJob => data;

export const score = (data: OfferScoreJob): OfferScoreJob => data;
