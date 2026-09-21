'use client';

import React from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@repo/ui/components/alert-dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@repo/ui/components/tabs';
import { UserFileKind } from '@repo/db/types/user-file/kind';
import type { UserFileSummary } from '@repo/db/query/user-file';
import {
  deleteDocumentAction,
  renameDocumentAction,
  uploadDocumentAction,
} from '@/actions/user-file';
import { DOCUMENT_KINDS, kindMeta } from './constants';
import { DocumentCard } from './document-card';
import { Dropzone } from './dropzone';

const ALL = 'ALL';

export function DocumentLibrary({
  files: initial,
}: {
  files: UserFileSummary[];
}) {
  const [files, setFiles] = React.useState(initial);
  const [tab, setTab] = React.useState<string>(ALL);
  const [uploading, setUploading] = React.useState(false);
  const [pendingDelete, setPendingDelete] =
    React.useState<UserFileSummary | null>(null);

  const upload = async (picked: File[], kind: UserFileKind) => {
    setUploading(true);
    let stored = 0;
    for (const file of picked) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('kind', kind);
        const saved = await uploadDocumentAction(formData);
        setFiles((current) => [saved, ...current]);
        stored += 1;
      } catch (error) {
        toast.error(
          `${file.name}: ${error instanceof Error ? error.message : 'could not be stored'}`,
        );
      }
    }
    setUploading(false);
    if (stored) {
      toast.success(
        stored === 1
          ? `${picked[0]?.name} stored`
          : `${stored} documents stored`,
      );
    }
  };

  const rename = async (file: UserFileSummary, name: string) => {
    if (name.trim() === file.name) return;
    const previous = files;
    setFiles((current) =>
      current.map((entry) =>
        entry.id === file.id ? { ...entry, name: name.trim() } : entry,
      ),
    );
    try {
      await renameDocumentAction(file.id, name.trim());
    } catch (error) {
      setFiles(previous);
      toast.error(
        error instanceof Error ? error.message : 'Could not rename that file',
      );
    }
  };

  const confirmDelete = async () => {
    const file = pendingDelete;
    if (!file) return;
    setPendingDelete(null);
    const previous = files;
    setFiles((current) => current.filter((entry) => entry.id !== file.id));
    try {
      await deleteDocumentAction(file.id);
      toast.success(`${file.name} deleted`);
    } catch (error) {
      setFiles(previous);
      toast.error(
        error instanceof Error ? error.message : 'Could not delete that file',
      );
    }
  };

  const cardsFor = (list: UserFileSummary[], showKind: boolean) => (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {list.map((file) => (
        <DocumentCard
          key={file.id}
          file={file}
          showKind={showKind}
          onRename={(name) => void rename(file, name)}
          onDelete={() => setPendingDelete(file)}
        />
      ))}
    </div>
  );

  const panel = (kind: UserFileKind | null) => {
    const list = kind ? files.filter((file) => file.kind === kind) : files;

    if (!list.length) {
      return (
        <div className="flex flex-col gap-4">
          <Dropzone kind={kind} onFiles={upload} busy={uploading} />
          <p className="text-center text-sm text-muted-foreground">
            {kind
              ? `No ${kindMeta(kind).singular} stored yet.`
              : 'Nothing stored yet. Your CVs, cover letters, diplomas and certificates all live here.'}
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6">
        {kind === null
          ? DOCUMENT_KINDS.filter((entry) =>
              files.some((file) => file.kind === entry.kind),
            ).map((entry) => (
              <section key={entry.kind} className="flex flex-col gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {entry.label}
                </h2>
                {cardsFor(
                  files.filter((file) => file.kind === entry.kind),
                  false,
                )}
              </section>
            ))
          : cardsFor(list, false)}
        <Dropzone kind={kind} onFiles={upload} busy={uploading} compact />
      </div>
    );
  };

  return (
    <>
      <Tabs value={tab} onValueChange={(value) => setTab(value as string)}>
        <TabsList variant="line" className="max-w-full overflow-x-auto">
          <TabsTrigger value={ALL}>
            All
            <Count value={files.length} />
          </TabsTrigger>
          {DOCUMENT_KINDS.map((entry) => (
            <TabsTrigger key={entry.kind} value={entry.kind}>
              {entry.label}
              <Count
                value={files.filter((file) => file.kind === entry.kind).length}
              />
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={ALL} className="pt-4">
          {panel(null)}
        </TabsContent>
        {DOCUMENT_KINDS.map((entry) => (
          <TabsContent key={entry.kind} value={entry.kind} className="pt-4">
            {panel(entry.kind)}
          </TabsContent>
        ))}
      </Tabs>

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this document?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{pendingDelete?.name}&quot; will be deleted for good. Any
              application it is attached to stays, but stops naming the file it
              was sent with.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} variant="destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Count({ value }: { value: number }) {
  if (!value) return null;
  return (
    <span className="ml-1 rounded bg-muted-foreground/15 px-1.5 text-[11px] tabular-nums">
      {value}
    </span>
  );
}
