'use client';

import { useState, useTransition, useRef, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { DragDropProvider, DragOverlay } from '@dnd-kit/react';
import type { Application } from '@repo/db/entities/application';
import { ApplicationStatus } from '@repo/db/types/application/status';
import { KanbanColumn } from './column';
import { KanbanCard } from './card';
import { updateApplicationStatusAction } from '@/actions/application/update-status';
import { APPLICATION_STATUS_OPTIONS } from '../../constants/status';
import { toast } from 'sonner';
import { move } from '@dnd-kit/helpers';
import { useApplicationStore } from '../../store';

type KanbanBoardProps = {
  applications: Application[];
  hiddenColumns?: Set<ApplicationStatus>;
};

function buildColumnItems(
  applications: Application[],
): Record<string, string[]> {
  return APPLICATION_STATUS_OPTIONS.reduce(
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
  const { applications, setApplications, patchApplication } =
    useApplicationStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [columnItems, setColumnItems] = useState<Record<string, string[]>>(() =>
    buildColumnItems(initial),
  );

  const applicationsById = useMemo(
    () => new Map(applications.map((a) => [a.id, a])),
    [applications],
  );

  useEffect(() => {
    setApplications(initial);
    setColumnItems(buildColumnItems(initial));
  }, [initial, setApplications]);

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
        const application = applicationsById.get(sourceId);

        const savedSnapshot = snapshot.current;
        snapshot.current = null;

        if (!application || application.status === newStatus) return;

        startTransition(async () => {
          const result = await updateApplicationStatusAction({
            id: sourceId,
            status: newStatus,
          });

          if (result.success) {
            patchApplication(sourceId, { status: newStatus });
          } else {
            if (savedSnapshot) setColumnItems(savedSnapshot);
            toast.error('Failed to update status. Please try again.');
          }
        });
      }}
    >
      <div className="grid grid-flow-col gap-4 h-full min-h-0 px-4 py-4 w-full">
        {APPLICATION_STATUS_OPTIONS.filter(
          (col) => !hiddenColumns.has(col.status),
        ).map((col) => (
          <KanbanColumn
            key={col.status}
            id={col.status}
            config={col}
            count={columnItems[col.status]?.length ?? 0}
          >
            {(columnItems[col.status] ?? []).map((id) => {
              const application = applicationsById.get(id);
              if (!application) return null;
              return (
                <KanbanCard
                  key={id}
                  application={application}
                  onClick={() => {
                    const params = new URLSearchParams(searchParams.toString());
                    params.set('id', id);
                    router.push(`${pathname}?${params.toString()}`);
                  }}
                />
              );
            })}
          </KanbanColumn>
        ))}
      </div>

      <DragOverlay>
        {(source) => {
          const application = (source.data as { application: Application })
            .application;
          return <KanbanCard application={application} overlay />;
        }}
      </DragOverlay>
    </DragDropProvider>
  );
}
