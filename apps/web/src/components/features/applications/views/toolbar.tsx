'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { useDebounce } from '@repo/ui/hooks/use-debounce';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  RiSearchLine,
  RiArrowUpDownLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiFilterLine,
  RiLayoutMasonryLine,
  RiTableLine,
} from '@remixicon/react';

import { ApplicationStatus } from '@repo/db/types/application/status';
import { Button } from '@repo/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@repo/ui/components/dropdown-menu';
import type { ApplicationSortBy } from '@repo/db/query/application';
import { APPLICATION_STATUS_OPTIONS } from '../constants/status';
import { Field } from '@repo/ui/components/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@repo/ui/components/input-group';
import { ButtonGroup } from '@repo/ui/components/button-group';
import { ToggleGroup, ToggleGroupItem } from '@repo/ui/components/toggle-group';

const SORT_OPTIONS: { value: ApplicationSortBy; label: string }[] = [
  { value: 'created_at', label: 'Date added' },
  { value: 'updated_at', label: 'Last updated' },
  { value: 'company', label: 'Company' },
  { value: 'position', label: 'Position' },
  { value: 'salaryMin', label: 'Minimum Salary' },
  { value: 'salaryMax', label: 'Maximum Salary' },
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
  const currentView =
    (searchParams.get('view') as 'kanban' | 'table') ?? 'kanban';

  const hiddenParam = searchParams.get('hidden') ?? '';
  const hiddenStatuses = new Set(
    hiddenParam ? (hiddenParam.split(',') as ApplicationStatus[]) : [],
  );

  const [inputValue, setInputValue] = useState(currentSearch);
  const debouncedSearch = useDebounce(inputValue, 300);

  useEffect(() => {
    setInputValue(currentSearch);
  }, [currentSearch]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) params.set('search', debouncedSearch);
    else params.delete('search');
    router.push(`${pathname}?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

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

  const SortOrderIcon =
    currentSortOrder === 'asc' ? RiArrowUpLine : RiArrowDownLine;
  const sortLabel = SORT_OPTIONS.find((o) => o.value === currentSortBy)?.label;

  return (
    <div className="flex items-center justify-between gap-4 p-4 shrink-0">
      <div className="flex items-center gap-2">
        {/* Search */}
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

        {/* Sort */}
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

        {/* Status filter */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" className="font-normal">
                <RiFilterLine />
                Status
                {hiddenStatuses.size > 0 && (
                  <span className="ml-0.5 rounded-full bg-primary text-primary-foreground size-4 text-[10px] flex items-center justify-center">
                    {hiddenStatuses.size}
                  </span>
                )}
              </Button>
            }
          />
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {APPLICATION_STATUS_OPTIONS.map((s) => (
                <DropdownMenuCheckboxItem
                  key={s.status}
                  checked={!hiddenStatuses.has(s.status)}
                  onCheckedChange={() => toggleStatus(s.status)}
                  onSelect={(e) => e.preventDefault()}
                >
                  <span
                    className={`size-2 rounded-full inline-block mr-1.5 ${s.dotClass}`}
                  />
                  {s.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* View toggle */}
        <ToggleGroup
          value={[currentView]}
          onValueChange={([value]) => setParam('view', value || 'kanban')}
          variant="outline"
          size="default"
        >
          <ToggleGroupItem value="kanban" aria-label="Kanban view">
            <RiLayoutMasonryLine data-icon="inline-start" />
            Kanban
          </ToggleGroupItem>
          <ToggleGroupItem value="table" aria-label="Table view">
            <RiTableLine data-icon="inline-start" />
            Table
          </ToggleGroupItem>
        </ToggleGroup>

        <p className="text-sm text-muted-foreground pl-1 w-60">
          {total} application{total !== 1 ? 's' : ''}
        </p>
      </div>

      {actions}
    </div>
  );
}
