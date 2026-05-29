import { ApplicationTier } from '@repo/db/types/application/tier';

export const APPLICATION_TIER_OPTIONS = [
  { value: ApplicationTier.NONE, label: 'None' },
  { value: ApplicationTier.S_TIER, label: 'S-Tier' },
  { value: ApplicationTier.A_TIER, label: 'A-Tier' },
  { value: ApplicationTier.B_TIER, label: 'B-Tier' },
];

export const TIER_CONFIG: Record<
  ApplicationTier,
  { label: string; className: string }
> = {
  [ApplicationTier.NONE]: {
    label: 'None',
    className: '',
  },
  [ApplicationTier.S_TIER]: {
    label: 'S-Tier',
    className:
      'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-900',
  },
  [ApplicationTier.A_TIER]: {
    label: 'A-Tier',
    className:
      'bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-900',
  },
  [ApplicationTier.B_TIER]: {
    label: 'B-Tier',
    className:
      'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-900',
  },
};
