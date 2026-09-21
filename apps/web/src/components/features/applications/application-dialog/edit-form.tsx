'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '@repo/ui/components/button';
import { DialogFooter } from '@repo/ui/components/dialog';
import { Separator } from '@repo/ui/components/separator';
import { RiDeleteBinLine, RiLoader5Line } from '@remixicon/react';
import { toast } from 'sonner';
import type { Application } from '@repo/db/entities/application';
import { updateApplicationAction } from '@/actions/application/update';
import { deleteApplicationAction } from '@/actions/application/delete';
import EditableTextarea from '@repo/ui/components/editable-inputs/editable-textarea';
import { useApplicationStore } from '../store';
import { ContactFields } from './contact-fields';
import { DocumentFields } from './document-fields';
import { EditHeader } from './edit-header';
import type { FormValues } from './form-values';
import { OfferFields } from './offer-fields';
import { TrackingFields } from './tracking-fields';

type EditApplicationFormProps = {
  application: Application;
  onClose: () => void;
};

export function EditApplicationForm({
  application,
  onClose,
}: EditApplicationFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { removeApplication } = useApplicationStore();

  const { handleSubmit, control } = useForm<FormValues>({
    defaultValues: {
      position: application.position ?? '',
      companyName: application.company?.name ?? '',
      status: application.status,
      tier: application.tier,
      appliedAt: application.appliedAt
        ? new Date(application.appliedAt).toISOString().split('T')[0]
        : '',
      url: application.url ?? '',
      city: application.city ?? '',
      country: application.country ?? '',
      salaryMin: application.salaryMin?.toString() ?? '',
      salaryMax: application.salaryMax?.toString() ?? '',
      contactName: application.contactName ?? '',
      contactEmail: application.contactEmail ?? '',
      notes: application.notes ?? '',
      resumeFileId: application.resumeFile?.id ?? null,
      coverLetterFileId: application.coverLetterFile?.id ?? null,
    },
  });

  function onSubmit(data: FormValues) {
    startTransition(async () => {
      const result = await updateApplicationAction({
        id: application.id,
        position: data.position || undefined,
        companyName: data.companyName || undefined,
        status: data.status,
        tier: data.tier,
        appliedAt: data.appliedAt
          ? (new Date(data.appliedAt) as unknown as Date)
          : undefined,
        url: data.url || undefined,
        // Null clears, undefined skips.
        city: data.city || null,
        country: data.country || null,
        salaryMin: data.salaryMin ? Number(data.salaryMin) : undefined,
        salaryMax: data.salaryMax ? Number(data.salaryMax) : undefined,
        contactName: data.contactName || undefined,
        contactEmail: data.contactEmail || undefined,
        notes: data.notes || undefined,
        // Null detaches the file.
        resumeFileId: data.resumeFileId,
        coverLetterFileId: data.coverLetterFileId,
      });
      if (!result?.success) {
        toast.error('Failed to save changes.');
      } else {
        onClose();
        router.refresh();
      }
    });
  }

  function handleDelete() {
    onClose();
    removeApplication(application.id);
    startTransition(async () => {
      await deleteApplicationAction({ id: application.id });
      router.refresh();
    });
  }

  return (
    // min-h-0: lets the middle shrink.
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex min-h-0 flex-1 flex-col"
    >
      <EditHeader application={application} control={control} />

      {/* min-h-0: keeps the footer pinned. */}
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Offer Details
        </p>
        <OfferFields control={control} />

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Description
          </p>
          <Controller
            name="notes"
            control={control}
            render={({ field }) => (
              <EditableTextarea
                value={field.value}
                placeholder="Job description, requirements, interview notes…"
                onSave={(v) => field.onChange(v ?? '')}
              />
            )}
          />
        </div>

        <Separator className="my-6" />

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Tracking
          </p>
          <TrackingFields control={control} />
        </div>

        <Separator className="my-6" />

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Documents
          </p>
          <DocumentFields control={control} />
        </div>

        <Separator className="my-6" />

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Contact
          </p>
          <ContactFields control={control} />
        </div>
      </div>

      <DialogFooter className="mt-6 shrink-0 flex-row justify-between border-t pt-4 sm:justify-between">
        <Button
          type="button"
          variant="outline"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleDelete}
          disabled={isPending}
        >
          <RiDeleteBinLine className="size-4 mr-2" />
          Delete
        </Button>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <RiLoader5Line className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}
