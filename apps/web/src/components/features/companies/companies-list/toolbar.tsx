'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { useDebounce } from '@repo/ui/hooks/use-debounce';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  RiCloseLine,
  RiArrowUpDownLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiFilterLine,
  RiUpload2Line,
  RiDownloadLine,
  RiMoreLine,
  RiTimeLine,
  RiCheckLine,
  RiSearchLine,
} from '@remixicon/react';
import { toast } from 'sonner';
import { importCsvAction } from '@/actions/company/import-csv';
import { exportCsvAction } from '@/actions/company/export-csv';

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
  DropdownMenuItem,
} from '@repo/ui/components/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select';
import type { CompanySortBy, CompaniesQuery } from '@repo/db/query/company';

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
  { value: CompanyStatus.PENDING, label: 'Pending', icon: RiTimeLine },
  { value: CompanyStatus.APPROVED, label: 'Accepted', icon: RiCheckLine },
  { value: CompanyStatus.REJECTED, label: 'Rejected', icon: RiCloseLine },
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
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  function getCurrentQuery() {
    return {
      search: searchParams.get('search') ?? undefined,
      sortBy: currentSortBy,
      sortOrder: currentSortOrder,
      industry: industryParam || undefined,
      status: statusParam || undefined,
    } as CompaniesQuery;
  }

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
    const query = getCurrentQuery();

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
                  {SORT_OPTIONS.map((opt) => (
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
              {INDUSTRY_OPTIONS.map((s) => (
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
        <Select
          value={activeTab}
          onValueChange={(value) => {
            const params = new URLSearchParams(searchParams?.toString() ?? '');
            params.set('status', value as string);
            params.set('page', '1');
            router.push(`${pathname}?${params.toString()}`);
          }}
        >
          <SelectTrigger>
            <SelectValue
              className="flex items-center gap-1"
              render={() => {
                const activeTabData = STATUS_TABS.find(
                  (tab) => tab.value === activeTab,
                );
                const Icon = activeTabData?.icon;
                return (
                  <>
                    {Icon && <Icon />}
                    {activeTabData?.label || 'Status'}
                  </>
                );
              }}
            />
          </SelectTrigger>
          <SelectContent className="w-40">
            <SelectGroup>
              {STATUS_TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <SelectItem
                    key={tab.value}
                    value={tab.value}
                    className="flex items-center gap-1"
                  >
                    <div className="flex items-center gap-1">
                      <Icon />
                      {tab.label}
                      <span className="ml-auto text-muted-foreground">
                        ({tabCounts[tab.value]})
                      </span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectGroup>
          </SelectContent>
        </Select>

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
              <DropdownMenuItem
                onClick={handleImportClick}
                disabled={isPending}
              >
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
      </ButtonGroup>
    </div>
  );
}
