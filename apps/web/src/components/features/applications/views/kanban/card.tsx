'use client';

import { useDraggable } from '@dnd-kit/react';
import { Card, CardContent } from '@repo/ui/components/card';
import type { Application } from '@repo/db/entities/application';
import { Banknote, CalendarDays } from 'lucide-react';
import { cn } from '@repo/ui/lib/utils';
import { formatDate, formatSalary } from '@/utils/applications-utils';
import { CompanyLogo } from '@/components/icons/company-logo';
import { ApplicationPriority } from '@repo/db/types/application/priority';
import { Badge } from '@repo/ui/components/badge';

const PRIORITY_BADGE: Partial<
  Record<ApplicationPriority, { label: string; className: string }>
> = {
  [ApplicationPriority.HIGH]: {
    label: 'High',
    className:
      'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-900',
  },
  [ApplicationPriority.MEDIUM]: {
    label: 'Medium',
    className:
      'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-900',
  },
  [ApplicationPriority.LOW]: {
    label: 'Low',
    className:
      'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900',
  },
};

type KanbanCardProps = {
  application: Application;
  overlay?: boolean;
  onClick?: () => void;
};

export function KanbanCard({
  application,
  overlay = false,
  onClick,
}: KanbanCardProps) {
  const { ref, isDragSource } = useDraggable({
    id: application.id,
    type: 'item',
    data: { application },
    disabled: overlay,
  });

  const salary = formatSalary(application.salaryMin, application.salaryMax);
  const date = formatDate(application.appliedAt ?? application.created_at);

  return (
    <Card
      ref={ref as React.Ref<HTMLDivElement>}
      onClick={overlay ? undefined : onClick}
      className={cn(
        'gap-3 py-3 cursor-grab active:cursor-grabbing select-none transition-shadow',
        !overlay && 'hover:shadow-md',
        overlay && 'shadow-xl rotate-1 cursor-grabbing',
        isDragSource && !overlay && 'opacity-40',
      )}
    >
      <CardContent className="px-3 flex flex-col gap-2">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-start justify-between gap-1">
            <p className="font-semibold text-sm leading-tight line-clamp-1">
              {application.position}
            </p>
            {PRIORITY_BADGE[application.priority] && (
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] px-1 py-0',
                  PRIORITY_BADGE[application.priority]!.className,
                )}
              >
                {PRIORITY_BADGE[application.priority]!.label}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <CompanyLogo name={application.company} key={application.company} />
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
  );
}
