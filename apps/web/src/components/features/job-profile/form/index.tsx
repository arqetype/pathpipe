'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@repo/ui/components/button';
import {
  MatchCriterion,
  MatchImportance,
} from '@repo/db/types/job-preference/importance';
import type { JobPreferenceResponse } from '@repo/db/query/job-preference';
import { updateJobPreferenceAction } from '@/actions/job-preference';
import { COMPANY_INDUSTRY_OPTIONS } from '../../companies/constants/industry';
import {
  DOMAIN_OPTIONS,
  EMPLOYMENT_OPTIONS,
  REMOTE_OPTIONS,
  SENIORITY_OPTIONS,
} from '../constants/options';
import { Chips, CompletenessBar, Section, TokenField } from '../shared/fields';
import { ResumeField } from './resume-field';
import {
  AlertsSection,
  ExclusionsSection,
  FreshnessSection,
  LocationSection,
  PaySection,
} from './sections';
import { omit, toForm, toggle } from './state';

interface JobProfileFormProps {
  preference: JobPreferenceResponse;
}

export function JobProfileForm({ preference }: JobProfileFormProps) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState<JobPreferenceResponse>(preference);
  const [form, setForm] = React.useState(() => toForm(preference));

  // Upload saves on its own; follow it.
  const adoptSaved = (next: JobPreferenceResponse) => {
    setSaved(next);
    setForm((current) => ({ ...current, resumeText: next.resumeText ?? '' }));
  };

  const adoptProfile = (next: JobPreferenceResponse) => {
    setSaved(next);
    setForm(toForm(next));
  };

  const dirty = React.useMemo(
    () => JSON.stringify(form) !== JSON.stringify(toForm(saved)),
    [form, saved],
  );

  const setWeight = (criterion: MatchCriterion, level: MatchImportance) =>
    setForm((f) => ({
      ...f,
      // Defaults are not stored.
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

  const fieldsProps = { form, setForm };

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

      <LocationSection {...fieldsProps} {...weightProps} />

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
          onFilled={adoptProfile}
          hasSavedResume={Boolean(saved.resumeText)}
        />
      </Section>

      <PaySection {...fieldsProps} {...weightProps} />

      <FreshnessSection {...fieldsProps} {...weightProps} />

      <ExclusionsSection {...fieldsProps} />

      <AlertsSection {...fieldsProps} />

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
