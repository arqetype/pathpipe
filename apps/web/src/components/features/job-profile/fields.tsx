'use client';

import React from 'react';
import { Badge } from '@repo/ui/components/badge';
import { Input } from '@repo/ui/components/input';
import { Label } from '@repo/ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select';
import { cn } from '@repo/ui/lib/utils';
import { RiCloseLine } from '@remixicon/react';
import type {
  MatchCriterion,
  MatchImportance,
  MatchWeights,
} from '@repo/db/types/job-preference/importance';
import { MatchImportance as Importance } from '@repo/db/types/job-preference/importance';
import { IMPORTANCE_OPTIONS } from './constants';

/**
 * The pieces the job profile form is built from.
 *
 * Pulled out of the form itself because the form is long: a section, a chip
 * list, a token list and an importance control repeat a dozen times each, and
 * inlining them buried the actual questions being asked.
 */

interface SectionProps {
  title: string;
  hint?: string;
  /** When set, the section carries an importance control in its header. */
  criterion?: MatchCriterion;
  weights?: MatchWeights;
  onWeightChange?: (criterion: MatchCriterion, level: MatchImportance) => void;
  children: React.ReactNode;
}

export function Section({
  title,
  hint,
  criterion,
  weights,
  onWeightChange,
  children,
}: SectionProps) {
  const muted = criterion ? weights?.[criterion] === Importance.IGNORED : false;

  return (
    <section className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          {hint && (
            <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
          )}
        </div>
        {criterion && onWeightChange && (
          <ImportanceSelect
            value={weights?.[criterion] ?? Importance.NORMAL}
            onChange={(level) => onWeightChange(criterion, level)}
          />
        )}
      </div>
      <div className={cn('flex flex-col gap-3', muted && 'opacity-50')}>
        {children}
      </div>
    </section>
  );
}

interface ImportanceSelectProps {
  value: MatchImportance;
  onChange: (level: MatchImportance) => void;
}

/** How much this criterion counts, shown where the criterion is answered. */
export function ImportanceSelect({ value, onChange }: ImportanceSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(next: string | null) =>
        next && onChange(next as MatchImportance)
      }
    >
      <SelectTrigger className="h-7 w-36 shrink-0 text-xs">
        <SelectValue>
          {IMPORTANCE_OPTIONS.find((option) => option.value === value)?.label}
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {IMPORTANCE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <span className="flex flex-col">
              <span>{option.label}</span>
              <span className="text-xs text-muted-foreground">
                {option.hint}
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface ChipsProps<T extends string> {
  options: Array<{ value: T; label: string }>;
  selected: T[];
  onToggle: (value: T) => void;
}

/** A set of values picked by tapping, for enums short enough to show whole. */
export function Chips<T extends string>({
  options,
  selected,
  onToggle,
}: ChipsProps<T>) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = selected.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(option.value)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm transition-colors',
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-input hover:bg-accent',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

interface TokenFieldProps {
  label?: string;
  hint?: string;
  placeholder: string;
  values: string[];
  onChange: (next: string[]) => void;
  /** Rendered in a warning tone — used for the lists that hide offers. */
  destructive?: boolean;
}

/**
 * A list of short free-text values, added one at a time.
 *
 * Enter and comma both commit, because both are what people type when they
 * mean "and also".
 */
export function TokenField({
  label,
  hint,
  placeholder,
  values,
  onChange,
  destructive = false,
}: TokenFieldProps) {
  const [draft, setDraft] = React.useState('');

  const commit = (raw: string) => {
    const next = raw.trim().replace(/,$/, '');
    if (!next) return;
    if (!values.some((value) => value.toLowerCase() === next.toLowerCase())) {
      onChange([...values, next]);
    }
    setDraft('');
  };

  return (
    <div className="flex flex-col gap-2">
      {label && <Label className="text-sm font-medium">{label}</Label>}
      {hint && <p className="-mt-1 text-xs text-muted-foreground">{hint}</p>}
      <Input
        value={draft}
        placeholder={placeholder}
        onChange={(event) => {
          const value = event.target.value;
          if (value.endsWith(',')) commit(value);
          else setDraft(value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commit(draft);
          }
          if (event.key === 'Backspace' && !draft && values.length) {
            onChange(values.slice(0, -1));
          }
        }}
        onBlur={() => commit(draft)}
        className="h-9"
      />
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((value) => (
            <Badge
              key={value}
              variant={destructive ? 'destructive' : 'secondary'}
              className="gap-1 font-normal"
            >
              {value}
              <button
                type="button"
                aria-label={`Remove ${value}`}
                onClick={() => onChange(values.filter((v) => v !== value))}
                className="opacity-70 hover:opacity-100"
              >
                <RiCloseLine className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

/** The share of the profile that carries a signal, as a bar and a number. */
export function CompletenessBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground">{value}% complete</span>
    </div>
  );
}
