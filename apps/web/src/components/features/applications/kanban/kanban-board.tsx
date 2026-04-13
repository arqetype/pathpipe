'use client';

import { useState, useTransition, useRef, useMemo, useEffect } from 'react';
import { DragDropProvider, DragOverlay } from '@dnd-kit/react';
import { move } from '@dnd-kit/helpers';
import type { Application } from '@repo/db/entities/application';
import { ApplicationStatus } from '@repo/db/types/application/status';
import { KanbanColumn } from './kanban-column';
import { KanbanCard } from './kanban-card';
import { updateApplicationStatusAction } from '@/actions/application/update-status';
import { toast } from 'sonner';

const COLUMNS: {
  status: ApplicationStatus;
  label: string;
  dotClass: string;
}[] = [
  {
    status: ApplicationStatus.WISHLIST,
    label: 'Wishlist',
    dotClass: 'bg-violet-400',
  },
  {
    status: ApplicationStatus.APPLIED,
    label: 'Applied',
    dotClass: 'bg-blue-400',
  },
  {
    status: ApplicationStatus.INTERVIEW,
    label: 'Interview',
    dotClass: 'bg-amber-400',
  },
  { status: ApplicationStatus.OFFER, label: 'Offer', dotClass: 'bg-green-400' },
  {
    status: ApplicationStatus.REJECTED,
    label: 'Rejected',
    dotClass: 'bg-red-400',
  },
  {
    status: ApplicationStatus.GHOSTED,
    label: 'Ghosted',
    dotClass: 'bg-slate-400',
  },
];

type KanbanBoardProps = {
  applications: Application[];
};

export function KanbanBoard({ applications: initial }: KanbanBoardProps) {
  const [columnItems, setColumnItems] = useState<Record<string, string[]>>(() =>
    COLUMNS.reduce(
      (acc, col) => {
        acc[col.status] = initial
          .filter((a) => a.status === col.status)
          .map((a) => a.id);
        return acc;
      },
      {} as Record<string, string[]>,
    ),
  );

  const applicationsById = useMemo(
    () => new Map(initial.map((a) => [a.id, a])),
    [initial],
  );

  // Sync new applications added from the server after revalidation
  useEffect(() => {
    setColumnItems((prev) => {
      const allCurrentIds = new Set(Object.values(prev).flat());
      const newApps = initial.filter((a) => !allCurrentIds.has(a.id));
      if (newApps.length === 0) return prev;

      const next = { ...prev };
      for (const app of newApps) {
        if (!next[app.status]) next[app.status] = [];
        next[app.status] = app.id
          ? [app.id, ...(next[app.status] || [])]
          : [...(next[app.status] || [])];
      }
      return next;
    });
  }, [initial]);

  const snapshot = useRef<Record<string, string[]> | null>(null);
  const [, startTransition] = useTransition();

  return (
    <DragDropProvider
      onDragStart={() => {
        snapshot.current = columnItems;
      }}
      onDragOver={(event) => {
        const { source } = event.operation;
        if (source?.type === 'column') return;
        setColumnItems((items) => move(items, event));
      }}
      onDragEnd={(event) => {
        const { operation } = event;

        if (operation.canceled) {
          if (snapshot.current) setColumnItems(snapshot.current);
          snapshot.current = null;
          return;
        }

        const sourceId = operation.source?.id as string;
        if (!sourceId) {
          snapshot.current = null;
          return;
        }

        const newStatus = Object.entries(columnItems).find(([, ids]) =>
          ids.includes(sourceId),
        )?.[0] as ApplicationStatus | undefined;

        const app = applicationsById.get(sourceId);
        if (!app || !newStatus || app.status === newStatus) {
          snapshot.current = null;
          return;
        }

        const savedSnapshot = snapshot.current;
        snapshot.current = null;

        startTransition(async () => {
          const result = await updateApplicationStatusAction({
            id: sourceId,
            status: newStatus,
          });

          if (!result.success) {
            if (savedSnapshot) setColumnItems(savedSnapshot);
            toast.error('Failed to update status. Please try again.');
          }
        });
      }}
    >
      <div className="flex gap-4 h-full overflow-x-auto px-4 py-4">
        {COLUMNS.map((col, colIndex) => (
          <KanbanColumn
            key={col.status}
            id={col.status}
            index={colIndex}
            config={col}
            count={columnItems[col.status]?.length || 0}
          >
            {columnItems[col.status]?.map((id, index) => {
              const app = applicationsById.get(id);
              if (!app) return null;
              return (
                <KanbanCard
                  key={id}
                  application={app}
                  index={index}
                  column={col.status}
                />
              );
            })}
          </KanbanColumn>
        ))}
      </div>

      <DragOverlay>
        {(source) => {
          const app = (source.data as { application: Application }).application;
          return <KanbanCard application={app} index={0} column="" overlay />;
        }}
      </DragOverlay>
    </DragDropProvider>
  );
}
