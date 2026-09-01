'use client';

import React from 'react';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { Checkbox } from '@repo/ui/components/checkbox';
import { Input } from '@repo/ui/components/input';
import { Label } from '@repo/ui/components/label';
import { Switch } from '@repo/ui/components/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select';
import { cn } from '@repo/ui/lib/utils';
import { RiFilterOffLine } from '@remixicon/react';
import type {
  JobPostingFacet,
  JobPostingFacets,
} from '@repo/db/query/job-posting';
import { JobPostingStatus } from '@repo/db/types/job-posting/status';
import { EmploymentType } from '@repo/db/types/job-posting/employment-type';
import { RemoteType } from '@repo/db/types/job-posting/remote-type';
import {
  EMPLOYMENT_TYPE_LABELS,
  POSTED_WITHIN_OPTIONS,
  REMOTE_TYPE_LABELS,
  STATUS_LABELS,
  countryName,
} from './constants';
import { useJobFilters } from './use-job-filters';
import { ScoreBand } from './score-band';

interface FacetGroupProps {
  title: string;
  facets: JobPostingFacet[];
  filterKey: string;
  /** Values shown before the list collapses behind "Show all". */
  visible?: number;
  labelOf?: (value: string, fallback: string) => string;
}

function FacetGroup({
  title,
  facets,
  filterKey,
  visible = 6,
  labelOf,
}: FacetGroupProps) {
  const { values, toggle } = useJobFilters();
  const [expanded, setExpanded] = React.useState(false);
  const selected = new Set(values(filterKey));

  if (!facets.length) return null;

  // A selected value always stays visible, even if its count dropped it down
  // the list — a filter you cannot see is a filter you cannot remove.
  const ordered = [
    ...facets.filter((facet) => selected.has(facet.value)),
    ...facets.filter((facet) => !selected.has(facet.value)),
  ];
  const shown = expanded ? ordered : ordered.slice(0, visible);

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="flex flex-col gap-1.5">
        {shown.map((facet) => (
          <label
            key={facet.value}
            className="flex items-center gap-2 text-sm cursor-pointer"
          >
            <Checkbox
              checked={selected.has(facet.value)}
              onCheckedChange={() => toggle(filterKey, facet.value)}
            />
            <span className="flex-1 truncate" title={facet.label}>
              {labelOf ? labelOf(facet.value, facet.label) : facet.label}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {facet.count}
            </span>
          </label>
        ))}
      </div>
      {ordered.length > visible && (
        <button
          type="button"
          className="self-start text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? 'Show less' : `Show all ${ordered.length}`}
        </button>
      )}
    </div>
  );
}

interface JobFiltersProps {
  facets: JobPostingFacets;
  /** False when the user has no profile, so the match toggle is not offered. */
  hasProfile: boolean;
  className?: string;
}

