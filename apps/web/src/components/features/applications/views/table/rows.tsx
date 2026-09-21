'use client';

import { flexRender, type Table as TableInstance } from '@tanstack/react-table';
import type { Application } from '@repo/db/entities/application';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/components/table';
import { APPLICATION_COLUMNS } from './columns';

type ApplicationRowsProps = {
  table: TableInstance<Application>;
  onRowClick: (id: string) => void;
};

export function ApplicationRows({ table, onRowClick }: ApplicationRowsProps) {
  return (
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
              onClick={() => onRowClick(row.original.id)}
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
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell
              colSpan={APPLICATION_COLUMNS.length}
              className="h-24 text-center text-muted-foreground"
            >
              No applications found.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
