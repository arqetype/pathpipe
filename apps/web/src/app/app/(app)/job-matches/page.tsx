import {
  fetchJobMatchAction,
  fetchJobMatchesAction,
} from '@/actions/job-match/fetch';
import { JobBoard } from '@/components/features/job-matches/board';
import type { JobPostingsQuery } from '@repo/db/query/job-posting';
import { str } from '@/utils/utils';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Filters that may appear more than once in the URL. */
const MULTI_KEYS = [
  'status',
  'companyId',
  'city',
  'country',
  'department',
  'employmentType',
  'remoteType',
] as const;

const many = (value: string | string[] | undefined): string[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

export default async function JobMatchesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const query: JobPostingsQuery = {
    search: str(params.search),
    salaryMin: str(params.salaryMin),
    minScore: str(params.minScore),
    maxScore: str(params.maxScore),
    postedWithinDays: str(params.postedWithinDays),
    saved: str(params.saved),
    tracked: str(params.tracked),
    followed: str(params.followed),
    onlyMatches: str(params.onlyMatches),
    includeClosed: str(params.includeClosed),
    sortBy: str(params.sortBy) as JobPostingsQuery['sortBy'],
    sortOrder: str(params.sortOrder) as JobPostingsQuery['sortOrder'],
    page: str(params.page),
  };
  for (const key of MULTI_KEYS) {
    const values = many(params[key]);
    if (values.length) {
      (query as Record<string, unknown>)[key] = values;
    }
  }

  const selectedId = str(params.job) ?? null;

  // The selected offer is fetched on its own rather than picked out of the
  // results: it stays readable when a filter or a page change drops it from the
  // current list.
  const [page, selected] = await Promise.all([
    fetchJobMatchesAction(query),
    selectedId ? fetchJobMatchAction(selectedId) : Promise.resolve(null),
  ]);

  return (
    <div className="flex h-full min-h-0 flex-col p-4">
      <JobBoard page={page} selected={selected} />
    </div>
  );
}
