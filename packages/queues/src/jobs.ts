export const QUEUES = {
  EMAIL_SENDER: 'email-sender',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
