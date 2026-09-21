'use client';

import { useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { RiDownloadLine, RiMoreLine, RiUpload2Line } from '@remixicon/react';
import { Button } from '@repo/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import type { CompaniesQuery } from '@repo/db/query/company';
import { importCsvAction } from '@/actions/company/import-csv';
import { exportCsvAction } from '@/actions/company/export-csv';

export function CompaniesImportExport({ query }: { query: CompaniesQuery }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    startTransition(async () => {
      const result = await importCsvAction(formData);

      if (result.success) {
        const { successCount, errorCount } = result.data!;
        toast.success(
          `Import complete: ${successCount} imported, ${errorCount} errors`,
        );
        router.refresh();
      } else {
        toast.error(result.error || 'Import failed');
      }
    });

    e.target.value = '';
  }

  async function handleExport() {
    startTransition(async () => {
      const result = await exportCsvAction(query);

      if (result.success) {
        const blob = new Blob([result.data!.data], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `companies-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Export downloaded');
      } else {
        toast.error(result.error || 'Export failed');
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" aria-label="More Options">
            <RiMoreLine className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
          aria-hidden="true"
        />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleImportClick} disabled={isPending}>
            <RiUpload2Line className="mr-2 size-3.5" />
            Import
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExport} disabled={isPending}>
            <RiDownloadLine className="mr-2 size-3.5" />
            Export
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
