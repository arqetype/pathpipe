'use client';

import React from 'react';
import { Checkbox } from '@repo/ui/components/checkbox';
import type { JobPostingFacet } from '@repo/db/query/job-posting';
import { useJobFilters } from '../use-job-filters';

interface FacetGroupProps {
  title: string;
  facets: JobPostingFacet[];
  filterKey: string;
  visible?: number;
  labelOf?: (value: string, fallback: string) => string;
}

export function FacetGroup({
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

  // Selected values stay visible
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
