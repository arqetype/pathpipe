'use client';

import React from 'react';
import { RiAddLine, RiUploadCloud2Line } from '@remixicon/react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select';
import { cn } from '@repo/ui/lib/utils';
import { UserFileKind } from '@repo/db/types/user-file/kind';
import { DOCUMENT_KINDS, kindMeta } from './constants';

// accept is UX; API validates
export function Dropzone({
  kind,
  onFiles,
  busy,
  compact,
}: {
  kind: UserFileKind | null;
  onFiles: (files: File[], kind: UserFileKind) => void;
  busy: boolean;
  compact?: boolean;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [fallbackKind, setFallbackKind] = React.useState(UserFileKind.RESUME);

  const target = kind ?? fallbackKind;
  const label = kind ? kindMeta(kind).article : 'a document';

  const accept = (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (files.length) onFiles(files, target);
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        accept(event.dataTransfer.files);
      }}
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-center transition-colors',
        compact ? 'p-4' : 'p-10',
        dragging
          ? 'border-primary bg-primary/5'
          : 'border-muted-foreground/25 hover:border-muted-foreground/40 hover:bg-accent/30',
        busy && 'pointer-events-none opacity-60',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="hidden"
        onChange={(event) => {
          accept(event.target.files);
          event.target.value = '';
        }}
      />

      {!compact && (
        <RiUploadCloud2Line
          className={cn(
            'size-8',
            dragging ? 'text-primary' : 'text-muted-foreground/60',
          )}
        />
      )}

      <div className="flex flex-wrap items-center justify-center gap-1.5 text-sm">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline"
        >
          {compact && <RiAddLine className="size-4" />}
          {busy ? 'Storing…' : `Add ${label}`}
        </button>
        <span className="text-muted-foreground">or drop a PDF here</span>

        {!kind && (
          <Select
            value={fallbackKind}
            onValueChange={(next) => setFallbackKind(next as UserFileKind)}
          >
            <SelectTrigger size="sm" className="h-7 w-auto gap-1">
              {/* Explicit, for the same reason: the raw value is an enum name. */}
              <SelectValue>{kindMeta(fallbackKind).label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {DOCUMENT_KINDS.map((entry) => (
                  <SelectItem key={entry.kind} value={entry.kind}>
                    {entry.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        )}
      </div>

      {!compact && (
        <p className="text-xs text-muted-foreground">
          PDF only, up to 10 MB each.
        </p>
      )}
    </div>
  );
}
