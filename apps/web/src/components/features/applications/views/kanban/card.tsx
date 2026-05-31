'use client';

import { useSortable } from '@dnd-kit/react/sortable';
import { Card, CardContent } from '@repo/ui/components/card';
import type { Application } from '@repo/db/entities/application';
import { RiMoneyDollarBoxLine, RiCalendarLine } from '@remixicon/react';
import { cn } from '@repo/ui/lib/utils';
import { formatDate, formatSalary } from '@/utils/applications-utils';
import { CompanyLogo } from '@/components/shared/company-logo';
import { Badge } from '@repo/ui/components/badge';
import { TIER_CONFIG } from '../../constants/tier';
import { ApplicationTier } from '@repo/db/types/application/tier';
import type { ApplicationStatus } from '@repo/db/types/application/status';

type KanbanCardProps = {
  application: Application;
  index?: number;
  group?: ApplicationStatus;
  overlay?: boolean;
  onClick?: (id: string) => void;
};

export function KanbanCard({
  application,
  index = 0,
  group,
  overlay = false,
  onClick,
}: KanbanCardProps) {
  const { ref, isDragSource } = useSortable({
    id: application.id,
    index,
    group,
    type: 'item',
    accept: 'item',
    data: { application },
    disabled: overlay,
  });

  const salary = formatSalary(application.salaryMin, application.salaryMax);
  const date = formatDate(application.appliedAt ?? application.created_at);
  const tierConfig = TIER_CONFIG[application.tier];
  const hasTier = tierConfig && application.tier !== ApplicationTier.NONE;

  return (
    <Card
      ref={ref as React.Ref<HTMLDivElement>}
      onClick={overlay ? undefined : () => onClick?.(application.id)}
      className={cn(
        'py-3 cursor-grab active:cursor-grabbing select-none transition-shadow',
        !overlay && 'hover:shadow-md',
        overlay && 'shadow-xl rotate-1 cursor-grabbing',
        isDragSource && !overlay && 'opacity-40',
      )}
    >
      <CardContent className="px-3 flex flex-col gap-2.5">
        <div className="flex items-start gap-3">
          <CompanyLogo
            companyId={application.company?.id}
            cacheKey={
              application.company?.updated_at
                ? new Date(application.company.updated_at).getTime()
                : undefined
            }
            name={application.company?.name ?? 'Unknown'}
            size={40}
            className="size-10 rounded-lg shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-snug line-clamp-2">
              {application.position}
            </p>
            <p className="text-xs text-muted-foreground leading-tight line-clamp-1 mt-0.5">
              {application.company?.name ?? 'Unknown'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
          {hasTier && (
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] px-1.5 py-0 shrink-0 ml-auto',
                tierConfig.className,
              )}
            >
              {tierConfig.label}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
