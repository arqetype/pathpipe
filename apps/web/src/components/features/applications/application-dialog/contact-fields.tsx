'use client';

import { Controller, type Control } from 'react-hook-form';
import { RiExternalLinkLine, RiMailLine, RiUserLine } from '@remixicon/react';
import InlineInput from '@repo/ui/components/inline-inputs/inline-input';
import Property from '@repo/ui/components/customs/property';
import type { FormValues } from './form-values';

export function ContactFields({ control }: { control: Control<FormValues> }) {
  return (
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
  );
}
