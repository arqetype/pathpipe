'use client';

import { useState, useTransition, useEffect } from 'react';
import type { Application } from '@repo/db/entities/application';
import { Dialog, DialogContent, DialogTitle } from '@repo/ui/components/dialog';
import { Separator } from '@repo/ui/components/separator';
import { updateApplicationAction } from '@/actions/application/update';
import { toast } from 'sonner';
import { ApplicationDialogHeader } from './header';
import { ApplicationDialogProperties } from './properties';
import { ApplicationDialogNotes } from './notes';

type ApplicationDialogProps = {
  application: Application | null;
  onClose: () => void;
};

export function ApplicationDialog({
  application,
  onClose,
}: ApplicationDialogProps) {
  const [app, setApp] = useState<Application | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (application) setApp(application);
  }, [application]);

  function save(data: Partial<Application>) {
    if (!app) return;
    const prev = app;
    setApp({ ...app, ...data });
    startTransition(async () => {
      const result = await updateApplicationAction({ id: app.id, ...data });
      if (!result.success) {
        setApp(prev);
        toast.error('Failed to save changes.');
      }
    });
  }

  return (
    <Dialog open={!!application} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="sm:max-w-2xl p-0 gap-0 max-h-[90vh] overflow-y-auto"
      >
        <DialogTitle className="sr-only">
          {app?.position ?? 'Application details'}
        </DialogTitle>
        {app && (
          <>
            <ApplicationDialogHeader app={app} onSave={save} />
            <Separator />
            <ApplicationDialogProperties app={app} onSave={save} />
            <Separator />
            <ApplicationDialogNotes app={app} onSave={save} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
