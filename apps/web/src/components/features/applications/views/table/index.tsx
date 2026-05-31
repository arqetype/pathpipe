'use client';

import { useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  type ColumnDef,
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
import { RiArrowLeftSLine, RiArrowRightSLine } from '@remixicon/react';

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

const PAGE_SIZE = 20;

export function ApplicationsTable({
  applications,
  hiddenStatuses = new Set(),
}: ApplicationsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const visibleApplications = useMemo(
    () =>
      applications.filter((application) =>
        hiddenStatuses.has(application.status) ? false : true,
      ),
    [applications, hiddenStatuses],
  );

  const columns = useMemo<ColumnDef<Application>[]>(
    () => [
      {
        id: 'position',
        header: 'Position',
        cell: ({ row }) => {
          const application = row.original;
          return (
            <div className="flex items-center gap-3 min-w-0">
              <CompanyLogo
                companyId={application.company?.id}
                cacheKey={
                  application.company?.updated_at
                    ? new Date(application.company.updated_at).getTime()
                    : undefined
                }
                name={application.company?.name ?? 'Unknown'}
                size={32}
                className="size-8 rounded-md shrink-0"
              />
              <div className="min-w-0">
                <p className="font-medium truncate">{application.position}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {application.company?.name ?? 'Unknown'}
                </p>
              </div>
            </div>
          );
        },
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
    initialState: { pagination: { pageSize: PAGE_SIZE } },
  });

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
    <div className="px-4 py-4 space-y-4">
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
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
                    <TableCell key={cell.id}>
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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
                {[10, 20, 30, 40, 50].map((size) => (
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
