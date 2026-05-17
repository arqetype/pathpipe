export const QUEUES = {
  ATS_FETCH: 'ats-fetch',
  OFFER_SCORE: 'offer-scoring',
  SCHEDULER: 'scheduler-tick',
  EMAIL_SENDER: 'email-sender',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
