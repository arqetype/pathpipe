'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { Application } from '@repo/db/entities/application';
import type { ApplicationStatus } from '@repo/db/types/application/status';
import { ApplicationTier } from '@repo/db/types/application/tier';
import { Badge } from '@repo/ui/components/badge';
import { Checkbox } from '@repo/ui/components/checkbox';
import { cn } from '@repo/ui/lib/utils';
import { CompanyLogo } from '@/components/shared/company-logo';
import { formatLocation } from '@/components/shared/select-location';
import { formatDate, formatSalary } from '@/utils/applications-utils';
import { APPLICATION_STATUS_OPTIONS } from '../../constants/status';
import { TIER_CONFIG } from '../../constants/tier';

const STATUS_CONFIG = APPLICATION_STATUS_OPTIONS.reduce(
  (acc, status) => {
    acc[status.status] = status;
    return acc;
  },
  {} as Record<ApplicationStatus, { label: string; dotClass: string }>,
);

export const APPLICATION_COLUMNS: ColumnDef<Application>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() || table.getIsSomePageRowsSelected()
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
    id: 'location',
    header: 'Location',
    cell: ({ row }) => {
      const location = formatLocation({
        city: row.original.city ?? '',
        country: row.original.country ?? '',
      });
      return location ? (
        <span className="text-sm">{location}</span>
      ) : (
        <span className="text-sm text-muted-foreground">&mdash;</span>
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
];
