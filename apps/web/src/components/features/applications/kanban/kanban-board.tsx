'use client';

import { useState, useTransition, useRef, useMemo, useEffect } from 'react';
import { DragDropProvider, DragOverlay } from '@dnd-kit/react';
import type { Application } from '@repo/db/entities/application';
import { ApplicationStatus } from '@repo/db/types/application/status';
import { KanbanColumn } from './kanban-column';
import { KanbanCard } from './kanban-card';
import { updateApplicationStatusAction } from '@/actions/application/update-status';
import { STATUS_CONFIG } from '../status-config';
import { toast } from 'sonner';
import { move } from '@dnd-kit/helpers';

type KanbanBoardProps = {
  applications: Application[];
  hiddenColumns?: Set<ApplicationStatus>;
};

function buildColumnItems(
  applications: Application[],
): Record<string, string[]> {
  return STATUS_CONFIG.reduce(
    (acc, col) => {
      acc[col.status] = applications
        .filter((a) => a.status === col.status)
        .map((a) => a.id);
      return acc;
    },
    {} as Record<string, string[]>,
  );
}

export function KanbanBoard({
  applications: initial,
  hiddenColumns = new Set(),
}: KanbanBoardProps) {
  const [columnItems, setColumnItems] = useState<Record<string, string[]>>(() =>
    buildColumnItems(initial),
  );

  const applicationsById = useMemo(
    () => new Map(initial.map((a) => [a.id, a])),
    [initial],
  );

  useEffect(() => {
    setColumnItems(buildColumnItems(initial));
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

        if (operation.canceled || !operation.target) {
          if (snapshot.current) setColumnItems(snapshot.current);
          snapshot.current = null;
          return;
        }

        const sourceId = operation.source?.id as string;
        const newStatus = operation.target.id as ApplicationStatus;
        const app = applicationsById.get(sourceId);

        const savedSnapshot = snapshot.current;
        snapshot.current = null;

        if (!app || app.status === newStatus) return;

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
        {STATUS_CONFIG.filter((col) => !hiddenColumns.has(col.status)).map(
          (col) => (
            <KanbanColumn
              key={col.status}
              id={col.status}
              config={col}
              count={columnItems[col.status]?.length ?? 0}
            >
              {(columnItems[col.status] ?? []).map((id) => {
                const app = applicationsById.get(id);
                if (!app) return null;
                return <KanbanCard key={id} application={app} />;
              })}
            </KanbanColumn>
          ),
        )}
      </div>

      <DragOverlay>
        {(source) => {
          const app = (source.data as { application: Application }).application;
          return <KanbanCard application={app} overlay />;
        }}
      </DragOverlay>
    </DragDropProvider>
  );
}
