'use client';

import { useSortable } from '@dnd-kit/react/sortable';
import { Card, CardContent } from '@repo/ui/components/card';
import type { Application } from '@repo/db/entities/application';
import { Banknote, CalendarDays } from 'lucide-react';
import { cn } from '@repo/ui/lib/utils';
import { formatDate, formatSalary } from '@/utils/applications-utils';
import { CompanyLogo } from '@/components/icons/company-logo';
import { ApplicationStatus } from '@repo/db/types/application/status';

type KanbanCardProps = {
  application: Application;
  index: number;
  column: ApplicationStatus;
  overlay?: boolean;
};

export function KanbanCard({
  application,
  index,
  column,
  overlay = false,
}: KanbanCardProps) {
  const { ref, isDragSource } = useSortable({
    id: application.id,
    index,
    type: 'item',
    accept: 'item',
    group: column,
    data: { application },
  });

  const salary = formatSalary(application.salaryMin, application.salaryMax);
  const date = formatDate(application.appliedAt ?? application.created_at);

  return (
    <div
      ref={overlay ? undefined : ref}
      className={cn(
        isDragSource && !overlay && 'opacity-40',
        overlay && 'rotate-1 cursor-grabbing',
      )}
    >
      <Card
        className={cn(
          'gap-3 py-3 cursor-grab active:cursor-grabbing select-none transition-shadow',
          !overlay && 'hover:shadow-md',
          overlay && 'shadow-xl',
        )}
      >
        <CardContent className="px-3 flex flex-col gap-2">
          <div className="flex flex-col gap-0.5">
            <p className="font-semibold text-sm leading-tight line-clamp-1">
              {application.position}
            </p>
            <div className="flex items-center gap-1 text-muted-foreground">
              <CompanyLogo name={application.company} />
              <p className="text-xs line-clamp-1">{application.company}</p>
            </div>
          </div>

          {(salary || date) && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {salary && (
                <span className="flex items-center gap-1">
                  <Banknote className="size-3 shrink-0" />
                  {salary}
                </span>
              )}
              {date && (
                <span className="flex items-center gap-1">
                  <CalendarDays className="size-3 shrink-0" />
                  {date}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
