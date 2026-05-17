import { QUEUES } from '../jobs.js';

export const queueName = QUEUES.SCHEDULER;

export type SchedulerJob = { companyId: string };

export const tick = (data: { companyId: string }): SchedulerJob => data;
