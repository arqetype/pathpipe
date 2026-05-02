'use client';

import { useDroppable } from '@dnd-kit/react';
import type { ReactNode } from 'react';
import type { ApplicationStatus } from '@repo/db/types/application/status';
import { cn } from '@repo/ui/lib/utils';
import { Card, CardContent } from '@repo/ui/components/card';
import { PlusIcon } from 'lucide-react';
import { useApplicationStore } from '../../store';

type ColumnConfig = {
  label: string;
  dotClass: string;
};

type KanbanColumnProps = {
  id: ApplicationStatus;
  config: ColumnConfig;
  count: number;
  children: ReactNode;
};

export function KanbanColumn({
  id,
  config,
  count,
  children,
}: KanbanColumnProps) {
  const { ref, isDropTarget } = useDroppable({
    id,
    type: 'column',
    accept: 'item',
  });

  return (
    <div className="flex flex-col w-72 group">
      <div className="bg-background w-full flex items-center gap-2 sticky top-0 px-3 py-2 border">
        <span className={cn('size-2 rounded-full shrink-0', config.dotClass)} />
        <span className="text-sm font-semibold">{config.label}</span>
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {count}
        </span>
      </div>

      <div
        ref={ref}
        className={cn(
          'flex flex-col gap-2 rounded-3xl mt-3 p-2 h-full transition-colors',
          isDropTarget ? 'bg-primary/10' : 'bg-accent',
        )}
      >
        {children}
        <Card
          className="group-hover:opacity-100 opacity-0 relative p-3 border-dashed cursor-pointer hover:bg-background/70 transition-all ring-0 border border-foreground/10 border-1"
          onClick={() => useApplicationStore.getState().openCreateDialog(id)}
          aria-label={`Add new card to ${config.label}`}
        >
          <CardContent className="flex items-center justify-center">
            <PlusIcon className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
