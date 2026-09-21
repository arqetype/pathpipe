'use client';

import React from 'react';
import { toast } from 'sonner';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { Textarea } from '@repo/ui/components/textarea';
import { RiUploadLine, RiMagicLine } from '@remixicon/react';
import type { JobPreferenceResponse } from '@repo/db/query/job-preference';
import {
  applyResumeToProfileAction,
  uploadResumeAction,
} from '@/actions/job-preference';

const ACCEPT = '.pdf,.docx,.txt,.md';

interface ResumeFieldProps {
  value: string;
  onChange: (next: string) => void;
  keywords: string[];
  onUploaded: (preference: JobPreferenceResponse) => void;
  onFilled: (preference: JobPreferenceResponse) => void;
  hasSavedResume: boolean;
}

// Uploading saves server-side immediately.
export function ResumeField({
  value,
  onChange,
  keywords,
  onUploaded,
  onFilled,
  hasSavedResume,
}: ResumeFieldProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [filling, setFilling] = React.useState(false);

  const fill = async () => {
    setFilling(true);
    try {
      const { preference, filled, skipped } =
        await applyResumeToProfileAction();
      onFilled(preference);
      if (filled.length) {
        toast.success(`Filled from your CV: ${filled.join(', ')}`, {
          description: skipped.length
            ? `Left as you set them: ${skipped.join(', ')}`
            : undefined,
        });
      } else {
        toast.info(
          skipped.length
            ? `Your profile already answers everything the CV could: ${skipped.join(', ')}`
            : 'Nothing could be read from this CV — check the text below',
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not read your CV',
      );
    } finally {
      setFilling(false);
    }
  };

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const preference = await uploadResumeAction(formData);
      onChange(preference.resumeText ?? '');
      onUploaded(preference);
      toast.success('CV read — check the text below before you rely on it');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not read that file',
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <RiUploadLine className="size-4" />
          {uploading ? 'Reading…' : 'Upload a CV'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={filling || !hasSavedResume}
          onClick={() => void fill()}
          title={
            hasSavedResume
              ? undefined
              : 'Save a CV first — upload a file, or paste the text and save'
          }
        >
          <RiMagicLine className="size-4" />
          {filling ? 'Reading…' : 'Fill my profile from this CV'}
        </Button>
        <span className="text-xs text-muted-foreground">
          PDF, Word (.docx) or text — a LinkedIn profile works too, via its own
          More → Save to PDF. The file is read for its text and never stored.
        </span>
      </div>

      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="…or paste your CV here"
        className="min-h-40 font-mono text-xs"
      />

      {keywords.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">
            Read from your CV — save again after editing the text to update:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {keywords.map((skill) => (
              <Badge key={skill} variant="secondary" className="font-normal">
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
