'use client';

import React from 'react';
import { Button } from '@repo/ui/components/button';
import { Card, CardContent, CardFooter, CardHeader } from '@repo/ui/components/card';
import { Badge } from '@repo/ui/components/badge';
import { RiExternalLinkLine, RiEyeLine, RiCloseLine, RiDeleteBinLine } from '@remixicon/react';
import { JobPostingStatus } from '@repo/db/types/job-posting/status';
import type { JobMatchItem } from '@/actions/job-match/fetch';
import { updateJobMatchStatusAction, deleteJobMatchAction } from '@/actions/job-match/update';
import { useRouter } from 'next/navigation';

interface JobMatchCardProps {
  job: JobMatchItem;
  onDeleted?: (id: string) => void;
}

export function JobMatchCard({ job, onDeleted }: JobMatchCardProps) {
  const [status, setStatus] = React.useState(job.status);
  const [deleted, setDeleted] = React.useState(false);
  const router = useRouter();

  const handleUpdate = async (newStatus: JobPostingStatus) => {
    setStatus(newStatus);
    await updateJobMatchStatusAction(job.id, newStatus);
    router.refresh();
  };

  const handleDelete = async () => {
    setDeleted(true);
    await deleteJobMatchAction(job.id);
    onDeleted?.(job.id);
    router.refresh();
  };

  if (deleted) return null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-base truncate">{job.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{job.companyName}</p>
          </div>
          <Badge variant={status === 'NEW' ? 'default' : 'secondary'}>
            {status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        {job.location && (
          <p className="text-sm text-muted-foreground">{job.location}</p>
        )}
        {job.salaryMin != null && (
          <p className="text-sm text-muted-foreground mt-1">
            {job.salaryMin.toLocaleString()} - {job.salaryMax?.toLocaleString() ?? 'N/A'} €
          </p>
        )}
        {job.description && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{job.description}</p>
        )}
      </CardContent>
      <CardFooter className="flex gap-2 pt-2">
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 h-9 px-3"
        >
          <RiExternalLinkLine className="size-4" />
          Apply
        </a>
        <Button variant="outline" size="sm" onClick={() => handleUpdate(JobPostingStatus.SEEN)}>
          <RiEyeLine className="size-4 mr-1" />
          Seen
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleUpdate(JobPostingStatus.DISMISSED)}>
          <RiCloseLine className="size-4 mr-1" />
          Dismiss
        </Button>
        <Button variant="ghost" size="sm" onClick={handleDelete} className="ml-auto text-muted-foreground hover:text-destructive">
          <RiDeleteBinLine className="size-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
