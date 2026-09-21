import Link from 'next/link';
import { Badge } from '@repo/ui/components/badge';
import { cn } from '@repo/ui/lib/utils';
import { STRONG_MATCH_SCORE } from '@repo/db/query/dashboard';
import type { JobPostingResponse } from '@repo/db/query/job-posting';
import type { RemoteType } from '@repo/db/types/job-posting/remote-type';
import { formatSalary, relativeDate } from '@/utils/applications-utils';
import { REMOTE_TYPE_LABELS } from '@/components/features/job-matches/constants';
import { CompanyLogo } from '@/components/shared/company-logo';
import { jobDetail } from './links';

export function OfferItem({ job }: { job: JobPostingResponse }) {
  const salary = formatSalary(job.salaryMin, job.salaryMax);
  const posted = relativeDate(job.postedAt ?? job.createdAt);

  return (
    <Link
      href={jobDetail(job.id)}
      className="flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-accent/50"
    >
      <CompanyLogo
        companyId={job.companyId}
        name={job.companyName}
        size={28}
        className="size-7 shrink-0 rounded-md"
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{job.title}</p>
        <p className="truncate text-sm text-muted-foreground">
          {job.companyName}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {job.location && (
            <span className="max-w-[14rem] truncate">{job.location}</span>
          )}
          {job.remoteType && (
            <Badge variant="secondary" className="font-normal">
              {REMOTE_TYPE_LABELS[job.remoteType as RemoteType]}
            </Badge>
          )}
          {salary && <span>{salary}</span>}
          {posted && <span>{posted}</span>}
        </div>
      </div>

      {typeof job.matchScore === 'number' && (
        <span
          className={cn(
            'shrink-0 text-sm font-medium tabular-nums',
            job.matchScore >= STRONG_MATCH_SCORE
              ? 'text-primary'
              : 'text-muted-foreground',
          )}
          title="Match against your profile"
        >
          {job.matchScore}%
        </span>
      )}
    </Link>
  );
}
