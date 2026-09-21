import type { CompanySortBy } from '@repo/db/query/company';

export const COMPANY_SORT_OPTIONS: { value: CompanySortBy; label: string }[] = [
  { value: 'created_at', label: 'Date added' },
  { value: 'updated_at', label: 'Last updated' },
  { value: 'name', label: 'Name' },
  { value: 'industry', label: 'Industry' },
  { value: 'country', label: 'Country' },
];
