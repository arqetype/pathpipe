'use client';

import React from 'react';
import { Button } from '@repo/ui/components/button';
import { RiArrowLeftSLine, RiArrowRightSLine } from '@remixicon/react';
import type { JobMatchItem } from '@/actions/job-match/fetch';
import { JobRow } from './row';
import { useJobFilters } from './use-job-filters';

interface JobMatchListProps {
  jobs: JobMatchItem[];
  selectedId: string | null;
  total: number;
  page: number;
  limit: number;
  /** True when filters are set, so the empty state can say which is which. */
  filtered: boolean;
}

export function JobMatchList({
  jobs,
  selectedId,
  total,
  page,
  limit,
  filtered,
}: JobMatchListProps) {
  const { select, goToPage } = useJobFilters();
  const lastPage = Math.max(Math.ceil(total / limit), 1);

  if (!jobs.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 px-6 py-16 text-center">
        <h3 className="font-semibold text-muted-foreground">
          {filtered ? 'No offer matches these filters' : 'No job matches yet'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {filtered
            ? 'Try widening the filters, or turn on “Show expired” to look back.'
            : 'We’ll list offers here as soon as a company you watch publishes one.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        {jobs.map((job) => (
          <JobRow
            key={job.id}
            job={job}
            selected={job.id === selectedId}
            onSelect={select}
          />
        ))}
      </div>

      {lastPage > 1 && (
        <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
          <span>
            {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
              aria-label="Previous page"
            >
              <RiArrowLeftSLine className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= lastPage}
              onClick={() => goToPage(page + 1)}
              aria-label="Next page"
            >
              <RiArrowRightSLine className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
