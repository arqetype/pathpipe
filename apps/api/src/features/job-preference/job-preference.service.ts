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
import { extractResumeKeywords, normalizeResumeText } from './resume/keywords';
import { extractResumeProfile } from './resume/profile';

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

  async find(userId: string): Promise<JobPreferenceResponse> {
    const preference = await this.repository.findOne({ where: { userId } });
    return this.toResponse(preference);
  }

  async replaceResume(
    userId: string,
    text: string,
  ): Promise<JobPreferenceResponse> {
    return this.update(userId, { resumeText: text });
  }

  // Fills empty fields only; never overwrites.
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
    // Skills already land in resumeKeywords.

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
      // Re-derived on every save.
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

  // Unresolved ids are dropped silently.
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
