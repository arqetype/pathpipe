'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { Separator } from '@repo/ui/components/separator';
import { cn } from '@repo/ui/lib/utils';
import {
  RiArrowLeftLine,
  RiBookmarkFill,
  RiBookmarkLine,
  RiBriefcaseLine,
  RiCloseLine,
  RiErrorWarningLine,
  RiExternalLinkLine,
  RiMapPinLine,
} from '@remixicon/react';
import { JobPostingStatus } from '@repo/db/types/job-posting/status';
import { JobPostingClosedReason } from '@repo/db/types/job-posting/closed-reason';
import type { EmploymentType } from '@repo/db/types/job-posting/employment-type';
import type { RemoteType } from '@repo/db/types/job-posting/remote-type';
import type { JobMatchItem } from '@/actions/job-match/fetch';
import {
  setJobMatchSavedAction,
  trackJobMatchAction,
  updateJobMatchStatusAction,
} from '@/actions/job-match/update';
import {
  formatDate,
  formatSalary,
  relativeDate,
} from '@/utils/applications-utils';
import {
  CLOSED_REASON_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  REMOTE_TYPE_LABELS,
} from './constants';

interface JobDetailProps {
  job: JobMatchItem;
  /** Rendered on small screens, where the detail replaces the list. */
  onBack?: () => void;
}

