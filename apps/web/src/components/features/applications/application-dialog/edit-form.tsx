'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '@repo/ui/components/button';
import { DialogFooter, DialogTitle } from '@repo/ui/components/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select';
import {
  RiCalendarLine,
  RiDeleteBinLine,
  RiExternalLinkLine,
  RiFileTextLine,
  RiFlagLine,
  RiLinksLine,
  RiListUnordered,
  RiLoader5Line,
  RiMailLine,
  RiMoneyDollarBoxLine,
  RiUserLine,
} from '@remixicon/react';
import { toast } from 'sonner';
import type { Application } from '@repo/db/entities/application';
import { ApplicationStatus } from '@repo/db/types/application/status';
import { ApplicationTier } from '@repo/db/types/application/tier';
import { updateApplicationAction } from '@/actions/application/update';
import { deleteApplicationAction } from '@/actions/application/delete';
import { CompanyLogo } from '@/components/shared/company-logo';
import EditableText from '@repo/ui/components/editable-inputs/editable-text';
import EditableTextarea from '@repo/ui/components/editable-inputs/editable-textarea';
import InlineInput from '@repo/ui/components/inline-inputs/inline-input';
import Property from '@repo/ui/components/customs/property';
import { APPLICATION_STATUS_OPTIONS } from '../constants/status';
import { APPLICATION_TIER_OPTIONS } from '../constants/tier';
import { TierSelectOptions } from '../shared/tier-select-options';
import { useApplicationStore } from '../store';

type FormValues = {
  position: string;
  status: ApplicationStatus;
  tier: ApplicationTier;
  appliedAt: string;
  url: string;
  salaryMin: string;
  salaryMax: string;
  contactName: string;
  contactEmail: string;
  notes: string;
};

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
      status: application.status,
      tier: application.tier,
      appliedAt: application.appliedAt
        ? new Date(application.appliedAt).toISOString().split('T')[0]
        : '',
      url: application.url ?? '',
      salaryMin: application.salaryMin?.toString() ?? '',
      salaryMax: application.salaryMax?.toString() ?? '',
      contactName: application.contactName ?? '',
      contactEmail: application.contactEmail ?? '',
      notes: application.notes ?? '',
    },
  });

  function onSubmit(data: FormValues) {
    startTransition(async () => {
      const result = await updateApplicationAction({
        id: application.id,
        position: data.position || undefined,
        status: data.status,
        tier: data.tier,
        appliedAt: data.appliedAt
          ? (new Date(data.appliedAt) as unknown as Date)
          : undefined,
        url: data.url || undefined,
        salaryMin: data.salaryMin ? Number(data.salaryMin) : undefined,
        salaryMax: data.salaryMax ? Number(data.salaryMax) : undefined,
        contactName: data.contactName || undefined,
        contactEmail: data.contactEmail || undefined,
        notes: data.notes || undefined,
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
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Header */}
      <DialogTitle className="flex items-start gap-5 mb-4">
        <CompanyLogo
          key={application.company?.id ?? application.id}
          companyId={application.company?.id}
          name={application.company?.name ?? 'Unknown'}
          size={80}
          className="size-20 rounded-xl object-contain shrink-0"
        />
        <div className="flex flex-col flex-1 gap-1 min-w-0">
          <Controller
            name="position"
            control={control}
            render={({ field }) => (
              <EditableText
                value={field.value}
                placeholder="Position title"
                onSave={(v) => v && field.onChange(v)}
                className="block text-3xl md:text-3xl font-bold leading-snug"
                inputClassName="text-3xl md:text-3xl font-bold leading-snug"
              />
            )}
          />
          <EditableText
            value={application.company?.name ?? ''}
            placeholder="Company name"
            onSave={() => {}}
            className="block text-lg md:text-lg text-muted-foreground"
            inputClassName="text-lg md:text-lg text-muted-foreground"
          />
        </div>
      </DialogTitle>

      {/* Properties */}
      <div className="flex flex-col gap-1">
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <Property
              icon={<RiListUnordered className="size-4" />}
              label="Status"
            >
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full bg-transparent border-0 hover:bg-accent">
                  <SelectValue placeholder="Status">
                    {
                      APPLICATION_STATUS_OPTIONS.find(
                        (opt) => opt.status === field.value,
                      )?.label
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {APPLICATION_STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.status} value={opt.status}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Property>
          )}
        />

        <Controller
          name="tier"
          control={control}
          render={({ field }) => (
            <Property icon={<RiFlagLine className="size-4" />} label="Tier">
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full bg-transparent border-0 hover:bg-accent">
                  <SelectValue placeholder="Tier">
                    {
                      APPLICATION_TIER_OPTIONS.find(
                        (opt) => opt.value === field.value,
                      )?.label
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <TierSelectOptions />
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Property>
          )}
        />

        <Controller
          name="appliedAt"
          control={control}
          render={({ field }) => (
            <Property
              icon={<RiCalendarLine className="size-4" />}
              label="Applied date"
            >
              <InlineInput
                type="date"
                value={field.value}
                placeholder="Pick a date"
                onSave={(v) => field.onChange(v ?? '')}
              />
            </Property>
          )}
        />

        <Property
          icon={<RiMoneyDollarBoxLine className="size-4" />}
          label="Salary"
        >
          <Controller
            name="salaryMin"
            control={control}
            render={({ field }) => (
              <InlineInput
                type="number"
                value={field.value}
                placeholder="50"
                onSave={(v) => field.onChange(v ?? '')}
              />
            )}
          />
          <span className="px-1 text-sm text-muted-foreground">to</span>
          <Controller
            name="salaryMax"
            control={control}
            render={({ field }) => (
              <InlineInput
                type="number"
                value={field.value}
                placeholder="80"
                onSave={(v) => field.onChange(v ?? '')}
              />
            )}
          />
        </Property>

        <Controller
          name="url"
          control={control}
          render={({ field }) => (
            <Property icon={<RiLinksLine className="size-4" />} label="Job URL">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <InlineInput
                  value={field.value}
                  placeholder="https://…"
                  onSave={(v) => field.onChange(v ?? '')}
                />
                {field.value && (
                  <a
                    href={field.value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RiExternalLinkLine className="size-3.5" />
                  </a>
                )}
              </div>
            </Property>
          )}
        />

        <Controller
          name="contactName"
          control={control}
          render={({ field }) => (
            <Property icon={<RiUserLine className="size-4" />} label="Contact">
              <InlineInput
                value={field.value}
                placeholder="Name"
                onSave={(v) => field.onChange(v ?? '')}
              />
            </Property>
          )}
        />

        <Controller
          name="contactEmail"
          control={control}
          render={({ field }) => (
            <Property icon={<RiMailLine className="size-4" />} label="Email">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <InlineInput
                  type="email"
                  value={field.value}
                  placeholder="email@company.com"
                  onSave={(v) => field.onChange(v ?? '')}
                />
                {field.value && (
                  <a
                    href={`mailto:${field.value}`}
                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RiExternalLinkLine className="size-3.5" />
                  </a>
                )}
              </div>
            </Property>
          )}
        />
      </div>

      {/* Notes */}
      <div className="mt-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-3">
          <RiFileTextLine className="size-4" />
          <span className="text-sm font-medium">Notes</span>
        </div>
        <Controller
          name="notes"
          control={control}
          render={({ field }) => (
            <EditableTextarea
              value={field.value}
              placeholder="Add notes, interview details, context…"
              onSave={(v) => field.onChange(v ?? '')}
            />
          )}
        />
      </div>

      <DialogFooter className="flex-row justify-between sm:justify-between mt-4">
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
