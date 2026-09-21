'use client';

import React from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select';
import { buttonVariants } from '@repo/ui/components/button';
import { cn } from '@repo/ui/lib/utils';
import { RiExternalLinkLine } from '@remixicon/react';
import type { UserFileKind } from '@repo/db/types/user-file/kind';
import type { UserFileSummary } from '@repo/db/query/user-file';
import { fetchDocumentsAction } from '@/actions/user-file';
import { UploadDocumentButton } from './upload-button';

// Radix rejects empty string value
const NONE = 'NONE';

export function DocumentSelect({
  kind,
  label,
  value,
  onChange,
}: {
  kind: UserFileKind;
  label: string;
  value: string | null;
  onChange: (fileId: string | null) => void;
}) {
  const [files, setFiles] = React.useState<UserFileSummary[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    fetchDocumentsAction(kind)
      .then((result) => {
        if (!cancelled) setFiles(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [kind]);

  const selected = files.find((file) => file.id === value);

  return (
    <div className="flex flex-1 items-center gap-1.5 min-w-0">
      <Select
        value={value ?? NONE}
        onValueChange={(next) => onChange(next === NONE ? null : next)}
      >
        {/* min-w-0: a flex item will not shrink below its content otherwise,
            and a long document name then widens the whole dialog. */}
        <SelectTrigger className="w-full min-w-0 border-0 bg-transparent hover:bg-accent">
          {/* Explicit children: this Select renders the raw value otherwise,
              which is a UUID. The list may still be loading, or the attached
              file since deleted, so neither case may fall through to that. */}
          <SelectValue>
            <span className="truncate">
              {selected?.name ??
                (value
                  ? loading
                    ? 'Loading…'
                    : 'Document no longer stored'
                  : `No ${label}`)}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value={NONE}>No {label}</SelectItem>
            {files.map((file) => (
              <SelectItem key={file.id} value={file.id}>
                {file.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      {value && (
        // A styled anchor, not a Button rendering one: Base UI's button keeps
        // native <button> semantics and warns when asked to be something else.
        <a
          href={`${process.env.NEXT_PUBLIC_API_URL}/files/${value}/download`}
          target="_blank"
          rel="noreferrer"
          title={`Open this ${label}`}
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
        >
          <RiExternalLinkLine className="size-3.5" />
        </a>
      )}

      <UploadDocumentButton
        kind={kind}
        label="Upload"
        variant="ghost"
        onUploaded={(saved) => {
          setFiles((current) => [saved, ...current]);
          onChange(saved.id);
        }}
      />
    </div>
  );
}
