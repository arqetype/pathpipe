'use client';

import React from 'react';
import { JobMatchCard } from './card';
import type { JobMatchItem } from '@/actions/job-match/fetch';

interface JobMatchListProps {
  jobs: JobMatchItem[];
  onDeleted?: (id: string) => void;
}

export function JobMatchList({ jobs, onDeleted }: JobMatchListProps) {
  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <h3 className="text-lg font-semibold text-muted-foreground">No job matches yet</h3>
        <p className="text-sm text-muted-foreground mt-1">
          We'll notify you when we find jobs matching your watched companies.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {jobs.map((job) => (
        <JobMatchCard key={job.id} job={job} onDeleted={onDeleted} />
      ))}
    </div>
  );
}