export function JobDetail({ job, onBack }: JobDetailProps) {
  const router = useRouter();
  const [saved, setSaved] = React.useState(job.saved);
  const [tracked, setTracked] = React.useState(Boolean(job.applicationId));
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    setSaved(job.saved);
    setTracked(Boolean(job.applicationId));
  }, [job.id, job.saved, job.applicationId]);

  // Opening an offer is what marks it read; the badge should clear without the
  // user having to say so.
  React.useEffect(() => {
    if (job.status !== JobPostingStatus.NEW || job.closedAt) return;
    void updateJobMatchStatusAction(job.id, JobPostingStatus.SEEN)
      .then(() => router.refresh())
      .catch(() => undefined);
  }, [job.id, job.status, job.closedAt, router]);

  const closed = Boolean(job.closedAt);
  const salary = formatSalary(job.salaryMin, job.salaryMax);

  const toggleSaved = async () => {
    const next = !saved;
    setSaved(next);
    try {
      await setJobMatchSavedAction(job.id, next);
      router.refresh();
    } catch {
      setSaved(!next);
      toast.error('Could not update the saved state');
    }
  };

  const addToBoard = async () => {
    setBusy(true);
    try {
      const { applicationId, created } = await trackJobMatchAction(job.id);
      setTracked(true);
      toast.success(
        created ? 'Added to your applications' : 'Already on your board',
        {
          action: {
            label: 'Open',
            onClick: () => router.push(`/app/applications?id=${applicationId}`),
          },
        },
      );
      router.refresh();
    } catch {
      toast.error('Could not add the offer to your board');
    } finally {
      setBusy(false);
    }
  };

  const dismiss = async () => {
    try {
      await updateJobMatchStatusAction(job.id, JobPostingStatus.DISMISSED);
      router.refresh();
    } catch {
      toast.error('Could not dismiss the offer');
    }
  };

  return (
    <article className="flex h-full flex-col">
      <header className="flex flex-col gap-3 border-b p-4">
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            className="self-start lg:hidden"
            onClick={onBack}
          >
            <RiArrowLeftLine className="size-4 mr-1" />
            Back to results
          </Button>
        )}

        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold leading-tight">{job.title}</h1>
          <p className="text-sm text-muted-foreground">{job.companyName}</p>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {(job.locations.length > 0 || job.location) && (
            <span className="inline-flex items-center gap-1">
              <RiMapPinLine className="size-4" />
              {job.locations.length
                ? job.locations
                    .map((place) =>
                      [place.city, place.region, place.country]
                        .filter(Boolean)
                        .join(', '),
                    )
                    .filter(Boolean)
                    .slice(0, 4)
                    .join(' · ')
                : job.location}
            </span>
          )}
          {job.department && (
            <span className="inline-flex items-center gap-1">
              <RiBriefcaseLine className="size-4" />
              {job.department}
            </span>
          )}
          {job.remoteType && (
            <Badge variant="secondary">
              {REMOTE_TYPE_LABELS[job.remoteType as RemoteType]}
            </Badge>
          )}
          {job.employmentType && (
            <Badge variant="secondary">
              {EMPLOYMENT_TYPE_LABELS[job.employmentType as EmploymentType]}
            </Badge>
          )}
          {salary && (
            <span className="font-medium text-foreground">
              {salary}
              {job.salaryCurrency && job.salaryCurrency !== 'EUR'
                ? ` ${job.salaryCurrency}`
                : ''}
            </span>
          )}
        </div>

        {closed ? (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <RiErrorWarningLine className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div>
              <p className="font-medium">No longer available</p>
              <p className="text-muted-foreground">
                {CLOSED_REASON_LABELS[
                  job.closedReason as JobPostingClosedReason
                ] ?? 'This offer is no longer open.'}{' '}
                Closed {relativeDate(job.closedAt) ?? 'recently'}.
              </p>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors',
              closed
                ? 'border border-input text-muted-foreground hover:bg-accent'
                : 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
            )}
          >
            <RiExternalLinkLine className="size-4" />
            {closed ? 'Open original page' : 'Apply'}
          </a>

          <Button variant="outline" size="sm" onClick={toggleSaved}>
            {saved ? (
              <RiBookmarkFill className="size-4 mr-1" />
            ) : (
              <RiBookmarkLine className="size-4 mr-1" />
            )}
            {saved ? 'Saved' : 'Save'}
          </Button>

          <Button
            variant={tracked ? 'secondary' : 'outline'}
            size="sm"
            onClick={addToBoard}
            disabled={busy}
          >
            <RiBriefcaseLine className="size-4 mr-1" />
            {tracked ? 'On my board' : 'Add to board'}
          </Button>

          {job.status !== JobPostingStatus.DISMISSED && !closed && (
            <Button variant="ghost" size="sm" onClick={dismiss}>
              <RiCloseLine className="size-4 mr-1" />
              Dismiss
            </Button>
          )}
        </div>
      </header>

      {job.matchReasons.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-b px-4 py-3">
          <span className="text-xs font-medium text-muted-foreground">
            {typeof job.matchScore === 'number'
              ? `${job.matchScore}% match`
              : 'Match'}
          </span>
          {job.matchReasons.map((reason, index) => (
            <Badge
              key={`${reason.kind}-${index}`}
              variant={reason.met ? 'secondary' : 'outline'}
              className={cn(
                'font-normal',
                !reason.met && 'text-muted-foreground line-through',
              )}
            >
              {reason.label}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {job.descriptionHtml ? (
          <div
            className="prose prose-sm max-w-none dark:prose-invert [&_a]:text-primary [&_a]:underline [&_li]:my-0.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h1]:text-base [&_h2]:text-base [&_h3]:text-sm [&_h1,&_h2,&_h3]:font-semibold [&_h1,&_h2,&_h3]:mt-4 [&_p]:my-2"
            // The markup was rebuilt from an allow-list of tags when it was
            // scraped, so nothing but formatting can reach this point.
            dangerouslySetInnerHTML={{ __html: job.descriptionHtml }}
          />
        ) : job.description ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {job.description}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            No description was published on the board. Open the original page
            for the full offer.
          </p>
        )}
      </div>

      <Separator />
      <footer className="grid grid-cols-2 gap-x-4 gap-y-1 p-4 text-xs text-muted-foreground sm:grid-cols-4">
        <span>
          Posted{' '}
          <span className="text-foreground">
            {formatDate(job.postedAt) ?? '—'}
          </span>
        </span>
        <span>
          First seen{' '}
          <span className="text-foreground">{formatDate(job.createdAt)}</span>
        </span>
        <span>
          Last seen{' '}
          <span className="text-foreground">
            {formatDate(job.lastSeenAt) ?? '—'}
          </span>
        </span>
        <span>
          Closes{' '}
          <span className="text-foreground">
            {formatDate(job.validThrough) ?? '—'}
          </span>
        </span>
      </footer>
    </article>
  );
}
