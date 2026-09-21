import type { Application } from '@repo/db/entities/application';
import type { ApplicationStatus } from '@repo/db/types/application/status';
import { APPLICATION_STATUS_OPTIONS } from '../../constants/status';

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

export function buildColumnItems(
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

// Keeps local order across refetches.
export function mergeColumnItems(
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

export function buildOrderUpdatesForStatus(
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

export function moveToColumnByTier(
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
