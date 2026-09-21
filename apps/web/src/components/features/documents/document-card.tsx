'use client';

import { RiDeleteBinLine, RiDownloadLine, RiEyeLine } from '@remixicon/react';
import { Button, buttonVariants } from '@repo/ui/components/button';
import { cn } from '@repo/ui/lib/utils';
import EditableText from '@repo/ui/components/editable-inputs/editable-text';
import type { UserFileSummary } from '@repo/db/query/user-file';
import { formatSize, kindMeta } from './constants';

export function DocumentCard({
  file,
  showKind,
  onRename,
  onDelete,
}: {
  file: UserFileSummary;
  showKind?: boolean;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  return (
    <div className="group relative flex gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-foreground/20 hover:bg-accent/40">
      <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-red-500/10 text-xs font-bold tracking-tight text-red-600 dark:text-red-400">
        PDF
      </div>

      <div className="min-w-0 flex-1">
        <EditableText
          value={file.name}
          placeholder="Name this document"
          onSave={(name) => name && onRename(name)}
          className="h-7 px-1.5 font-medium"
        />
        <p className="truncate px-1.5 text-xs text-muted-foreground">
          {showKind && <>{kindMeta(file.kind).singular} · </>}
          {formatSize(file.byteSize)} ·{' '}
          {new Date(file.created_at).toLocaleDateString()}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 transition-opacity focus-within:opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
        {/* Styled anchors rather than Buttons rendering them: Base UI's button
            keeps native <button> semantics and warns when asked to be a link. */}
        <a
          href={`${process.env.NEXT_PUBLIC_API_URL}/files/${file.id}/download`}
          target="_blank"
          rel="noreferrer"
          title={`Open ${file.name}`}
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
        >
          <RiEyeLine className="size-4" />
        </a>
        <a
          href={`${process.env.NEXT_PUBLIC_API_URL}/files/${file.id}/download?download`}
          title={`Download ${file.name}`}
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
        >
          <RiDownloadLine className="size-4" />
        </a>
        <Button
          variant="ghost"
          size="icon-sm"
          title={`Delete ${file.name}`}
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          onClick={onDelete}
        >
          <RiDeleteBinLine className="size-4" />
        </Button>
      </div>
    </div>
  );
}
