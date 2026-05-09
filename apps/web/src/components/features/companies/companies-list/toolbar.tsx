'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  RiSearchLine,
  RiCloseLine,
  RiArrowUpDownLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiFilterLine,
} from '@remixicon/react';

import { CompanyStatus } from '@repo/db/entities/company';
import { CompanyIndustry } from '@repo/db/types/company/company-industry';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from '@repo/ui/components/dropdown-menu';
import type { CompanySortBy } from '@repo/db/query/company';

const SORT_OPTIONS: { value: CompanySortBy; label: string }[] = [
  { value: 'created_at', label: 'Date added' },
  { value: 'updated_at', label: 'Last updated' },
  { value: 'name', label: 'Name' },
  { value: 'industry', label: 'Industry' },
  { value: 'country', label: 'Country' },
];

const INDUSTRY_OPTIONS = Object.entries(CompanyIndustry).map(
  ([value, label]) => ({
    value: value as CompanyIndustry,
    label,
  }),
);

const STATUS_TABS = [
  { value: CompanyStatus.PENDING, label: 'Pending' },
  { value: CompanyStatus.APPROVED, label: 'Accepted' },
  { value: CompanyStatus.REJECTED, label: 'Rejected' },
] as const;

interface CompaniesToolbarProps {
  total: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
}

export function CompaniesToolbar({
  total,
  pendingCount,
  approvedCount,
  rejectedCount,
}: CompaniesToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    setInputValue(searchParams?.get('search') ?? '');
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!searchParams) return;
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      const current = inputValue;
      if (current) params.set('search', current);
      else params.delete('search');
      router.push(`${pathname}?${params.toString()}`);
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue, pathname, router, searchParams]);

  if (!searchParams) {
    return null;
  }

  const currentSortBy =
    (searchParams.get('sortBy') as CompanySortBy) ?? 'created_at';
  const currentSortOrder =
    (searchParams.get('sortOrder') as 'asc' | 'desc') ?? 'desc';
  const statusParam = searchParams.get('status') as CompanyStatus | undefined;
  const industryParam = searchParams.get('industry') ?? '';

  const selectedIndustries = new Set(
    industryParam ? (industryParam.split(',') as CompanyIndustry[]) : [],
  );

  const tabCounts: Record<CompanyStatus, number> = {
    [CompanyStatus.PENDING]: pendingCount,
    [CompanyStatus.APPROVED]: approvedCount,
    [CompanyStatus.REJECTED]: rejectedCount,
  };

  const activeTab = statusParam || CompanyStatus.PENDING;

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  function toggleIndustry(industry: CompanyIndustry) {
    const next = new Set(selectedIndustries);
    if (next.has(industry)) next.delete(industry);
    else next.add(industry);
    setParam('industry', next.size > 0 ? [...next].join(',') : null);
  }

  function toggleSortOrder() {
    setParam('sortOrder', currentSortOrder === 'asc' ? 'desc' : 'asc');
  }

  const SortOrderIcon =
    currentSortOrder === 'asc' ? RiArrowUpLine : RiArrowDownLine;
  const sortLabel = SORT_OPTIONS.find((o) => o.value === currentSortBy)?.label;

  return (
    <div className="flex items-center justify-between gap-4 shrink-0">
      <div className="flex items-center gap-2">
        <div className="relative">
          <RiSearchLine className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search..."
            className="pl-7 h-8 w-40 text-sm"
          />
          {inputValue && (
            <button
              onClick={() => setInputValue('')}
              className="absolute -translate-y-1/2 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-2 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
            >
              <RiCloseLine />
              <span className="sr-only">Close</span>
            </button>
          )}
        </div>

        <div className="flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs font-normal rounded-r-none border-r-0"
                >
                  <RiArrowUpDownLine className="size-3.5" />
                  {sortLabel}
                </Button>
              }
            />
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs">
                  Sort by
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={currentSortBy}
                  onValueChange={(v) => setParam('sortBy', v)}
                >
                  {SORT_OPTIONS.map((opt) => (
                    <DropdownMenuRadioItem
                      key={opt.value}
                      value={opt.value}
                      className="text-xs"
                    >
                      {opt.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 rounded-l-none text-xs font-normal"
            onClick={toggleSortOrder}
            title={currentSortOrder === 'asc' ? 'Ascending' : 'Descending'}
          >
            <SortOrderIcon className="size-3.5" />
          </Button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs font-normal"
              >
                <RiFilterLine className="size-3.5" />
                Industry
                {selectedIndustries.size > 0 && (
                  <span className="ml-0.5 rounded-full bg-primary text-primary-foreground size-4 text-[10px] flex items-center justify-center">
                    {selectedIndustries.size}
                  </span>
                )}
              </Button>
            }
          />
          <DropdownMenuContent
            align="start"
            className="w-44 max-h-64 overflow-y-auto"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs">
                Filter by industry
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {INDUSTRY_OPTIONS.map((s) => (
                <DropdownMenuCheckboxItem
                  key={s.value}
                  checked={selectedIndustries.has(s.value)}
                  onCheckedChange={() => toggleIndustry(s.value)}
                  onSelect={(e) => e.preventDefault()}
                  className="text-xs"
                >
                  {s.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <p className="text-sm text-muted-foreground pl-1">
          {total} compan{total !== 1 ? 'ies' : 'y'}
        </p>
      </div>

      <div className="flex items-center gap-1">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.value}
            variant={activeTab === tab.value ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 text-xs font-normal rounded-full"
            onClick={() => {
              const params = new URLSearchParams(
                searchParams?.toString() ?? '',
              );
              params.set('status', tab.value);
              params.set('page', '1');
              router.push(`${pathname}?${params.toString()}`);
            }}
          >
            {tab.label}
            <span className="ml-1.5 text-xs text-muted-foreground">
              ({tabCounts[tab.value]})
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}
