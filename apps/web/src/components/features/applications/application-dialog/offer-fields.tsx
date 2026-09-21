'use client';

import { Controller, useWatch, type Control } from 'react-hook-form';
import {
  RiExternalLinkLine,
  RiLinksLine,
  RiMapPin2Line,
  RiMoneyDollarBoxLine,
} from '@remixicon/react';
import InlineInput from '@repo/ui/components/inline-inputs/inline-input';
import Property from '@repo/ui/components/customs/property';
import SelectLocation from '@/components/shared/select-location';
import type { FormValues } from './form-values';

function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function OfferFields({ control }: { control: Control<FormValues> }) {
  const url = useWatch({ control, name: 'url' });
  const domain = url ? extractDomain(url) : null;

  return (
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

      <Property icon={<RiMapPin2Line className="size-4" />} label="Location">
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
  );
}
