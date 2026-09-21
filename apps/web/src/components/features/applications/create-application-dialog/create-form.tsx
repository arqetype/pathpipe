'use client';

import { useEffect, useState } from 'react';
import { useTransition } from 'react';
import { RiLoader5Line } from '@remixicon/react';
import { Button } from '@repo/ui/components/button';
import { useForm } from 'react-hook-form';
import { CreateApplicationDto } from '@repo/db/dto/application/create-application.dto';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { createApplicationAction } from '@/actions/application/create';
import { toast } from 'sonner';
import { useApplicationStore } from '../store';
import { ApplicationStatus } from '@repo/db/types/application/status';
import { ApplicationTier } from '@repo/db/types/application/tier';
import { DialogFooter } from '@repo/ui/components/dialog';
import { CreateFields } from './create-fields';

type CreateApplicationFormProps = {
  status?: ApplicationStatus;
};

export function CreateApplicationForm({ status }: CreateApplicationFormProps) {
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const { closeCreateDialog } = useApplicationStore();

  const form = useForm<CreateApplicationDto>({
    resolver: classValidatorResolver(CreateApplicationDto),
    defaultValues: {
      company: '',
      position: '',
      status: (status as ApplicationStatus) || ApplicationStatus.WISHLIST,
      tier: ApplicationTier.NONE,
      url: '',
      city: '',
      country: '',
      salaryMin: undefined,
      salaryMax: undefined,
      appliedAt: '',
    },
  });

  useEffect(() => {
    if (status) {
      form.setValue('status', status);
    }
  }, [form, status]);

  const handleSubmit = (data: CreateApplicationDto) => {
    startTransition(async () => {
      const result = await createApplicationAction({
        ...data,
        url: data.url || undefined,
        city: data.city || undefined,
        // Empty string fails DTO validation.
        country: data.country || undefined,
        appliedAt: data.appliedAt || undefined,
      });

      if (result.success) {
        toast.success('Application created successfully.');
        form.reset();
        setStatusMessage(null);
        closeCreateDialog();
      } else {
        setStatusMessage(result.message || 'Failed to create application.');
      }
    });
  };

  return (
    <>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {statusMessage && (
          <div className="text-sm text-destructive">{statusMessage}</div>
        )}
        <CreateFields control={form.control} />
        <DialogFooter>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <RiLoader5Line className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              'Add Application'
            )}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
