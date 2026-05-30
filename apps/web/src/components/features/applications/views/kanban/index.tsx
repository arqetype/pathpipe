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

type KanbanBoardProps = {
  applications: Application[];
  hiddenColumns?: Set<ApplicationStatus>;
};

function sortByTierThenPosition(applications: Application[]): Application[] {
  return [...applications].sort((a, b) => {
    const orderA = a.kanbanOrder ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.kanbanOrder ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;

    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateA - dateB;
  });
}

function buildColumnItems(
  applications: Application[],
): Record<string, string[]> {
  return APPLICATION_STATUS_OPTIONS.reduce(
    (acc, col) => {
      acc[col.status] = sortByTierThenPosition(
        applications.filter((a) => a.status === col.status),
      ).map((a) => a.id);
      return acc;
    },
    {} as Record<string, string[]>,
  );
}

// Merges fresh server data into the current local order.
// Preserves user-positioned order while reconciling deletions, additions, and
// status corrections (e.g. a failed optimistic move).
function mergeColumnItems(
  current: Record<string, string[]>,
  fresh: Application[],
): Record<string, string[]> {
  const freshById = new Map(fresh.map((a) => [a.id, a]));
  const freshByStatus = buildColumnItems(fresh);
  const result: Record<string, string[]> = {};

  for (const { status } of APPLICATION_STATUS_OPTIONS) {
    const kept = (current[status] ?? []).filter((id) => {
      const app = freshById.get(id);
      return app?.status === status;
    });
    const keptSet = new Set(kept);
    const added = (freshByStatus[status] ?? []).filter(
      (id) => !keptSet.has(id),
    );

    result[status] = [...kept, ...added];
  }

  return result;
}

function buildOrderUpdatesForStatus(
  status: ApplicationStatus,
  items: Record<string, string[]>,
): Array<{ id: string; kanbanOrder: number }> {
  const column = items[status] ?? [];

  return column.map((id, index) => ({ id, kanbanOrder: index }));
}

function findStatusByItemId(
  items: Record<string, string[]>,
  id: string,
): ApplicationStatus | undefined {
  for (const { status } of APPLICATION_STATUS_OPTIONS) {
    if (items[status]?.includes(id)) return status;
  }
  return undefined;
}

function moveToColumnByTier(
  items: Record<string, string[]>,
  sourceId: string,
  targetStatus: ApplicationStatus,
): Record<string, string[]> {
  const sourceStatus = findStatusByItemId(items, sourceId);
  if (!sourceStatus) return items;

  const next: Record<string, string[]> = { ...items };
  next[sourceStatus] = (next[sourceStatus] ?? []).filter(
    (id) => id !== sourceId,
  );

  next[targetStatus] = [
    ...(next[targetStatus] ?? []).filter((id) => id !== sourceId),
    sourceId,
  ];

  return next;
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

  const [columnItems, _setColumnItems] = useState<Record<string, string[]>>(
    () => buildColumnItems(initial),
  );
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
