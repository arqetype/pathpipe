'use client';

import React from 'react';
import { toast } from 'sonner';
import { Button } from '@repo/ui/components/button';
import { RiUploadLine } from '@remixicon/react';
import type { UserFileKind } from '@repo/db/types/user-file/kind';
import type { UserFileSummary } from '@repo/db/query/user-file';
import { uploadDocumentAction } from '@/actions/user-file';

export function UploadDocumentButton({
  kind,
  label,
  onUploaded,
  variant = 'outline',
  size = 'sm',
}: {
  kind: UserFileKind;
  label: string;
  onUploaded?: (file: UserFileSummary) => void;
  variant?: 'outline' | 'secondary' | 'ghost';
  size?: 'sm' | 'default';
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('kind', kind);
      const saved = await uploadDocumentAction(formData);
      onUploaded?.(saved);
      toast.success(`${saved.name} stored`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not store that file',
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        <RiUploadLine className="size-4" />
        {uploading ? 'Storing…' : label}
      </Button>
    </>
  );
}
