'use client';

import { useState, useEffect, useRef, type ReactNode } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  Search,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
} from 'lucide-react';
import { ApplicationStatus } from '@repo/db/types/application/status';
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
} from '@repo/ui/components/dropdown-menu';
import type { ApplicationSortBy } from '@repo/db/query/application';
import { APPLICATION_STATUS_OPTIONS } from '../constants/status';

const SORT_OPTIONS: { value: ApplicationSortBy; label: string }[] = [
  { value: 'created_at', label: 'Date added' },
  { value: 'appliedAt', label: 'Date applied' },
  { value: 'company', label: 'Company' },
  { value: 'salaryMin', label: 'Salary' },
];

type ViewToolbarProps = {
  total: number;
  actions?: ReactNode;
};

export function ViewToolbar({ total, actions }: ViewToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSearch = searchParams.get('search') ?? '';
  const currentSortBy =
    (searchParams.get('sortBy') as ApplicationSortBy) ?? 'created_at';
  const currentSortOrder =
    (searchParams.get('sortOrder') as 'asc' | 'desc') ?? 'desc';

  const hiddenParam = searchParams.get('hidden') ?? '';
  const hiddenStatuses = new Set(
    hiddenParam ? (hiddenParam.split(',') as ApplicationStatus[]) : [],
  );

  const [inputValue, setInputValue] = useState(currentSearch);
  const inputRef = useRef(currentSearch);

  useEffect(() => {
    setInputValue(currentSearch);
    inputRef.current = currentSearch;
  }, [currentSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const current = inputRef.current;
      if (current) params.set('search', current);
      else params.delete('search');
      router.push(`${pathname}?${params.toString()}`);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue]);

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  function toggleStatus(status: ApplicationStatus) {
    const next = new Set(hiddenStatuses);
    if (next.has(status)) next.delete(status);
    else next.add(status);
    setParam('hidden', next.size > 0 ? [...next].join(',') : null);
  }

  function toggleSortOrder() {
    setParam('sortOrder', currentSortOrder === 'asc' ? 'desc' : 'asc');
  }

  const SortOrderIcon = currentSortOrder === 'asc' ? ArrowUp : ArrowDown;
  const sortLabel = SORT_OPTIONS.find((o) => o.value === currentSortBy)?.label;

  return (
    <div className="flex items-center justify-between gap-4 px-4 pt-4 pb-0 shrink-0">
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search..."
            className="pl-7 h-8 w-40 text-sm"
          />
          {inputValue && (
            <button
              onClick={() => setInputValue('')}
              className="absolute top-1/2 -translate-y-1/2 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-2 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
            >
              <X />
              <span className="sr-only">Close</span>
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs font-normal rounded-r-none border-r-0"
              >
                <ArrowUpDown className="size-3.5" />
                {sortLabel}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-xs">Sort by</DropdownMenuLabel>
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

        {/* Status filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs font-normal"
            >
              <Filter className="size-3.5" />
              Status
              {hiddenStatuses.size > 0 && (
                <span className="ml-0.5 rounded-full bg-primary text-primary-foreground size-4 text-[10px] flex items-center justify-center">
                  {hiddenStatuses.size}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuLabel className="text-xs">
              Filter by status
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {APPLICATION_STATUS_OPTIONS.map((s) => (
              <DropdownMenuCheckboxItem
                key={s.status}
                checked={!hiddenStatuses.has(s.status)}
                onCheckedChange={() => toggleStatus(s.status)}
                onSelect={(e) => e.preventDefault()}
                className="text-xs"
              >
                <span
                  className={`size-2 rounded-full inline-block mr-1.5 ${s.dotClass}`}
                />
                {s.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <p className="text-sm text-muted-foreground pl-1">
          {total} application{total !== 1 ? 's' : ''}
        </p>
      </div>

      {actions}
    </div>
  );
}
