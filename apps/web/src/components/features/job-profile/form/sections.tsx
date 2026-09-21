'use client';

import { Checkbox } from '@repo/ui/components/checkbox';
import { Input } from '@repo/ui/components/input';
import { Label } from '@repo/ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select';
import { Switch } from '@repo/ui/components/switch';
import {
  MatchCriterion,
  type MatchImportance,
  type MatchWeights,
} from '@repo/db/types/job-preference/importance';
import { countryName } from '../../job-matches/constants';
import {
  COMMON_COUNTRIES,
  FRESHNESS_OPTIONS,
  SALARY_CURRENCIES,
} from '../constants/profile';
import { Section, TokenField } from '../shared/fields';
import { ExcludedCompanies } from '../shared/excluded-companies';
import {
  toggle,
  type JobProfileFormState,
  type SetJobProfileForm,
} from './state';

interface FieldsProps {
  form: JobProfileFormState;
  setForm: SetJobProfileForm;
}

interface WeightedProps extends FieldsProps {
  weights: MatchWeights;
  onWeightChange: (criterion: MatchCriterion, level: MatchImportance) => void;
}

export function LocationSection({
  form,
  setForm,
  ...weightProps
}: WeightedProps) {
  return (
    <Section
      title="Where?"
      hint="One city, several countries, or both — an offer matching either scores."
      criterion={MatchCriterion.LOCATION}
      {...weightProps}
    >
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium">Countries</Label>
        <div className="flex flex-wrap gap-1.5">
          {[...new Set([...COMMON_COUNTRIES, ...form.countries])].map(
            (code) => (
              <label
                key={code}
                className="flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm"
              >
                <Checkbox
                  checked={form.countries.includes(code)}
                  onCheckedChange={() =>
                    setForm((f) => ({
                      ...f,
                      countries: toggle(f.countries, code),
                    }))
                  }
                />
                {countryName(code)}
              </label>
            ),
          )}
        </div>
      </div>

      <TokenField
        label="Cities"
        hint="Written the way the boards write them — Paris, San Francisco, Berlin."
        placeholder="Add a city and press Enter"
        values={form.cities}
        onChange={(cities) => setForm((f) => ({ ...f, cities }))}
      />

      <label className="flex items-center justify-between gap-4 rounded-md border p-3">
        <span className="flex flex-col">
          <span className="text-sm font-medium">
            I would move for the right job
          </span>
          <span className="text-xs text-muted-foreground">
            Offers elsewhere keep some credit instead of scoring zero, and are
            never filtered out.
          </span>
        </span>
        <Switch
          checked={form.openToRelocation}
          onCheckedChange={(checked: boolean) =>
            setForm((f) => ({ ...f, openToRelocation: checked }))
          }
        />
      </label>
    </Section>
  );
}

export function PaySection({ form, setForm, ...weightProps }: WeightedProps) {
  return (
    <Section
      title="Pay"
      hint="Offers that publish no salary still show — most of them do not publish one — and one priced in another currency is treated the same way."
      criterion={MatchCriterion.SALARY}
      {...weightProps}
    >
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="min-salary" className="text-sm font-medium">
            Minimum salary
          </Label>
          <Input
            id="min-salary"
            inputMode="numeric"
            placeholder="e.g. 45000"
            value={form.minSalary}
            onChange={(event) =>
              setForm((f) => ({
                ...f,
                minSalary: event.target.value.replace(/[^\d]/g, ''),
              }))
            }
            className="h-9 w-40"
          />
        </div>
        <Select
          value={form.salaryCurrency || SALARY_CURRENCIES[0]}
          onValueChange={(next: string | null) =>
            setForm((f) => ({ ...f, salaryCurrency: next ?? '' }))
          }
        >
          <SelectTrigger className="h-9 w-24">
            <SelectValue>
              {form.salaryCurrency || SALARY_CURRENCIES[0]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SALARY_CURRENCIES.map((code) => (
              <SelectItem key={code} value={code}>
                {code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </Section>
  );
}

export function FreshnessSection({
  form,
  setForm,
  ...weightProps
}: WeightedProps) {
  return (
    <Section
      title="How fresh?"
      hint="Recency is part of fit, not a filter: past the window an offer loses these points, it does not leave the board."
      criterion={MatchCriterion.FRESHNESS}
      {...weightProps}
    >
      <Select
        value={form.maxAgeDays || 'any'}
        onValueChange={(next: string | null) =>
          setForm((f) => ({
            ...f,
            maxAgeDays: !next || next === 'any' ? '' : next,
          }))
        }
      >
        <SelectTrigger className="h-9 w-48">
          <SelectValue>
            {FRESHNESS_OPTIONS.find(
              (option) => option.value === form.maxAgeDays,
            )?.label ?? 'No preference'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">No preference</SelectItem>
          {FRESHNESS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Section>
  );
}

export function ExclusionsSection({ form, setForm }: FieldsProps) {
  return (
    <Section
      title="Never show me"
      hint="The only rules applied whatever the filters say. Everything here is hidden outright."
    >
      <TokenField
        label="Words"
        placeholder="e.g. sales, php"
        values={form.excludedKeywords}
        onChange={(excludedKeywords) =>
          setForm((f) => ({ ...f, excludedKeywords }))
        }
        destructive
      />
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium">Companies</Label>
        <ExcludedCompanies
          values={form.excludedCompanies}
          onChange={(excludedCompanies) =>
            setForm((f) => ({ ...f, excludedCompanies }))
          }
        />
      </div>
    </Section>
  );
}

export function AlertsSection({ form, setForm }: FieldsProps) {
  return (
    <Section title="Alerts">
      <label className="flex items-center justify-between gap-4">
        <span className="flex flex-col">
          <span className="text-sm font-medium">Email me new matches</span>
          <span className="text-xs text-muted-foreground">
            A digest of what came in since the last one, best fit first.
          </span>
        </span>
        <Switch
          checked={form.notifyMatches}
          onCheckedChange={(checked: boolean) =>
            setForm((f) => ({ ...f, notifyMatches: checked }))
          }
        />
      </label>
    </Section>
  );
}
