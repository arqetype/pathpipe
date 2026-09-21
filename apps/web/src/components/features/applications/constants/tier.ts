import { ApplicationTier } from '@repo/db/types/application/tier';

export const APPLICATION_TIER_OPTIONS = [
  { value: ApplicationTier.NONE, label: 'None' },
  { value: ApplicationTier.S_TIER, label: 'S-Tier' },
  { value: ApplicationTier.A_TIER, label: 'A-Tier' },
  { value: ApplicationTier.B_TIER, label: 'B-Tier' },
];

/**
 * How much a given application matters to its owner.
 *
 * Six classes each became two: a status token already carries its own dark
 * value, so the `dark:` half of every rule was a second palette to keep in step
 * with the first — and the place where a theme quietly drifts.
 */
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
    className: 'bg-status-accent text-status-accent-fg border-transparent',
  },
  [ApplicationTier.A_TIER]: {
    label: 'A-Tier',
    className: 'bg-status-success text-status-success-fg border-transparent',
  },
  [ApplicationTier.B_TIER]: {
    label: 'B-Tier',
    className: 'bg-status-warning text-status-warning-fg border-transparent',
  },
};
