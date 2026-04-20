'use client';

import { PlusIcon } from 'lucide-react';
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
import { CandidateStage } from '@repo/db/types/candidate/stage';

export function CreateApplicationDialog() {
  const { isCreateDialogOpen, closeCreateDialog, openCreateDialog, stage } =
    useApplicationStore();

  return (
    <Dialog
      open={isCreateDialogOpen}
      onOpenChange={(open) => (open ? undefined : closeCreateDialog())}
    >
      <DialogTrigger asChild>
        <Button
          size="sm"
          onClick={() => openCreateDialog(CandidateStage.APPLIED)}
        >
          <PlusIcon className="size-4" />
          New candidate
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New candidate</DialogTitle>
        </DialogHeader>

        <CreateApplicationForm stage={stage || undefined} />
      </DialogContent>
    </Dialog>
  );
}
