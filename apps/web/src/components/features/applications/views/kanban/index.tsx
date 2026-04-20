'use client';

import { useState, useTransition, useRef, useMemo, useEffect } from 'react';
import { DragDropProvider, DragOverlay } from '@dnd-kit/react';
import type { Candidate } from '@repo/db/entities/candidate';
import { CandidateStage } from '@repo/db/types/candidate/stage';
import { KanbanColumn } from './column';
import { KanbanCard } from './card';
import { updateApplicationStatusAction } from '@/actions/application/update-status';
import { CANDIDATE_STAGE_OPTIONS } from '../../constants/status';
import { toast } from 'sonner';
import { move } from '@dnd-kit/helpers';
import { ApplicationDialog } from '../../application-dialog/index';
import { useApplicationStore } from '../../store';

type KanbanBoardProps = {
  applications: Candidate[];
  hiddenColumns?: Set<CandidateStage>;
};

function buildColumnItems(applications: Candidate[]): Record<string, string[]> {
  return CANDIDATE_STAGE_OPTIONS.reduce(
    (acc, col) => {
      acc[col.status] = applications
        .filter((a) => a.stage === col.status)
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
  const { applications, setApplications, patchApplication, selectApplication } =
    useApplicationStore();

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
    <>
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
          const newStage = operation.target.id as CandidateStage;
          const application = applicationsById.get(sourceId);

          const savedSnapshot = snapshot.current;
          snapshot.current = null;

          if (!application || application.stage === newStage) return;

          startTransition(async () => {
            const result = await updateApplicationStatusAction({
              id: sourceId,
              stage: newStage,
            });

            if (result.success) {
              patchApplication(sourceId, { stage: newStage });
            } else {
              if (savedSnapshot) setColumnItems(savedSnapshot);
              toast.error('Failed to update stage. Please try again.');
            }
          });
        }}
      >
        <div className="grid grid-flow-col gap-4 h-full min-h-0 px-4 py-4 w-full">
          {CANDIDATE_STAGE_OPTIONS.filter(
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
                    onClick={() => selectApplication(id)}
                  />
                );
              })}
            </KanbanColumn>
          ))}
        </div>

        <DragOverlay>
          {(source) => {
            const application = (source.data as { application: Candidate })
              .application;
            return <KanbanCard application={application} overlay />;
          }}
        </DragOverlay>
      </DragDropProvider>

      <ApplicationDialog />
    </>
  );
}
