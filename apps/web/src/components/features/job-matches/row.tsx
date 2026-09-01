'use client';

import React from 'react';
import { Badge } from '@repo/ui/components/badge';
import { cn } from '@repo/ui/lib/utils';
import { RiBookmarkFill, RiMapPinLine, RiTimeLine } from '@remixicon/react';
import { JobPostingStatus } from '@repo/db/types/job-posting/status';
import type { EmploymentType } from '@repo/db/types/job-posting/employment-type';
import type { RemoteType } from '@repo/db/types/job-posting/remote-type';
import type { JobMatchItem } from '@/actions/job-match/fetch';
import { formatSalary } from '@/utils/applications-utils';
import { EMPLOYMENT_TYPE_LABELS, REMOTE_TYPE_LABELS } from './constants';

/** "3d ago" — offers are compared by freshness far more than by exact date. */
export function relativeDate(value: string | null): string | null {
  if (!value) return null;
  const days = Math.floor(
    (Date.now() - new Date(value).getTime()) / 86_400_000,
  );
  if (!Number.isFinite(days) || days < 0) return null;
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

interface JobRowProps {
  job: JobMatchItem;
  selected: boolean;
  onSelect: (id: string) => void;
}

export function JobRow({ job, selected, onSelect }: JobRowProps) {
  const salary = formatSalary(job.salaryMin, job.salaryMax);
  const posted = relativeDate(job.postedAt ?? job.createdAt);
  const closed = Boolean(job.closedAt);

  return (
    <button
      type="button"
      onClick={() => onSelect(job.id)}
      aria-current={selected}
      className={cn(
        'w-full text-left px-4 py-3 border-b transition-colors',
        'hover:bg-accent/50 focus-visible:outline-none focus-visible:bg-accent/50',
        selected && 'bg-accent',
        closed && 'opacity-60',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3
              className={cn(
                'truncate font-medium',
                job.status === JobPostingStatus.NEW &&
                  !closed &&
                  'text-primary',
              )}
            >
              {job.title}
            </h3>
            {job.saved && (
              <RiBookmarkFill className="size-3.5 shrink-0 text-primary" />
            )}
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {job.companyName}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {typeof job.matchScore === 'number' && (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
                job.matchScore >= 70
                  ? 'bg-primary/10 text-primary'
                  : job.matchScore >= 40
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground',
              )}
              title="How well this offer fits your profile"
            >
              {job.matchScore}%
            </span>
          )}
          {closed ? (
            <Badge variant="outline">Expired</Badge>
          ) : (
            job.status === JobPostingStatus.NEW && <Badge>New</Badge>
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {job.location && (
          <span className="inline-flex items-center gap-1 max-w-[16rem] truncate">
            <RiMapPinLine className="size-3.5 shrink-0" />
            {job.location}
          </span>
        )}
        {job.remoteType && (
          <Badge variant="secondary" className="font-normal">
            {REMOTE_TYPE_LABELS[job.remoteType as RemoteType]}
          </Badge>
        )}
        {job.employmentType && (
          <Badge variant="secondary" className="font-normal">
            {EMPLOYMENT_TYPE_LABELS[job.employmentType as EmploymentType]}
          </Badge>
        )}
        {salary && (
          <span className="font-medium text-foreground">{salary}</span>
        )}
        {posted && (
          <span className="inline-flex items-center gap-1">
            <RiTimeLine className="size-3.5" />
            {posted}
          </span>
        )}
        {job.applicationId && (
          <Badge variant="outline" className="font-normal">
            On my board
          </Badge>
        )}
        {job.followed && (
          <Badge variant="outline" className="font-normal">
            Following
          </Badge>
        )}
      </div>
    </button>
  );
}
