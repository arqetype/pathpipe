'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Button } from '@repo/ui/components/button';
import { DialogFooter, DialogTitle } from '@repo/ui/components/dialog';
import { Separator } from '@repo/ui/components/separator';
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
  RiFlagLine,
  RiLinksLine,
  RiListUnordered,
  RiLoader5Line,
  RiMailLine,
  RiMapPin2Line,
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
import { Badge } from '@repo/ui/components/badge';
import { cn } from '@repo/ui/lib/utils';
import { APPLICATION_STATUS_OPTIONS } from '../constants/status';
import { TIER_CONFIG } from '../constants/tier';
import { TierSelectOptions } from '../shared/tier-select-options';
import { useApplicationStore } from '../store';
import SelectCompany from '@/components/shared/select-company';
import SelectLocation from '@/components/shared/select-location';
import { formatSalary, formatDate } from '@/utils/applications-utils';

type FormValues = {
  position: string;
  companyName: string;
  status: ApplicationStatus;
  tier: ApplicationTier;
  appliedAt: string;
  url: string;
  city: string;
  country: string;
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

function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

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
    },
  });

  const status = useWatch({ control, name: 'status' });
  const tier = useWatch({ control, name: 'tier' });
  const salaryMin = useWatch({ control, name: 'salaryMin' });
  const salaryMax = useWatch({ control, name: 'salaryMax' });
  const appliedAt = useWatch({ control, name: 'appliedAt' });
  const url = useWatch({ control, name: 'url' });

  const statusOpt = APPLICATION_STATUS_OPTIONS.find(
    (opt) => opt.status === status,
  );
  const tierConfig = TIER_CONFIG[tier as ApplicationTier];
  const hasTier = tier !== ApplicationTier.NONE;
  const salaryDisplay = formatSalary(
    salaryMin ? Number(salaryMin) : undefined,
    salaryMax ? Number(salaryMax) : undefined,
  );
  const dateDisplay = formatDate(appliedAt);
  const domain = url ? extractDomain(url) : null;

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
        // Null rather than undefined: clearing a location has to reach the row,
        // and undefined is how the API is told to leave a field alone.
        city: data.city || null,
        country: data.country || null,
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
      {/* ── Header ── */}
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
          <Controller
            name="companyName"
            control={control}
            render={({ field }) => (
              <SelectCompany
                value={field.value}
                onValueChange={field.onChange}
                onSelect={(company) => field.onChange(company.name)}
                placeholder="Company name"
                inputClassName="text-lg !px-2.5 hover:bg-accent border-none bg-transparent h-auto py-1 px-1"
              />
            )}
          />
        </div>
      </DialogTitle>

      <div className="flex flex-wrap items-center gap-2 mb-6 pb-5 border-b">
        {statusOpt && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-xs font-medium">
            <span className={cn('size-2 rounded-full', statusOpt.dotClass)} />
            {statusOpt.label}
          </span>
        )}
        {hasTier && tierConfig && (
          <Badge
            variant="outline"
            className={cn('text-xs', tierConfig.className)}
          >
            {tierConfig.label}
          </Badge>
        )}
        {salaryDisplay && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-xs font-medium">
            <RiMoneyDollarBoxLine className="size-3" />
            {salaryDisplay}
          </span>
        )}
        {dateDisplay && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-xs font-medium">
            <RiCalendarLine className="size-3" />
            {dateDisplay}
          </span>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Offer Details
        </p>
        <div className="flex flex-col gap-1">
          <Controller
            name="url"
            control={control}
            render={({ field }) => (
              <Property icon={<RiLinksLine className="size-4" />} label="URL">
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
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
                        title={field.value}
                      >
                        <RiExternalLinkLine className="size-3.5" />
                      </a>
                    )}
                  </div>
                  {domain && (
                    <span className="text-xs text-muted-foreground truncate">
                      {domain}
                    </span>
                  )}
                </div>
              </Property>
            )}
          />

          <Property
            icon={<RiMapPin2Line className="size-4" />}
            label="Location"
          >
            <Controller
              name="city"
              control={control}
              render={({ field: cityField }) => (
                <Controller
                  name="country"
                  control={control}
                  render={({ field: countryField }) => (
                    <SelectLocation
                      value={{
                        city: cityField.value,
                        country: countryField.value,
                      }}
                      onChange={(next) => {
                        cityField.onChange(next.city);
                        countryField.onChange(next.country);
                      }}
                      inputClassName="h-8"
                    />
                  )}
                />
              )}
            />
          </Property>

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
        </div>
      </div>

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
        <div className="flex flex-col gap-1">
          <Controller
            name="status"
            control={control}
            render={({ field }) => {
              const currentStatus = APPLICATION_STATUS_OPTIONS.find(
                (opt) => opt.status === field.value,
              );
              return (
                <Property
                  icon={<RiListUnordered className="size-4" />}
                  label="Status"
                >
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full bg-transparent border-0 hover:bg-accent">
                      <SelectValue placeholder="Status">
                        <span className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              'size-2 rounded-full',
                              currentStatus?.dotClass,
                            )}
                          />
                          <span>{currentStatus?.label}</span>
                        </span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {APPLICATION_STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.status} value={opt.status}>
                            <span className="flex items-center gap-2">
                              <span
                                className={cn(
                                  'size-2 rounded-full',
                                  opt.dotClass,
                                )}
                              />
                              {opt.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Property>
              );
            }}
          />

          <Controller
            name="tier"
            control={control}
            render={({ field }) => {
              const currentTierConfig =
                TIER_CONFIG[field.value as ApplicationTier];
              return (
                <Property icon={<RiFlagLine className="size-4" />} label="Tier">
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      className={cn(
                        'w-full border-0 hover:bg-accent',
                        field.value === ApplicationTier.NONE
                          ? 'bg-transparent'
                          : currentTierConfig?.className,
                      )}
                    >
                      <SelectValue placeholder="Tier">
                        {currentTierConfig?.label}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <TierSelectOptions />
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Property>
              );
            }}
          />

          <Controller
            name="appliedAt"
            control={control}
            render={({ field }) => (
              <Property
                icon={<RiCalendarLine className="size-4" />}
                label="Applied"
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
        </div>
      </div>

      <Separator className="my-6" />

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Contact
        </p>
        <div className="flex flex-col gap-1">
          <Controller
            name="contactName"
            control={control}
            render={({ field }) => (
              <Property icon={<RiUserLine className="size-4" />} label="Name">
                <InlineInput
                  value={field.value}
                  placeholder="Contact name"
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
      </div>

      <DialogFooter className="flex-row justify-between sm:justify-between mt-6">
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
