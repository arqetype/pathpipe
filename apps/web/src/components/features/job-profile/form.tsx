'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@repo/ui/components/button';
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
import { EmploymentType } from '@repo/db/types/job-posting/employment-type';
import { RemoteType } from '@repo/db/types/job-posting/remote-type';
import {
  SeniorityLevel,
  WorkDomain,
} from '@repo/db/types/job-posting/work-domain';
import type { CompanyIndustry } from '@repo/db/types/company/industry';
import {
  MatchCriterion,
  MatchImportance,
  type MatchWeights,
} from '@repo/db/types/job-preference/importance';
import type {
  ExcludedCompany,
  JobPreferenceResponse,
} from '@repo/db/query/job-preference';
import { updateJobPreferenceAction } from '@/actions/job-preference';
import { COMPANY_INDUSTRY_OPTIONS } from '../companies/constants/industry';
import {
  EMPLOYMENT_TYPE_LABELS,
  REMOTE_TYPE_LABELS,
  SENIORITY_LABELS,
  WORK_DOMAIN_LABELS,
  countryName,
} from '../job-matches/constants';
import {
  COMMON_COUNTRIES,
  FRESHNESS_OPTIONS,
  SALARY_CURRENCIES,
} from './constants';
import { Chips, CompletenessBar, Section, TokenField } from './fields';
import { ExcludedCompanies } from './excluded-companies';
import { ResumeField } from './resume-field';

interface JobProfileFormProps {
  preference: JobPreferenceResponse;
}

const toOptions = <T extends string>(
  values: T[],
  labels: Record<T, string>,
): Array<{ value: T; label: string }> =>
  values.map((value) => ({ value, label: labels[value] }));

const DOMAIN_OPTIONS = toOptions(Object.values(WorkDomain), WORK_DOMAIN_LABELS);
const SENIORITY_OPTIONS = toOptions(
  Object.values(SeniorityLevel),
  SENIORITY_LABELS,
);
const EMPLOYMENT_OPTIONS = toOptions(
  Object.values(EmploymentType),
  EMPLOYMENT_TYPE_LABELS,
);
const REMOTE_OPTIONS = toOptions(Object.values(RemoteType), REMOTE_TYPE_LABELS);

/**
 * Everything a profile says, in the order somebody would say it.
 *
 * The shape of the page is the argument: what you want to do, then where and on
 * what terms, then the words to look for, then what to keep out. Each section
 * carries its own importance control, so the weight is set next to the answer
 * it weighs rather than in a table of sliders nobody can map back to a field.
 */
