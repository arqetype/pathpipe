'use client';

import { useEffect, useMemo, useRef, useTransition } from 'react';
import type { Application } from '@repo/db/entities/application';
import { Dialog, DialogContent, DialogTitle } from '@repo/ui/components/dialog';
import { Separator } from '@repo/ui/components/separator';
import { updateApplicationAction } from '@/actions/application/update';
import { toast } from 'sonner';
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
  const { selectApplication, patchApplication } = useApplicationStore();
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

  return (
    <Dialog
      open={!!selectedApplicationId}
      onOpenChange={(open) => !open && selectApplication(null)}
    >
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="sm:max-w-2xl p-0 gap-0 max-h-[90vh] overflow-y-auto"
      >
        <DialogTitle className="sr-only">
          {displayedApplication?.position ?? 'Application details'}
        </DialogTitle>
        {displayedApplication && (
          <>
            <ApplicationDialogHeader
              application={displayedApplication}
              onSave={save}
            />
            <Separator />
            <ApplicationDialogProperties
              application={displayedApplication}
              onSave={save}
            />
            <Separator />
            <ApplicationDialogNotes
              application={displayedApplication}
              onSave={save}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
