'use client';

import { RiAddLine } from '@remixicon/react';
import { Button } from '@repo/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/ui/components/dialog';
import { CreateApplicationForm } from './create-form';
import { useApplicationStore } from '../store';
import { ApplicationStatus } from '@repo/db/types/application/status';

export function CreateApplicationDialog() {
  const { isCreateDialogOpen, closeCreateDialog, openCreateDialog, status } =
    useApplicationStore();

  return (
    <Dialog
      open={isCreateDialogOpen}
      onOpenChange={(open) => (open ? undefined : closeCreateDialog())}
    >
      <DialogTrigger
        render={
          <Button
            onClick={() => openCreateDialog(ApplicationStatus.WISHLIST)}
          />
        }
      >
        <RiAddLine />
        New application
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New application</DialogTitle>
        </DialogHeader>

        <CreateApplicationForm status={status || undefined} />
      </DialogContent>
    </Dialog>
  );
}
