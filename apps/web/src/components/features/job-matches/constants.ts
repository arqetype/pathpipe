import { EmploymentType } from '@repo/db/types/job-posting/employment-type';
import { RemoteType } from '@repo/db/types/job-posting/remote-type';
import { JobPostingStatus } from '@repo/db/types/job-posting/status';
import { JobPostingClosedReason } from '@repo/db/types/job-posting/closed-reason';
import {
  SeniorityLevel,
  WorkDomain,
} from '@repo/db/types/job-posting/work-domain';

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  [EmploymentType.FULL_TIME]: 'Full time',
  [EmploymentType.PART_TIME]: 'Part time',
  [EmploymentType.CONTRACT]: 'Contract',
  [EmploymentType.TEMPORARY]: 'Temporary',
  [EmploymentType.INTERNSHIP]: 'Internship',
  [EmploymentType.APPRENTICESHIP]: 'Apprenticeship',
  [EmploymentType.FREELANCE]: 'Freelance',
  [EmploymentType.VOLUNTEER]: 'Volunteer',
  [EmploymentType.OTHER]: 'Other',
};

export const REMOTE_TYPE_LABELS: Record<RemoteType, string> = {
  [RemoteType.ON_SITE]: 'On site',
  [RemoteType.HYBRID]: 'Hybrid',
  [RemoteType.REMOTE]: 'Remote',
};

export const STATUS_LABELS: Record<JobPostingStatus, string> = {
  [JobPostingStatus.NEW]: 'New',
  [JobPostingStatus.SEEN]: 'Seen',
  [JobPostingStatus.APPLIED]: 'Applied',
  [JobPostingStatus.DISMISSED]: 'Dismissed',
};

/** Why an offer is no longer available, in the words shown to the user. */
export const CLOSED_REASON_LABELS: Record<JobPostingClosedReason, string> = {
  [JobPostingClosedReason.REMOVED_FROM_LISTING]:
    'This offer was taken off the company’s job board.',
  [JobPostingClosedReason.DEAD_LINK]: 'This offer’s page no longer exists.',
  [JobPostingClosedReason.MARKED_CLOSED]:
    'This offer is no longer accepting applications.',
  [JobPostingClosedReason.EXPIRED]: 'This offer reached its closing date.',
};

export const WORK_DOMAIN_LABELS: Record<WorkDomain, string> = {
  [WorkDomain.FRONTEND]: 'Frontend',
  [WorkDomain.BACKEND]: 'Backend',
  [WorkDomain.FULLSTACK]: 'Full stack',
  [WorkDomain.MOBILE]: 'Mobile',
  [WorkDomain.DATA]: 'Data',
  [WorkDomain.MACHINE_LEARNING]: 'Machine learning',
  [WorkDomain.INFRASTRUCTURE]: 'Infrastructure',
  [WorkDomain.SECURITY]: 'Security',
  [WorkDomain.EMBEDDED]: 'Embedded',
  [WorkDomain.QA]: 'QA',
  [WorkDomain.PRODUCT]: 'Product',
  [WorkDomain.DESIGN]: 'Design',
  [WorkDomain.RESEARCH]: 'Research',
  [WorkDomain.DEVREL]: 'Developer relations',
  [WorkDomain.SALES]: 'Sales',
  [WorkDomain.MARKETING]: 'Marketing',
  [WorkDomain.OPERATIONS]: 'Operations',
  [WorkDomain.FINANCE]: 'Finance',
  [WorkDomain.OTHER]: 'Other',
};

export const SENIORITY_LABELS: Record<SeniorityLevel, string> = {
  [SeniorityLevel.INTERN]: 'Intern',
  [SeniorityLevel.JUNIOR]: 'Junior',
  [SeniorityLevel.MID]: 'Mid',
  [SeniorityLevel.SENIOR]: 'Senior',
  [SeniorityLevel.LEAD]: 'Lead / Staff',
  [SeniorityLevel.MANAGER]: 'Manager',
  [SeniorityLevel.DIRECTOR]: 'Director+',
};

export const POSTED_WITHIN_OPTIONS = [
  { value: '', label: 'Any time' },
  { value: '1', label: 'Past 24 hours' },
  { value: '7', label: 'Past week' },
  { value: '30', label: 'Past month' },
];

export const SORT_OPTIONS = [
  /** Needs a profile; the API falls back to freshness without one. */
  { value: 'match', label: 'Best fit' },
  /** Only meaningful with a search term; the API falls back to freshness. */
  { value: 'relevance', label: 'Most relevant' },
  { value: 'postedAt', label: 'Most recent' },
  { value: 'salaryMax', label: 'Highest salary' },
  { value: 'company', label: 'Company' },
  { value: 'title', label: 'Title' },
];

/** Filter keys that carry several values at once. */
export const MULTI_FILTER_KEYS = [
  'companyId',
  'city',
  'country',
  'department',
  'employmentType',
  'remoteType',
  'status',
] as const;

export type MultiFilterKey = (typeof MULTI_FILTER_KEYS)[number];

const REGION_NAMES =
  typeof Intl !== 'undefined' && 'DisplayNames' in Intl
    ? new Intl.DisplayNames(['en'], { type: 'region' })
    : null;

/** "FR" reads as "France" everywhere it is shown. */
export const countryName = (code: string): string => {
  if (!code) return code;
  try {
    return REGION_NAMES?.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
};

/** The words on a match reason chip. */
export const MATCH_REASON_PREFIX: Record<string, string> = {
  employmentType: '',
  city: '',
  country: '',
  remote: '',
  keyword: '',
  salary: 'up to ',
  followed: '',
};