export function JobProfileForm({ preference }: JobProfileFormProps) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState<JobPreferenceResponse>(preference);
  const [form, setForm] = React.useState(() => toForm(preference));

  // The upload endpoint saves on its own, so the baseline has to follow it or
  // the form would keep showing unsaved changes it no longer has.
  const adoptSaved = (next: JobPreferenceResponse) => {
    setSaved(next);
    setForm((current) => ({ ...current, resumeText: next.resumeText ?? '' }));
  };

  const dirty = React.useMemo(
    () => JSON.stringify(form) !== JSON.stringify(toForm(saved)),
    [form, saved],
  );

  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value)
      ? list.filter((entry) => entry !== value)
      : [...list, value];

  const setWeight = (criterion: MatchCriterion, level: MatchImportance) =>
    setForm((f) => ({
      ...f,
      // The default is not stored: a map holding only what was changed keeps
      // the row honest about what the user actually decided.
      weights:
        level === MatchImportance.NORMAL
          ? omit(f.weights, criterion)
          : { ...f.weights, [criterion]: level },
    }));

  const save = async () => {
    setSaving(true);
    try {
      const next = await updateJobPreferenceAction({
        employmentTypes: form.employmentTypes,
        remoteTypes: form.remoteTypes,
        domains: form.domains,
        seniorities: form.seniorities,
        industries: form.industries,
        motivations: form.motivations,
        resumeText: form.resumeText || null,
        countries: form.countries.map((code) => code.toUpperCase()),
        cities: form.cities,
        openToRelocation: form.openToRelocation,
        keywords: form.keywords,
        titles: form.titles,
        requiredKeywords: form.requiredKeywords,
        excludedKeywords: form.excludedKeywords,
        excludedCompanyIds: form.excludedCompanies.map(({ id }) => id),
        minSalary: form.minSalary ? Number.parseInt(form.minSalary, 10) : null,
        salaryCurrency: form.salaryCurrency || null,
        maxAgeDays: form.maxAgeDays
          ? Number.parseInt(form.maxAgeDays, 10)
          : null,
        weights: form.weights,
        notifyMatches: form.notifyMatches,
      });
      setSaved(next);
      setForm(toForm(next));
      toast.success('Job profile saved');
      router.refresh();
    } catch {
      toast.error('Could not save your job profile');
    } finally {
      setSaving(false);
    }
  };

  const weightProps = {
    weights: form.weights,
    onWeightChange: setWeight,
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-3 border-b bg-background/95 px-1 py-3 backdrop-blur">
        <CompletenessBar value={saved.completeness} />
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {dirty
              ? 'Unsaved changes'
              : saved.configured
                ? 'Your board is ranked against this'
                : 'Nothing saved yet'}
          </span>
          <Button onClick={save} disabled={saving || !dirty} size="sm">
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      <Section
        title="What do you want to work on?"
        hint="The strongest signal in your profile — offers are classified by this when they come in, so it ranks on more than a title matching."
        criterion={MatchCriterion.DOMAIN}
        {...weightProps}
      >
        <Chips
          options={DOMAIN_OPTIONS}
          selected={form.domains}
          onToggle={(domain) =>
            setForm((f) => ({ ...f, domains: toggle(f.domains, domain) }))
          }
        />
      </Section>

      <Section
        title="At what level?"
        criterion={MatchCriterion.SENIORITY}
        {...weightProps}
      >
        <Chips
          options={SENIORITY_OPTIONS}
          selected={form.seniorities}
          onToggle={(level) =>
            setForm((f) => ({
              ...f,
              seniorities: toggle(f.seniorities, level),
            }))
          }
        />
      </Section>

      <Section
        title="Which job titles?"
        hint="Matched against the offer's title alone, so a description that merely mentions the words does not count."
        criterion={MatchCriterion.TITLE}
        {...weightProps}
      >
        <TokenField
          placeholder="e.g. data engineer, product designer"
          values={form.titles}
          onChange={(titles) => setForm((f) => ({ ...f, titles }))}
        />
      </Section>

      <Section
        title="What kind of contract?"
        hint="Pick nothing and every contract type ranks the same."
        criterion={MatchCriterion.EMPLOYMENT_TYPE}
        {...weightProps}
      >
        <Chips
          options={EMPLOYMENT_OPTIONS}
          selected={form.employmentTypes}
          onToggle={(type) =>
            setForm((f) => ({
              ...f,
              employmentTypes: toggle(f.employmentTypes, type),
            }))
          }
        />
      </Section>

      <Section
        title="How do you want to work?"
        criterion={MatchCriterion.REMOTE_TYPE}
        {...weightProps}
      >
        <Chips
          options={REMOTE_OPTIONS}
          selected={form.remoteTypes}
          onToggle={(type) =>
            setForm((f) => ({ ...f, remoteTypes: toggle(f.remoteTypes, type) }))
          }
        />
      </Section>

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

      <Section
        title="Roles and skills"
        hint="Ranking signals: these move offers up the board, they never hide one."
        criterion={MatchCriterion.KEYWORDS}
        {...weightProps}
      >
        <TokenField
          label="Keywords"
          placeholder="e.g. backend, React, data engineer"
          values={form.keywords}
          onChange={(keywords) => setForm((f) => ({ ...f, keywords }))}
        />
      </Section>

      <Section
        title="Must mention"
        hint="The one part of the profile that can hide an offer — and only while “only matches” is on. Everything else just re-orders the board."
      >
        <TokenField
          placeholder="e.g. kubernetes"
          values={form.requiredKeywords}
          onChange={(requiredKeywords) =>
            setForm((f) => ({ ...f, requiredKeywords }))
          }
        />
      </Section>

      <Section
        title="Which industries?"
        hint="Read off the company behind the offer. Companies we have not classified are never penalised."
        criterion={MatchCriterion.INDUSTRY}
        {...weightProps}
      >
        <Chips
          options={COMPANY_INDUSTRY_OPTIONS}
          selected={form.industries}
          onToggle={(industry) =>
            setForm((f) => ({
              ...f,
              industries: toggle(f.industries, industry),
            }))
          }
        />
      </Section>

      <Section
        title="What matters to you"
        hint="What you want out of the work — climate, open source, small team, research. Matched against how companies describe themselves."
        criterion={MatchCriterion.MOTIVATION}
        {...weightProps}
      >
        <TokenField
          placeholder="e.g. open source, climate, small team"
          values={form.motivations}
          onChange={(motivations) => setForm((f) => ({ ...f, motivations }))}
        />
      </Section>

      <Section
        title="Your CV"
        hint="We read the skills out of it and use them to rank. It never leaves your account and is never shown to anyone."
        criterion={MatchCriterion.RESUME}
        {...weightProps}
      >
        <ResumeField
          value={form.resumeText}
          onChange={(resumeText) => setForm((f) => ({ ...f, resumeText }))}
          keywords={saved.resumeKeywords}
          onUploaded={adoptSaved}
        />
      </Section>

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

      <div className="flex items-center gap-3 pb-2">
        <Button onClick={save} disabled={saving || !dirty}>
          {saving ? 'Saving…' : 'Save job profile'}
        </Button>
        {!dirty && saved.configured && (
          <span className="text-xs text-muted-foreground">
            Everything here is saved.
          </span>
        )}
      </div>
    </div>
  );
}

/** The response as the form holds it — numbers as the strings inputs produce. */
const toForm = (preference: JobPreferenceResponse) => ({
  employmentTypes: preference.employmentTypes,
  remoteTypes: preference.remoteTypes,
  domains: preference.domains,
  seniorities: preference.seniorities,
  industries: preference.industries as CompanyIndustry[],
  motivations: preference.motivations,
  resumeText: preference.resumeText ?? '',
  countries: preference.countries,
  cities: preference.cities,
  openToRelocation: preference.openToRelocation,
  keywords: preference.keywords,
  titles: preference.titles,
  requiredKeywords: preference.requiredKeywords,
  excludedKeywords: preference.excludedKeywords,
  excludedCompanies: preference.excludedCompanies as ExcludedCompany[],
  minSalary: preference.minSalary?.toString() ?? '',
  salaryCurrency: preference.salaryCurrency ?? '',
  maxAgeDays: preference.maxAgeDays?.toString() ?? '',
  weights: preference.weights as MatchWeights,
  notifyMatches: preference.notifyMatches,
});

const omit = (weights: MatchWeights, key: MatchCriterion): MatchWeights => {
  const next = { ...weights };
  delete next[key];
  return next;
};
