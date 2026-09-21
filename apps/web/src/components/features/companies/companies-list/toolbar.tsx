'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from '@repo/ui/hooks/use-debounce';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  RiArrowUpDownLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiFilterLine,
  RiSearchLine,
} from '@remixicon/react';

import { CompanyStatus } from '@repo/db/entities/company';
import { CompanyIndustry } from '@repo/db/types/company/industry';
import { Button } from '@repo/ui/components/button';
import { ButtonGroup } from '@repo/ui/components/button-group';
import { Field } from '@repo/ui/components/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@repo/ui/components/input-group';
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
import type { CompanySortBy, CompaniesQuery } from '@repo/db/query/company';
import { COMPANY_SORT_OPTIONS } from '../constants/sort';
import { COMPANY_INDUSTRY_OPTIONS } from '../constants/industry';
import { CompaniesImportExport } from './toolbar-import-export';
import { CompaniesStatusSelect } from './toolbar-status-select';

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
  const debouncedSearch = useDebounce(inputValue, 300);

  useEffect(() => {
    setInputValue(searchParams?.get('search') ?? '');
  }, [searchParams]);

  useEffect(() => {
    if (!searchParams) return;
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) params.set('search', debouncedSearch);
    else params.delete('search');
    router.push(`${pathname}?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

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

  const currentQuery = {
    search: searchParams.get('search') ?? undefined,
    sortBy: currentSortBy,
    sortOrder: currentSortOrder,
    industry: industryParam || undefined,
    status: statusParam || undefined,
  } as CompaniesQuery;

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
  const sortLabel = COMPANY_SORT_OPTIONS.find(
    (o) => o.value === currentSortBy,
  )?.label;

  return (
    <div className="flex items-center justify-between gap-4 shrink-0">
      <div className="flex items-center gap-2">
        <Field className="max-w-sm">
          <InputGroup>
            <InputGroupInput
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Search..."
            />
            <InputGroupAddon align="inline-start">
              <RiSearchLine className="text-muted-foreground" />
            </InputGroupAddon>
          </InputGroup>
        </Field>

        <ButtonGroup>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" className="font-normal">
                  <RiArrowUpDownLine />
                  {sortLabel}
                </Button>
              }
            />
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={currentSortBy}
                  onValueChange={(v) => setParam('sortBy', v)}
                >
                  {COMPANY_SORT_OPTIONS.map((opt) => (
                    <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            className="font-normal"
            onClick={toggleSortOrder}
            title={currentSortOrder === 'asc' ? 'Ascending' : 'Descending'}
          >
            <SortOrderIcon />
          </Button>
        </ButtonGroup>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" className="font-normal">
                <RiFilterLine />
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
            className="max-h-64 overflow-y-auto w-44"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel>Filter by industry</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {COMPANY_INDUSTRY_OPTIONS.map((s) => (
                <DropdownMenuCheckboxItem
                  key={s.value}
                  checked={selectedIndustries.has(s.value)}
                  onCheckedChange={() => toggleIndustry(s.value)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {s.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <p className="text-muted-foreground w-60 pl-1">
          {total} compan{total !== 1 ? 'ies' : 'y'}
        </p>
      </div>

      <ButtonGroup>
        <CompaniesStatusSelect
          value={activeTab}
          counts={tabCounts}
          onValueChange={(value) => {
            const params = new URLSearchParams(searchParams?.toString() ?? '');
            params.set('status', value);
            params.set('page', '1');
            router.push(`${pathname}?${params.toString()}`);
          }}
        />

        <CompaniesImportExport query={currentQuery} />
      </ButtonGroup>
    </div>
  );
}
