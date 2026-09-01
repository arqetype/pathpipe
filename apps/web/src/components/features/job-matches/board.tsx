'use client';

import React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@repo/ui/components/button';
import { Badge } from '@repo/ui/components/badge';
import { Input } from '@repo/ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@repo/ui/components/sheet';
import { cn } from '@repo/ui/lib/utils';
import Link from 'next/link';
import {
  RiEqualizerLine,
  RiSearchLine,
  RiSparkling2Line,
} from '@remixicon/react';
import type { JobMatchItem, JobMatchPage } from '@/actions/job-match/fetch';
import { JobFilters } from './filters';
import { JobMatchList } from './list';
import { JobDetail } from './detail';
import { SORT_OPTIONS } from './constants';
import { useJobFilters } from './use-job-filters';

interface JobBoardProps {
  page: JobMatchPage;
  selected: JobMatchItem | null;
}

/**
 * The board: filters, results, and the selected offer side by side.
 *
 * On a narrow screen the three panes become one — picking an offer replaces the
 * list, and the filters move into a sheet — so the same URL renders sensibly
 * everywhere.
 */
export function JobBoard({ page, selected }: JobBoardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { value, set, isPending, activeCount } = useJobFilters();

  const [searchDraft, setSearchDraft] = React.useState(value('search'));
  React.useEffect(() => setSearchDraft(value('search')), [value]);

  const closeDetail = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('job');
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Mirrors the API's default so the control never disagrees with the order on
  // screen: searching sorts by relevance unless the user says otherwise.
  const sortBy =
    value('sortBy') ||
    (value('search') ? 'relevance' : page.hasProfile ? 'match' : 'postedAt');
  const filtered = activeCount > 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <h1 className="text-2xl font-semibold">Job Matches</h1>
            {page.newCount > 0 && <Badge>{page.newCount} new</Badge>}
          </div>
          <span className="text-sm text-muted-foreground">
            {page.total} offer{page.total === 1 ? '' : 's'}
          </span>
        </div>

        {!page.hasProfile && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed p-3 text-sm">
            <span className="flex items-center gap-2">
              <RiSparkling2Line className="size-4 text-primary" />
              Tell us what you are looking for and every offer gets ranked
              against it.
            </span>
            <Link
              href="/app/job-profile"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Set up your job profile
            </Link>
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <RiSearchLine className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') set('search', searchDraft || null);
              }}
              onBlur={() => {
                if (searchDraft !== value('search')) {
                  set('search', searchDraft || null);
                }
              }}
              placeholder="Search title, company, location…"
              className="h-9 pl-8"
            />
          </div>

          <Select
            value={sortBy}
            onValueChange={(next: string | null) =>
              set('sortBy', !next || next === sortBy ? null : next)
            }
          >
            <SelectTrigger className="h-9 w-40 shrink-0">
              <SelectValue>
                {SORT_OPTIONS.find((option) => option.value === sortBy)?.label}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Sheet>
            <SheetTrigger
              render={
                <Button variant="outline" size="sm" className="h-9 lg:hidden" />
              }
            >
              <RiEqualizerLine className="size-4 mr-1" />
              Filters
              {activeCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeCount}
                </Badge>
              )}
            </SheetTrigger>
            <SheetContent side="left" className="w-80 overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <JobFilters
                facets={page.facets}
                hasProfile={page.hasProfile}
                className="p-4 pt-0"
              />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,26rem)_minmax(0,1fr)]">
        <JobFilters
          facets={page.facets}
          hasProfile={page.hasProfile}
          className="hidden overflow-y-auto pr-2 lg:flex"
        />

        <div
          className={cn(
            'min-h-0 overflow-hidden rounded-lg border',
            isPending && 'opacity-60 transition-opacity',
            // On a narrow screen the detail takes the place of the list.
            selected && 'hidden xl:block',
          )}
        >
          <JobMatchList
            jobs={page.data}
            selectedId={selected?.id ?? null}
            total={page.total}
            page={page.page}
            limit={page.limit}
            filtered={filtered}
          />
        </div>

        {selected ? (
          <div className="min-h-0 overflow-hidden rounded-lg border">
            <JobDetail job={selected} onBack={closeDetail} />
          </div>
        ) : (
          <div className="hidden items-center justify-center rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground xl:flex">
            Pick an offer to read it here.
          </div>
        )}
      </div>
    </div>
  );
}
