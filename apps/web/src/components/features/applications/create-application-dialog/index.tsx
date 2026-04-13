'use client';

import { useTransition, useState } from 'react';
import { useForm } from 'react-hook-form';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { PlusIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@repo/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/ui/components/dialog';
import { CreateApplicationDto } from '@repo/db/dto/application/create-application.dto';
import { ApplicationStatus } from '@repo/db/types/application/status';
import { ApplicationPriority } from '@repo/db/types/application/priority';
import { createApplicationAction } from '@/actions/application/create';
import { ApplicationForm } from './create-form';

export function CreateApplicationDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<CreateApplicationDto>({
    resolver: classValidatorResolver(CreateApplicationDto),
    defaultValues: {
      company: '',
      position: '',
      status: ApplicationStatus.WISHLIST,
      priority: ApplicationPriority.NONE,
      url: '',
      salaryMin: undefined,
      salaryMax: undefined,
      appliedAt: '',
    },
  });

  function handleOpenChange(next: boolean) {
    if (!next) form.reset();
    setOpen(next);
  }

  function onSubmit(data: CreateApplicationDto) {
    startTransition(async () => {
      const result = await createApplicationAction({
        ...data,
        url: data.url || undefined,
        appliedAt: data.appliedAt || undefined,
      });

      if (!result.success) {
        toast.error(result.message ?? 'Failed to create application.');
        return;
      }

      toast.success('Application added.');
      setOpen(false);
      form.reset();
    });
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

        <ApplicationForm
          form={form}
          isPending={isPending}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
