'use client';

import React from 'react';
import { Button } from '@repo/ui/components/button';
import { cn } from '@repo/ui/lib/utils';
import { useJobFilters } from './use-job-filters';

/** Bands people actually ask for, rather than making them pick two numbers. */
const PRESETS = [
  { label: 'Strong fit', min: '70', max: null },
  { label: 'Worth a look', min: '40', max: '69' },
  { label: 'Long shots', min: null, max: '39' },
];

/**
 * The match band.
 *
 * A band rather than a floor because both ends are real requests: "only show me
 * strong fits" and "I have worked through the strong ones, show me the middle".
 * The numbers stay editable underneath the presets — the presets are for the
 * common case, not a replacement for saying 55 to 80.
 */
export function ScoreBand() {
  const { value, setMany } = useJobFilters();
  const min = value('minScore');
  const max = value('maxScore');

  const [draftMin, setDraftMin] = React.useState(min);
  const [draftMax, setDraftMax] = React.useState(max);
  React.useEffect(() => setDraftMin(min), [min]);
  React.useEffect(() => setDraftMax(max), [max]);

  // Both ends move in one navigation, so they cannot race each other.
  const apply = (nextMin: string | null, nextMax: string | null) =>
    setMany({ minScore: nextMin, maxScore: nextMax });

  const active = (preset: (typeof PRESETS)[number]) =>
    (preset.min ?? '') === min && (preset.max ?? '') === max;

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Match score
      </h3>

      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() =>
              active(preset) ? apply(null, null) : apply(preset.min, preset.max)
            }
            className={cn(
              'rounded-full border px-2.5 py-1 text-xs transition-colors',
              active(preset)
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-input hover:bg-accent',
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={100}
          inputMode="numeric"
          value={draftMin}
          placeholder="0"
          onChange={(event) => setDraftMin(event.target.value)}
          onBlur={() => apply(draftMin || null, draftMax || null)}
          className="h-8 w-16 rounded-md border border-input bg-transparent px-2 text-sm"
          aria-label="Minimum match score"
        />
        <span className="text-xs text-muted-foreground">to</span>
        <input
          type="number"
          min={0}
          max={100}
          inputMode="numeric"
          value={draftMax}
          placeholder="100"
          onChange={(event) => setDraftMax(event.target.value)}
          onBlur={() => apply(draftMin || null, draftMax || null)}
          className="h-8 w-16 rounded-md border border-input bg-transparent px-2 text-sm"
          aria-label="Maximum match score"
        />
        <span className="text-xs text-muted-foreground">%</span>
        {(min || max) && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 px-2 text-xs"
            onClick={() => apply(null, null)}
          >
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}
