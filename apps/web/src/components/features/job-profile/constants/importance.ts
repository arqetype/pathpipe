import { MatchImportance } from '@repo/db/types/job-preference/importance';

export const IMPORTANCE_OPTIONS: Array<{
  value: MatchImportance;
  label: string;
  hint: string;
}> = [
  {
    value: MatchImportance.IGNORED,
    label: 'Ignore',
    hint: 'Filled in, but left out of the score.',
  },
  {
    value: MatchImportance.NICE_TO_HAVE,
    label: 'Nice to have',
    hint: 'Counts for half.',
  },
  { value: MatchImportance.NORMAL, label: 'Normal', hint: 'The default.' },
  {
    value: MatchImportance.ESSENTIAL,
    label: 'Essential',
    hint: 'Counts double.',
  },
];
