'use client';

import { useState, useTransition, useRef, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { DragDropProvider, DragOverlay } from '@dnd-kit/react';
import type { Application } from '@repo/db/entities/application';
import { ApplicationStatus } from '@repo/db/types/application/status';
import { KanbanColumn } from './column';
import { KanbanCard } from './card';
import { updateApplicationStatusAction } from '@/actions/application/update-status';
import { updateApplicationAction } from '@/actions/application/update';
import { APPLICATION_STATUS_OPTIONS } from '../../constants/status';
import { toast } from 'sonner';
import { move } from '@dnd-kit/helpers';
import { useApplicationStore } from '../../store';
import {
  buildColumnItems,
  buildOrderUpdatesForStatus,
  mergeColumnItems,
  moveToColumnByTier,
} from './column-items';

type KanbanBoardProps = {
  applications: Application[];
  hiddenColumns?: Set<ApplicationStatus>;
};

export function KanbanBoard({
  applications: initial,
  hiddenColumns = new Set(),
}: KanbanBoardProps) {
  const { applications, setApplications, patchApplication } =
    useApplicationStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [columnItems, _setColumnItems] = useState<Record<string, string[]>>(
    () => buildColumnItems(initial),
  );
  // Drag end reads the latest items.
  const columnItemsRef = useRef<Record<string, string[]>>(columnItems);
  function setColumnItems(
    updater:
      | Record<string, string[]>
      | ((prev: Record<string, string[]>) => Record<string, string[]>),
  ) {
    _setColumnItems((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      columnItemsRef.current = next;
      return next;
    });
  }

  const applicationsById = useMemo(
    () => new Map(applications.map((a) => [a.id, a])),
    [applications],
  );

  useEffect(() => {
    setApplications(initial);
    setColumnItems((current) => mergeColumnItems(current, initial));
  }, [initial, setApplications]);

  // Snapshot restores a failed move.
  const snapshot = useRef<Record<string, string[]> | null>(null);
  const dragFrameRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function scheduleColumnItemsUpdate(
    updater:
      | Record<string, string[]>
      | ((prev: Record<string, string[]>) => Record<string, string[]>),
  ) {
    if (dragFrameRef.current != null) {
      clearTimeout(dragFrameRef.current);
    }
    dragFrameRef.current = setTimeout(() => {
      dragFrameRef.current = null;
      setColumnItems(updater);
    }, 0);
  }

  const [, startTransition] = useTransition();

  return (
    <DragDropProvider
      onDragStart={() => {
        snapshot.current = columnItems;
      }}
      onDragOver={(event) => {
        const { source, target } = event.operation;
        if (source?.type === 'column') return;

        const sourceId = source?.id as string | undefined;

        if (!sourceId) return;

        if (target?.type === 'column') {
          const targetStatus = target.id as ApplicationStatus;
          scheduleColumnItemsUpdate((items) =>
            moveToColumnByTier(items, sourceId, targetStatus),
          );
          return;
        }

        scheduleColumnItemsUpdate((items) => move(items, event));
      }}
      onDragEnd={(event) => {
        if (dragFrameRef.current != null) clearTimeout(dragFrameRef.current);
        const { operation } = event;

        if (operation.canceled || !operation.target) {
          if (snapshot.current) setColumnItems(snapshot.current);
          snapshot.current = null;
          return;
        }

        const sourceId = operation.source?.id as string;
        const savedSnapshot = snapshot.current;
        snapshot.current = null;

        const items = columnItemsRef.current;
        const nextItems =
          operation.target?.type === 'column'
            ? moveToColumnByTier(
                items,
                sourceId,
                operation.target.id as ApplicationStatus,
              )
            : items;
        setColumnItems(nextItems);

        const newStatus = (Object.keys(nextItems) as ApplicationStatus[]).find(
          (s) => nextItems[s]?.includes(sourceId),
        );
        const application = applicationsById.get(sourceId);

        if (!newStatus || !application) return;

        const statusesToPersist = new Set<ApplicationStatus>([newStatus]);
        if (application.status !== newStatus) {
          statusesToPersist.add(application.status);
        }

        const orderUpdates = Array.from(statusesToPersist).flatMap((status) =>
          buildOrderUpdatesForStatus(status, nextItems),
        );
        const orderChanges = orderUpdates.filter((update) => {
          const currentOrder = applicationsById.get(update.id)?.kanbanOrder;
          return currentOrder !== update.kanbanOrder;
        });

        startTransition(async () => {
          if (application.status !== newStatus) {
            const result = await updateApplicationStatusAction({
              id: sourceId,
              status: newStatus,
            });

            if (result.success) {
              patchApplication(sourceId, { status: newStatus });
            } else {
              if (savedSnapshot) setColumnItems(savedSnapshot);
              toast.error('Failed to update status. Please try again.');
              return;
            }
          }

          if (orderChanges.length === 0) return;

          const orderResults = await Promise.all(
            orderChanges.map((update) =>
              updateApplicationAction({
                id: update.id,
                kanbanOrder: update.kanbanOrder,
              }),
            ),
          );

          const orderFailed = orderResults.some((result) => !result.success);

          if (orderFailed) {
            toast.error('Failed to update order. Please try again.');
            router.refresh();
            return;
          }

          orderChanges.forEach((update) => {
            patchApplication(update.id, { kanbanOrder: update.kanbanOrder });
          });
        });
      }}
    >
      <div className="flex w-max gap-4 h-full min-h-0 px-4 py-4">
        {APPLICATION_STATUS_OPTIONS.filter(
          (col) => !hiddenColumns.has(col.status),
        ).map((col) => (
          <KanbanColumn
            key={col.status}
            id={col.status}
            config={col}
            count={columnItems[col.status]?.length ?? 0}
          >
            {(columnItems[col.status] ?? []).map((id, index) => {
              const application = applicationsById.get(id);
              if (!application) return null;
              return (
                <KanbanCard
                  key={id}
                  index={index}
                  group={col.status}
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
