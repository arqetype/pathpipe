import {
  MatchCriterion,
  MatchImportance,
} from '@repo/db/types/job-preference/importance';

/**
 * How each importance level reads to somebody setting it.
 *
 * "Ignore" is spelled out as switching a criterion off rather than as a zero,
 * because a profile with a filled-in field that scores nothing is otherwise a
 * mystery every time it is read back.
 */
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

/** Currencies the boards actually publish salaries in, most common first. */
export const SALARY_CURRENCIES = [
  'EUR',
  'GBP',
  'USD',
  'CHF',
  'CAD',
  'SEK',
  'NOK',
  'DKK',
  'PLN',
  'AUD',
] as const;

/** The freshness windows worth offering; anything finer is false precision. */
export const FRESHNESS_OPTIONS = [
  { value: '7', label: 'Last week' },
  { value: '14', label: 'Last 2 weeks' },
  { value: '30', label: 'Last month' },
  { value: '90', label: 'Last 3 months' },
] as const;

/** Countries offered up front; anything else is typed as a code. */
export const COMMON_COUNTRIES = [
  'FR',
  'GB',
  'DE',
  'ES',
  'IT',
  'NL',
  'BE',
  'CH',
  'IE',
  'PT',
  'US',
  'CA',
];

export { MatchCriterion, MatchImportance };
