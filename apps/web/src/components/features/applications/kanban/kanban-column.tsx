'use client';

import { CollisionPriority } from '@dnd-kit/abstract';
import { useDroppable } from '@dnd-kit/react';
import type { ReactNode } from 'react';
import { cn } from '@repo/ui/lib/utils';

type ColumnConfig = {
  label: string;
  dotClass: string;
};

type KanbanColumnProps = {
  id: string;
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
    collisionPriority: CollisionPriority.Low,
    accept: ['item', 'column'],
  });

  return (
    <div className="flex flex-col flex-shrink-0 w-72 h-full">
      <div className="flex items-center gap-2 px-1 pb-3">
        <span className={cn('size-2 rounded-full shrink-0', config.dotClass)} />
        <span className="text-sm font-semibold">{config.label}</span>
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {count}
        </span>
      </div>

      <div
        ref={ref}
        className={cn(
          'flex-1 flex flex-col gap-2 overflow-y-auto rounded-xl p-2 min-h-16 transition-colors',
          isDropTarget ? 'bg-accent/60' : 'bg-muted/40',
        )}
      >
        {children}
      </div>
    </div>
  );
}
