import { EmploymentType } from '@repo/db/types/job-posting/employment-type';
import { RemoteType } from '@repo/db/types/job-posting/remote-type';
import {
  SeniorityLevel,
  WorkDomain,
} from '@repo/db/types/job-posting/work-domain';
import {
  EMPLOYMENT_TYPE_LABELS,
  REMOTE_TYPE_LABELS,
  SENIORITY_LABELS,
  WORK_DOMAIN_LABELS,
} from '../../job-matches/constants';

const toOptions = <T extends string>(
  values: T[],
  labels: Record<T, string>,
): Array<{ value: T; label: string }> =>
  values.map((value) => ({ value, label: labels[value] }));

export const DOMAIN_OPTIONS = toOptions(
  Object.values(WorkDomain),
  WORK_DOMAIN_LABELS,
);
export const SENIORITY_OPTIONS = toOptions(
  Object.values(SeniorityLevel),
  SENIORITY_LABELS,
);
export const EMPLOYMENT_OPTIONS = toOptions(
  Object.values(EmploymentType),
  EMPLOYMENT_TYPE_LABELS,
);
export const REMOTE_OPTIONS = toOptions(
  Object.values(RemoteType),
  REMOTE_TYPE_LABELS,
);
