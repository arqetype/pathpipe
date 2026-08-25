export const QUEUES = {
  EMAIL_SENDER: 'email-sender',
  JOB_ALERT: 'job-alert',
  DISCOVERY_TRIGGER: 'discovery-trigger',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
