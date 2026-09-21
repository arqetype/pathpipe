'use client';

import { Controller, useWatch, type Control } from 'react-hook-form';
import { RiCalendarLine, RiMoneyDollarBoxLine } from '@remixicon/react';
import type { Application } from '@repo/db/entities/application';
import { ApplicationTier } from '@repo/db/types/application/tier';
import { DialogTitle } from '@repo/ui/components/dialog';
import { Badge } from '@repo/ui/components/badge';
import { cn } from '@repo/ui/lib/utils';
import EditableText from '@repo/ui/components/editable-inputs/editable-text';
import { CompanyLogo } from '@/components/shared/company-logo';
import SelectCompany from '@/components/shared/select-company';
import { formatSalary, formatDate } from '@/utils/applications-utils';
import { APPLICATION_STATUS_OPTIONS } from '../constants/status';
import { TIER_CONFIG } from '../constants/tier';
import type { FormValues } from './form-values';

type EditHeaderProps = {
  application: Application;
  control: Control<FormValues>;
};

export function EditHeader({ application, control }: EditHeaderProps) {
  const status = useWatch({ control, name: 'status' });
  const tier = useWatch({ control, name: 'tier' });
  const salaryMin = useWatch({ control, name: 'salaryMin' });
  const salaryMax = useWatch({ control, name: 'salaryMax' });
  const appliedAt = useWatch({ control, name: 'appliedAt' });

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

  return (
    <>
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
    </>
  );
}
