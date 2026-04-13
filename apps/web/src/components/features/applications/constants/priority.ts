import { ApplicationPriority } from '@repo/db/types/application/priority';

export const APPLICATION_PRIORITY_OPTIONS = [
  { value: ApplicationPriority.NONE, label: 'None' },
  { value: ApplicationPriority.LOW, label: 'Low' },
  { value: ApplicationPriority.MEDIUM, label: 'Medium' },
  { value: ApplicationPriority.HIGH, label: 'High' },
];

export const PRIORITY_CONFIG: Record<
  ApplicationPriority,
  { label: string; className: string }
> = {
  [ApplicationPriority.HIGH]: {
    label: 'High',
    className:
      'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-900',
  },
  [ApplicationPriority.MEDIUM]: {
    label: 'Medium',
    className:
      'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-900',
  },
  [ApplicationPriority.LOW]: {
    label: 'Low',
    className:
      'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900',
  },
  [ApplicationPriority.NONE]: {
    label: 'None',
    className: 'text-muted-foreground',
  },
};