export function JobFilters({ facets, hasProfile, className }: JobFiltersProps) {
  const { value, values, set, toggle, clear, activeCount, isPending } =
    useJobFilters();

  const statuses = new Set(values('status'));
  const salaryMin = value('salaryMin');
  const [salaryDraft, setSalaryDraft] = React.useState(salaryMin);
  React.useEffect(() => setSalaryDraft(salaryMin), [salaryMin]);

  return (
    <aside
      className={cn(
        'flex flex-col gap-5',
        isPending && 'opacity-60 transition-opacity',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Filters</h2>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clear}>
            <RiFilterOffLine className="size-4 mr-1" />
            Clear
            <Badge variant="secondary" className="ml-1">
              {activeCount}
            </Badge>
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label
          htmlFor="posted-within"
          className="text-xs uppercase tracking-wide text-muted-foreground"
        >
          Date posted
        </Label>
        <Select
          value={value('postedWithinDays')}
          onValueChange={(next: string | null) =>
            set('postedWithinDays', next || null)
          }
        >
          <SelectTrigger id="posted-within" className="h-9 w-full">
            <SelectValue>
              {POSTED_WITHIN_OPTIONS.find(
                (option) => option.value === value('postedWithinDays'),
              )?.label ?? 'Any time'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {POSTED_WITHIN_OPTIONS.map((option) => (
              <SelectItem key={option.label} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasProfile && <ScoreBand />}

      <FacetGroup
        title="Company"
        facets={facets.companies}
        filterKey="companyId"
      />
      <FacetGroup
        title="Work model"
        facets={facets.remoteTypes}
        filterKey="remoteType"
        visible={3}
        labelOf={(v, fallback) =>
          REMOTE_TYPE_LABELS[v as RemoteType] ?? fallback
        }
      />
      <FacetGroup
        title="Contract"
        facets={facets.employmentTypes}
        filterKey="employmentType"
        visible={4}
        labelOf={(v, fallback) =>
          EMPLOYMENT_TYPE_LABELS[v as EmploymentType] ?? fallback
        }
      />
      <FacetGroup
        title="Country"
        facets={facets.countries}
        filterKey="country"
        visible={5}
        labelOf={(value) => countryName(value)}
      />
      <FacetGroup title="City" facets={facets.cities} filterKey="city" />
      <FacetGroup
        title="Team"
        facets={facets.departments}
        filterKey="department"
      />

      <div className="flex flex-col gap-2">
        <Label
          htmlFor="salary-min"
          className="text-xs uppercase tracking-wide text-muted-foreground"
        >
          Minimum salary
        </Label>
        <Input
          id="salary-min"
          inputMode="numeric"
          placeholder="e.g. 45000"
          value={salaryDraft}
          onChange={(event) =>
            setSalaryDraft(event.target.value.replace(/[^\d]/g, ''))
          }
          onBlur={() => {
            if (salaryDraft !== salaryMin)
              set('salaryMin', salaryDraft || null);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') set('salaryMin', salaryDraft || null);
          }}
          className="h-9"
        />
        <p className="text-[11px] text-muted-foreground">
          Offers that publish no salary are kept.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Status
        </h3>
        <div className="flex flex-col gap-1.5">
          {Object.values(JobPostingStatus).map((status) => (
            <label
              key={status}
              className="flex items-center gap-2 text-sm cursor-pointer"
            >
              <Checkbox
                checked={statuses.has(status)}
                onCheckedChange={() => toggle('status', status)}
              />
              <span>{STATUS_LABELS[status]}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t pt-4">
        {hasProfile && (
          <label className="flex items-center justify-between gap-2 text-sm">
            <span className="flex flex-col">
              Only my matches
              <span className="text-[11px] text-muted-foreground">
                Hide offers that miss a requirement
              </span>
            </span>
            <Switch
              checked={value('onlyMatches') === 'true'}
              onCheckedChange={(checked) =>
                set('onlyMatches', checked ? 'true' : null)
              }
            />
          </label>
        )}
        <label className="flex items-center justify-between gap-2 text-sm">
          <span>Companies I follow</span>
          <Switch
            checked={value('followed') === 'true'}
            onCheckedChange={(checked) =>
              set('followed', checked ? 'true' : null)
            }
          />
        </label>
        <label className="flex items-center justify-between gap-2 text-sm">
          <span>Saved only</span>
          <Switch
            checked={value('saved') === 'true'}
            onCheckedChange={(checked) => set('saved', checked ? 'true' : null)}
          />
        </label>
        <label className="flex items-center justify-between gap-2 text-sm">
          <span>On my board</span>
          <Switch
            checked={value('tracked') === 'true'}
            onCheckedChange={(checked) =>
              set('tracked', checked ? 'true' : null)
            }
          />
        </label>
        <label className="flex items-center justify-between gap-2 text-sm">
          <span className="flex flex-col">
            Show expired
            <span className="text-[11px] text-muted-foreground">
              Offers that are no longer open
            </span>
          </span>
          <Switch
            checked={value('includeClosed') === 'true'}
            onCheckedChange={(checked) =>
              set('includeClosed', checked ? 'true' : null)
            }
          />
        </label>
      </div>
    </aside>
  );
}
