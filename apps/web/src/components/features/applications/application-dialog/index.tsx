'use client';

import { useEffect, useMemo, useRef, useTransition } from 'react';
import type { Application } from '@repo/db/entities/application';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from '@repo/ui/components/dialog';
import { Separator } from '@repo/ui/components/separator';
import { Button } from '@repo/ui/components/button';
import { updateApplicationAction } from '@/actions/application/update';
import { deleteApplicationAction } from '@/actions/application/delete';
import { toast } from 'sonner';
import { RiDeleteBinLine } from '@remixicon/react';
import { ApplicationDialogHeader } from './header';
import { ApplicationDialogProperties } from './properties';
import { ApplicationDialogNotes } from './notes';
import { useApplicationStore } from '../store';

export function ApplicationDialog() {
  const selectedApplicationId = useApplicationStore(
    (state) => state.selectedApplicationId,
  );
  const selectedApplication = useApplicationStore(
    (state) =>
      state.applications.find((a) => a.id === state.selectedApplicationId) ??
      null,
  );
  const { selectApplication, patchApplication, removeApplication } =
    useApplicationStore();
  const [, startTransition] = useTransition();

  const lastApplicationRef = useRef<Application | null>(null);
  useEffect(() => {
    if (selectedApplication) {
      lastApplicationRef.current = selectedApplication;
    }
  }, [selectedApplication]);
  const displayedApplication = useMemo(() => {
    return selectedApplication ?? null;
  }, [selectedApplication]);

  function save(data: Partial<Application>) {
    if (!displayedApplication) return;
    const previous = patchApplication(displayedApplication.id, data);
    startTransition(async () => {
      const result = await updateApplicationAction({
        id: displayedApplication.id,
        ...data,
      });
      if (!result.success) {
        if (previous) patchApplication(displayedApplication.id, previous);
        toast.error('Failed to save changes.');
      }
    });
  }

  function handleDelete() {
    if (!displayedApplication) return;
    selectApplication(null);
    removeApplication(displayedApplication.id);
    deleteApplicationAction({ id: displayedApplication.id });
  }

  return (
    <Dialog
      open={!!selectedApplicationId}
      onOpenChange={(open) => !open && selectApplication(null)}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sr-only">
          {displayedApplication?.position ?? 'Application details'}
        </div>
        {displayedApplication && (
          <>
            <ApplicationDialogHeader
              application={displayedApplication}
              onSave={save}
            />
            <ApplicationDialogProperties
              application={displayedApplication}
              onSave={save}
            />
            <ApplicationDialogNotes
              application={displayedApplication}
              onSave={save}
            />
            <DialogFooter>
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleDelete}
              >
                <RiDeleteBinLine className="size-4 mr-2" />
                Delete
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
