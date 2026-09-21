'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  type RowSelectionState,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type { Application } from '@repo/db/entities/application';
import { ApplicationStatus } from '@repo/db/types/application/status';
import { Button } from '@repo/ui/components/button';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select';
import { useApplicationStore } from '../../store';
import { deleteApplicationAction } from '@/actions/application/delete';
import { toast } from 'sonner';
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiDeleteBinLine,
} from '@remixicon/react';
import { APPLICATION_COLUMNS } from './columns';
import { ApplicationRows } from './rows';

type ApplicationsTableProps = {
  applications: Application[];
  hiddenStatuses?: Set<ApplicationStatus>;
};

const PAGE_SIZE = 50;

export function ApplicationsTable({
  applications,
  hiddenStatuses = new Set(),
}: ApplicationsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { removeApplication, setApplications } = useApplicationStore();
  const storeApplications = useApplicationStore((state) => state.applications);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    setApplications(applications);
  }, [applications, setApplications]);

  const visibleApplications = useMemo(
    () =>
      storeApplications.filter((application) =>
        hiddenStatuses.has(application.status) ? false : true,
      ),
    [storeApplications, hiddenStatuses],
  );

  const table = useReactTable({
    data: visibleApplications,
    columns: APPLICATION_COLUMNS,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row.id,
    onRowSelectionChange: setRowSelection,
    state: { rowSelection },
    initialState: { pagination: { pageSize: PAGE_SIZE } },
  });

  const selectedIds = Object.keys(rowSelection);

  function handleDeleteSelected() {
    const ids = selectedIds;
    ids.forEach((id) => removeApplication(id));
    setRowSelection({});
    setDeleteDialogOpen(false);
    startDeleteTransition(async () => {
      const results = await Promise.all(
        ids.map((id) => deleteApplicationAction({ id })),
      );
      if (results.some((result) => !result?.success)) {
        toast.error('Failed to delete some applications. Please try again.');
      }
      router.refresh();
    });
  }

  const totalRows = visibleApplications.length;
  const pageCount = table.getPageCount();
  const currentPage =
    pageCount === 0 ? 0 : table.getState().pagination.pageIndex + 1;
  const rangeStart =
    totalRows === 0 ? 0 : table.getState().pagination.pageIndex * PAGE_SIZE + 1;
  const rangeEnd =
    totalRows === 0
      ? 0
      : Math.min(
          totalRows,
          (table.getState().pagination.pageIndex + 1) * PAGE_SIZE,
        );

  function openApplication(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('id', id);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-4">
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2">
          <span className="text-sm font-medium">
            {selectedIds.length} selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            disabled={isDeleting}
            onClick={() => setDeleteDialogOpen(true)}
          >
            <RiDeleteBinLine className="size-4" />
            Delete
          </Button>
          <AlertDialog
            open={isDeleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Delete {selectedIds.length} application
                  {selectedIds.length > 1 ? 's' : ''}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={handleDeleteSelected}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-hidden rounded-md border [&>[data-slot=table-container]]:h-full [&>[data-slot=table-container]]:overflow-auto">
        <ApplicationRows table={table} onRowClick={openApplication} />
      </div>

      <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {rangeStart}&ndash;{rangeEnd} of {totalRows}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={String(table.getState().pagination.pageSize)}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={String(PAGE_SIZE)} />
              </SelectTrigger>
              <SelectContent side="top" align="end">
                {[20, 30, 50, 75, 100].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-sm font-medium">
              Page {currentPage} of {pageCount || 1}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                aria-label="Go to previous page"
              >
                <RiArrowLeftSLine />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                aria-label="Go to next page"
              >
                <RiArrowRightSLine />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
