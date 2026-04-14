'use client';

import { useState } from 'react';
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

export function CreateApplicationDialog() {
  const [open, setOpen] = useState(false);

  function handleOpenChange(next: boolean) {
    setOpen(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon className="size-4" />
          New application
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New application</DialogTitle>
        </DialogHeader>

        <CreateApplicationForm />
      </DialogContent>
    </Dialog>
  );
}
