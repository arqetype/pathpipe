import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Company } from '@repo/db/entities/company';
import { JobPreference } from '@repo/db/entities/job-preference';
import { UpdateJobPreferenceDto } from '@repo/db/dto/job-preference/update-job-preference.dto';
import {
  ExcludedCompany,
  JobPreferenceResponse,
  ResumeProfileApplied,
} from '@repo/db/query/job-preference';
import { completenessOf, isConfigured } from '../job-posting/match/shared';
import { extractResumeKeywords, normalizeResumeText } from './resume';
import { extractResumeProfile } from './resume-profile';

/** Trimmed, deduped, and capped — a profile is a set, not a paste buffer. */
const cleanList = (values: string[] | undefined, max: number): string[] =>
  values === undefined
    ? []
    : [
        ...new Set(
          values.map((value) => value.trim()).filter((value) => value.length),
        ),
      ].slice(0, max);

@Injectable()
export class JobPreferenceService {
  constructor(
    @InjectRepository(JobPreference)
    private readonly repository: Repository<JobPreference>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  /**
   * The user's profile, or an empty one.
   *
   * Never throws for a user who has not set anything up: the board asks for
   * this on every load, and "no profile yet" is a normal state rather than an
   * error to handle.
   */
  async find(userId: string): Promise<JobPreferenceResponse> {
    const preference = await this.repository.findOne({ where: { userId } });
    return this.toResponse(preference);
  }

  /**
   * Replace the CV with the text read out of an uploaded file.
   *
   * Separate from `update` because a file arrives as multipart and the rest of
   * the profile does not: keeping one endpoint for each means a failed upload
   * cannot take a form full of unsaved answers down with it.
   */
  async replaceResume(
    userId: string,
    text: string,
  ): Promise<JobPreferenceResponse> {
    return this.update(userId, { resumeText: text });
  }

  /**
   * Build the profile out of the CV already on file.
   *
   * Only empty fields are filled. A CV describes what somebody has done and the
   * profile describes what they want next — close enough to propose, not close
   * enough to overwrite an answer they gave on purpose. Everything it writes is
   * an ordinary profile value afterwards, editable like any other.
   */
  async applyResume(userId: string): Promise<ResumeProfileApplied> {
    const preference = await this.repository.findOne({ where: { userId } });
    const text = preference?.resumeText;
    if (!text) {
      throw new BadRequestException(
        'Add a CV first — upload a file or paste the text.',
      );
    }

    const read = extractResumeProfile(text);
    const filled: string[] = [];
    const skipped: string[] = [];
    const dto: UpdateJobPreferenceDto = {};

    // One rule for every field: propose where the user said nothing, report
    // where they did, and stay quiet where the CV had nothing to say.
    const propose = <K extends keyof UpdateJobPreferenceDto>(
      field: K,
      current: unknown[],
      value: NonNullable<UpdateJobPreferenceDto[K]> & unknown[],
      label: string,
    ): void => {
      if (!value.length) return;
      if (current.length) {
        skipped.push(label);
        return;
      }
      dto[field] = value as UpdateJobPreferenceDto[K];
      filled.push(label);
    };

    propose('titles', preference.titles, read.titles, 'titles');
    propose('domains', preference.domains, read.domains, 'domains');
    propose(
      'seniorities',
      preference.seniorities,
      read.seniorities,
      'seniority',
    );
    propose(
      'employmentTypes',
      preference.employmentTypes,
      read.employmentTypes,
      'contract types',
    );
    propose('cities', preference.cities, read.cities, 'cities');
    propose('countries', preference.countries, read.countries, 'countries');
    // `keywords` is deliberately not proposed: the CV's skills already land in
    // `resumeKeywords` on every save, and copying them into a second criterion
    // would weigh the same words twice.

    const updated = Object.keys(dto).length
      ? await this.update(userId, dto)
      : await this.toResponse(preference);

    return { preference: updated, filled, skipped };
  }

  async update(
    userId: string,
    dto: UpdateJobPreferenceDto,
  ): Promise<JobPreferenceResponse> {
    const existing = await this.repository.findOne({ where: { userId } });
    const preference =
      existing ??
      this.repository.create({
        userId,
        employmentTypes: [],
        remoteTypes: [],
        countries: [],
        cities: [],
        domains: [],
        seniorities: [],
        industries: [],
        motivations: [],
        keywords: [],
        titles: [],
        requiredKeywords: [],
        resumeKeywords: [],
        excludedKeywords: [],
        excludedCompanyIds: [],
        weights: {},
        openToRelocation: false,
      });

    if (dto.employmentTypes !== undefined) {
      preference.employmentTypes = [...new Set(dto.employmentTypes)];
    }
    if (dto.remoteTypes !== undefined) {
      preference.remoteTypes = [...new Set(dto.remoteTypes)];
    }
    if (dto.countries !== undefined) {
      preference.countries = cleanList(
        dto.countries.map((code) => code.toUpperCase()),
        50,
      );
    }
    if (dto.cities !== undefined) {
      preference.cities = cleanList(dto.cities, 50);
    }
    if (dto.domains !== undefined) {
      preference.domains = [...new Set(dto.domains)];
    }
    if (dto.seniorities !== undefined) {
      preference.seniorities = [...new Set(dto.seniorities)];
    }
    if (dto.motivations !== undefined) {
      preference.motivations = cleanList(dto.motivations, 20);
    }
    if (dto.keywords !== undefined) {
      preference.keywords = cleanList(dto.keywords, 40);
    }
    if (dto.titles !== undefined) {
      preference.titles = cleanList(dto.titles, 20);
    }
    if (dto.requiredKeywords !== undefined) {
      preference.requiredKeywords = cleanList(dto.requiredKeywords, 10);
    }
    if (dto.industries !== undefined) {
      preference.industries = [...new Set(dto.industries)];
    }
    if (dto.resumeText !== undefined) {
      const text = dto.resumeText ? normalizeResumeText(dto.resumeText) : '';
      preference.resumeText = text || null;
      // Re-derived on every save, so improving the extraction — or the user
      // fixing their own text — takes effect without a migration.
      preference.resumeKeywords = text ? extractResumeKeywords(text) : [];
      preference.resumeUpdatedAt = text ? new Date() : null;
    }
    if (dto.excludedKeywords !== undefined) {
      preference.excludedKeywords = cleanList(dto.excludedKeywords, 40);
    }
    if (dto.excludedCompanyIds !== undefined) {
      preference.excludedCompanyIds = [...new Set(dto.excludedCompanyIds)];
    }
    if (dto.minSalary !== undefined) {
      preference.minSalary = dto.minSalary || null;
    }
    if (dto.salaryCurrency !== undefined) {
      preference.salaryCurrency =
        dto.salaryCurrency?.trim().toUpperCase() || null;
    }
    if (dto.maxAgeDays !== undefined) {
      preference.maxAgeDays = dto.maxAgeDays || null;
    }
    if (dto.openToRelocation !== undefined) {
      preference.openToRelocation = dto.openToRelocation;
    }
    if (dto.weights !== undefined) {
      preference.weights = dto.weights ?? {};
    }
    if (dto.notifyMatches !== undefined) {
      preference.notifyMatches = dto.notifyMatches;
    }

    return this.toResponse(await this.repository.save(preference));
  }

  private async toResponse(
    preference: JobPreference | null,
  ): Promise<JobPreferenceResponse> {
    return {
      employmentTypes: preference?.employmentTypes ?? [],
      domains: preference?.domains ?? [],
      seniorities: preference?.seniorities ?? [],
      industries: preference?.industries ?? [],
      motivations: preference?.motivations ?? [],
      resumeText: preference?.resumeText ?? null,
      resumeKeywords: preference?.resumeKeywords ?? [],
      resumeUpdatedAt: preference?.resumeUpdatedAt?.toISOString() ?? null,
      remoteTypes: preference?.remoteTypes ?? [],
      countries: preference?.countries ?? [],
      cities: preference?.cities ?? [],
      openToRelocation: preference?.openToRelocation ?? false,
      keywords: preference?.keywords ?? [],
      titles: preference?.titles ?? [],
      requiredKeywords: preference?.requiredKeywords ?? [],
      excludedKeywords: preference?.excludedKeywords ?? [],
      excludedCompanies: await this.namesFor(preference?.excludedCompanyIds),
      minSalary: preference?.minSalary ?? null,
      salaryCurrency: preference?.salaryCurrency ?? null,
      maxAgeDays: preference?.maxAgeDays ?? null,
      weights: preference?.weights ?? {},
      notifyMatches: preference?.notifyMatches ?? true,
      configured: isConfigured(preference),
      completeness: completenessOf(preference),
    };
  }

  /**
   * The excluded companies, named.
   *
   * A row can survive the company it points at, so the ids that no longer
   * resolve are dropped from the response rather than shown as blanks — the
   * next save then cleans them out of the profile for good.
   */
  private async namesFor(
    ids: string[] | undefined,
  ): Promise<ExcludedCompany[]> {
    if (!ids?.length) return [];
    const companies = await this.companyRepository.find({
      where: { id: In(ids) },
      select: { id: true, name: true },
    });
    return companies.map(({ id, name }) => ({ id, name }));
  }
}
