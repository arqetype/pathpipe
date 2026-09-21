'use client';

import { Controller, type Control } from 'react-hook-form';
import { RiFileTextLine, RiQuillPenLine } from '@remixicon/react';
import { UserFileKind } from '@repo/db/types/user-file/kind';
import Property from '@repo/ui/components/customs/property';
import { DocumentSelect } from '@/components/features/documents/document-select';
import type { FormValues } from './form-values';

export function DocumentFields({ control }: { control: Control<FormValues> }) {
  return (
    <div className="flex flex-col gap-1">
      <Controller
        name="resumeFileId"
        control={control}
        render={({ field }) => (
          <Property icon={<RiFileTextLine className="size-4" />} label="CV">
            <DocumentSelect
              kind={UserFileKind.RESUME}
              label="CV"
              value={field.value}
              onChange={field.onChange}
            />
          </Property>
        )}
      />

      <Controller
        name="coverLetterFileId"
        control={control}
        render={({ field }) => (
          <Property
            icon={<RiQuillPenLine className="size-4" />}
            label="Cover letter"
          >
            <DocumentSelect
              kind={UserFileKind.COVER_LETTER}
              label="cover letter"
              value={field.value}
              onChange={field.onChange}
            />
          </Property>
        )}
      />
    </div>
  );
}
