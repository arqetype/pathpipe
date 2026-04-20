'use client';

import { useDraggable } from '@dnd-kit/react';
import { Card, CardContent } from '@repo/ui/components/card';
import type { Candidate } from '@repo/db/entities/candidate';
import { CalendarDays, Mail } from 'lucide-react';
import { cn } from '@repo/ui/lib/utils';
import { formatDate } from '@/utils/applications-utils';

type KanbanCardProps = {
  application: Candidate;
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

  const date = formatDate(application.created_at);
  const fullName = `${application.firstName} ${application.lastName}`;

  return (
    <Card
      ref={ref as React.Ref<HTMLDivElement>}
      onClick={overlay ? undefined : onClick}
      className={cn(
        'gap-3 py-3 cursor-grab active:cursor-grabbing select-none transition-shadow',
        'min-h-[80px]',
        !overlay && 'hover:shadow-md',
        overlay && 'shadow-xl rotate-1 cursor-grabbing',
        isDragSource && !overlay && 'opacity-40',
      )}
    >
      <CardContent className="px-3 flex flex-col gap-2">
        <p className="font-semibold text-sm leading-tight line-clamp-1">
          {fullName}
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {application.contactEmail && (
            <span className="flex items-center gap-1 min-w-0">
              <Mail className="size-3 shrink-0" />
              <span className="truncate">{application.contactEmail}</span>
            </span>
          )}
          {date && (
            <span className="flex items-center gap-1 shrink-0">
              <CalendarDays className="size-3 shrink-0" />
              {date}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
