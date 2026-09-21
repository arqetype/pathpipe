'use client';

import { Controller, type Control } from 'react-hook-form';
import { RiCalendarLine, RiFlagLine, RiListUnordered } from '@remixicon/react';
import { ApplicationTier } from '@repo/db/types/application/tier';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectTrigger,
  SelectValue,
  SelectItem,
} from '@repo/ui/components/select';
import InlineInput from '@repo/ui/components/inline-inputs/inline-input';
import Property from '@repo/ui/components/customs/property';
import { cn } from '@repo/ui/lib/utils';
import { APPLICATION_STATUS_OPTIONS } from '../constants/status';
import { TIER_CONFIG } from '../constants/tier';
import { TierSelectOptions } from '../shared/tier-select-options';
import type { FormValues } from './form-values';

export function TrackingFields({ control }: { control: Control<FormValues> }) {
  return (
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
                            className={cn('size-2 rounded-full', opt.dotClass)}
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
          const currentTierConfig = TIER_CONFIG[field.value as ApplicationTier];
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
  );
}
