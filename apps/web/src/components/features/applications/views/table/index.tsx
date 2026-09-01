'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  type ColumnDef,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type { Application } from '@repo/db/entities/application';
import { ApplicationStatus } from '@repo/db/types/application/status';
import { ApplicationTier } from '@repo/db/types/application/tier';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { Checkbox } from '@repo/ui/components/checkbox';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/components/table';
import { cn } from '@repo/ui/lib/utils';
import { CompanyLogo } from '@/components/shared/company-logo';
import { formatDate, formatSalary } from '@/utils/applications-utils';
import { APPLICATION_STATUS_OPTIONS } from '../../constants/status';
import { TIER_CONFIG } from '../../constants/tier';
import { useApplicationStore } from '../../store';
import { deleteApplicationAction } from '@/actions/application/delete';
import { toast } from 'sonner';
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiDeleteBinLine,
} from '@remixicon/react';

type ApplicationsTableProps = {
  applications: Application[];
  hiddenStatuses?: Set<ApplicationStatus>;
};

const STATUS_CONFIG = APPLICATION_STATUS_OPTIONS.reduce(
  (acc, status) => {
    acc[status.status] = status;
    return acc;
  },
  {} as Record<ApplicationStatus, { label: string; dotClass: string }>,
);

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

  const columns = useMemo<ColumnDef<Application>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              table.getIsSomePageRowsSelected()
            }
            onCheckedChange={(checked: boolean) =>
              table.toggleAllPageRowsSelected(checked)
            }
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(checked: boolean) => row.toggleSelected(checked)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: 'company',
        header: 'Company',
        cell: ({ row }) => {
          const application = row.original;
          return (
            <div className="flex items-center gap-2 min-w-0">
              <CompanyLogo
                companyId={application.company?.id}
                cacheKey={
                  application.company?.updated_at
                    ? new Date(application.company.updated_at).getTime()
                    : undefined
                }
                name={application.company?.name ?? 'Unknown'}
                size={20}
                className="size-5 rounded-md shrink-0"
              />
              <span className="text-sm truncate">
                {application.company?.name ?? 'Unknown'}
              </span>
            </div>
          );
        },
      },
      {
        id: 'position',
        header: 'Position',
        cell: ({ row }) => (
          <span className="text-sm font-medium truncate">
            {row.original.position}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = STATUS_CONFIG[row.original.status];
          return (
            <div className="flex items-center gap-2">
              <span
                className={cn('size-2 rounded-full shrink-0', status?.dotClass)}
              />
              <span className="text-sm">{status?.label}</span>
            </div>
          );
        },
      },
      {
        id: 'tier',
        header: 'Tier',
        cell: ({ row }) => {
          const tierConfig = TIER_CONFIG[row.original.tier];
          const hasTier = row.original.tier !== ApplicationTier.NONE;
          return hasTier ? (
            <Badge
              variant="outline"
              className={cn('text-[10px] px-1.5', tierConfig.className)}
            >
              {tierConfig.label}
            </Badge>
          ) : (
            <span className="text-sm text-muted-foreground">&mdash;</span>
          );
        },
      },
      {
        id: 'salary',
        header: 'Salary',
        cell: ({ row }) => {
          const salary = formatSalary(
            row.original.salaryMin,
            row.original.salaryMax,
          );
          return salary ? (
            <span className="text-sm">{salary}</span>
          ) : (
            <span className="text-sm text-muted-foreground">&mdash;</span>
          );
        },
      },
      {
        id: 'applied',
        header: 'Applied',
        cell: ({ row }) => {
          const appliedDate = formatDate(
            row.original.appliedAt ?? row.original.created_at,
          );
          return appliedDate ? (
            <span className="text-sm">{appliedDate}</span>
          ) : (
            <span className="text-sm text-muted-foreground">&mdash;</span>
          );
        },
      },
      {
        id: 'updated',
        header: 'Updated',
        cell: ({ row }) => {
          const updatedDate = formatDate(row.original.updated_at);
          return updatedDate ? (
            <span className="text-sm">{updatedDate}</span>
          ) : (
            <span className="text-sm text-muted-foreground">&mdash;</span>
          );
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: visibleApplications,
    columns,
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
        <Table>
          <TableHeader className="sticky top-0 z-10 [&_th]:bg-background">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-8 py-1.5">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => openApplication(row.original.id)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="py-1"
                      onClick={
                        cell.column.id === 'select'
                          ? (e) => e.stopPropagation()
                          : undefined
                      }
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No applications found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
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
