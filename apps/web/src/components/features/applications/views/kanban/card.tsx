'use client';

import { useDraggable } from '@dnd-kit/react';
import { Card, CardContent } from '@repo/ui/components/card';
import type { Application } from '@repo/db/entities/application';
import { RiMoneyDollarBoxLine, RiCalendarLine } from '@remixicon/react';
import { cn } from '@repo/ui/lib/utils';
import { formatDate, formatSalary } from '@/utils/applications-utils';
import { CompanyLogo } from '@/components/shared/company-logo';
import { Badge } from '@repo/ui/components/badge';
import { TIER_CONFIG } from '../../constants/tier';
import { ApplicationTier } from '@repo/db/types/application/tier';

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
        'min-h-[100px]', // Added minimum height to prevent shrinking
        !overlay && 'hover:shadow-md',
        overlay && 'shadow-xl rotate-1 cursor-grabbing',
        isDragSource && !overlay && 'opacity-40',
      )}
    >
      <CardContent className="px-3 flex flex-col gap-2 max-h-[500px] overflow-y-auto">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-start justify-between gap-1">
            <p className="font-semibold text-sm leading-tight line-clamp-1">
              {application.position}
            </p>
            {TIER_CONFIG[application.tier] &&
              application.tier !== ApplicationTier.NONE && (
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] px-1 py-0',
                    TIER_CONFIG[application.tier]!.className,
                  )}
                >
                  {TIER_CONFIG[application.tier]!.label}
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
                <RiMoneyDollarBoxLine className="size-3 shrink-0" />
                {salary}
              </span>
            )}
            {date && (
              <span className="flex items-center gap-1">
                <RiCalendarLine className="size-3 shrink-0" />
                {date}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
