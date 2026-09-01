import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Company, CompanyStatus } from '@repo/db/entities/company';
import { CompanyWatch } from '@repo/db/entities/company-watch';
import { JobSource } from '@repo/db/entities/job-source';
import { UpdateJobSourceStateDto } from '@repo/db/dto/job-posting/update-job-source-state.dto';

/** A company whose board lives behind one crawled URL. */
export interface JobSourceCompany {
  companyId: string;
  companyName: string;
}

export interface JobSourceTask {
  url: string;
  platform: string | null;
  strategy: string | null;
  etag: string | null;
  lastModified: string | null;
  contentHash: string | null;
  jobCount: number;
  requiresBrowser: boolean;
  failureCount: number;
  lastCheckedAt: string | null;
  lastChangedAt: string | null;
  lastSyncedAt: string | null;
  companies: JobSourceCompany[];
}

/** Trailing slashes and casing must not split one company into two sources. */
const normalizeSourceUrl = (raw: string): string => {
  const trimmed = raw.trim();
  try {
    const url = new URL(trimmed);
    url.hash = '';
    url.hostname = url.hostname.toLowerCase();
    if (url.pathname.length > 1) {
      url.pathname = url.pathname.replace(/\/+$/, '');
    }
    return url.toString();
  } catch {
    return trimmed.replace(/\/+$/, '');
  }
};

/**
 * The crawl work list: one entry per careers URL, with the companies behind it
 * and the crawl state from the previous run.
 *
 * Every company with a careers URL is crawled, not only the ones somebody is
 * watching — offers are global, so a board nobody follows yet still has to be
 * read before anybody can find anything on it. Grouping by URL is what stops
 * two companies sharing a board from being fetched twice.
 */
@Injectable()
export class JobSourceService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(CompanyWatch)
    private readonly companyWatchRepository: Repository<CompanyWatch>,
    @InjectRepository(JobSource)
    private readonly jobSourceRepository: Repository<JobSource>,
  ) {}

  async listTasks(): Promise<JobSourceTask[]> {
    const companies = await this.companyRepository.find({
      where: [
        { careersUrl: Not(IsNull()), status: Not(CompanyStatus.REJECTED) },
        { website: Not(IsNull()), status: Not(CompanyStatus.REJECTED) },
      ],
    });

    // A follower who corrected a company's careers URL on their own watch knows
    // something the company record does not, so that URL is crawled too.
    const overrides = await this.companyWatchRepository.find({
      relations: ['company'],
    });

    const sources: Array<{ url: string; company: JobSourceCompany }> = [];
    for (const company of companies) {
      const rawUrl = company.careersUrl ?? company.website;
      if (!rawUrl) continue;
      sources.push({
        url: rawUrl,
        company: { companyId: company.id, companyName: company.name },
      });
    }
    for (const watch of overrides) {
      const rawUrl = watch.careersUrl ?? watch.website;
      if (!rawUrl || !watch.company) continue;
      sources.push({
        url: rawUrl,
        company: {
          companyId: watch.company.id,
          companyName: watch.company.name,
        },
      });
    }

    const grouped = new Map<string, JobSourceTask>();
    for (const source of sources) {
      const url = normalizeSourceUrl(source.url);
      const entry = source.company;

      const existing = grouped.get(url);
      if (existing) {
        if (
          !existing.companies.some(
            (company) => company.companyId === entry.companyId,
          )
        ) {
          existing.companies.push(entry);
        }
        continue;
      }
      grouped.set(url, {
        url,
        platform: null,
        strategy: null,
        etag: null,
        lastModified: null,
        contentHash: null,
        jobCount: 0,
        requiresBrowser: false,
        failureCount: 0,
        lastCheckedAt: null,
        lastChangedAt: null,
        lastSyncedAt: null,
        companies: [entry],
      });
    }

    if (!grouped.size) return [];

    const states = await this.jobSourceRepository.find();
    for (const state of states) {
      const task = grouped.get(normalizeSourceUrl(state.url));
      if (!task) continue;
      task.platform = state.platform;
      task.strategy = state.strategy;
      task.etag = state.etag;
      task.lastModified = state.lastModified;
      task.contentHash = state.contentHash;
      task.jobCount = state.jobCount;
      task.requiresBrowser = state.requiresBrowser;
      task.failureCount = state.failureCount;
      task.lastCheckedAt = state.lastCheckedAt?.toISOString() ?? null;
      task.lastChangedAt = state.lastChangedAt?.toISOString() ?? null;
      task.lastSyncedAt = state.lastSyncedAt?.toISOString() ?? null;
    }

    return [...grouped.values()];
  }

  async updateState(dto: UpdateJobSourceStateDto): Promise<void> {
    const url = normalizeSourceUrl(dto.url);
    const now = new Date();
    const existing = await this.jobSourceRepository.findOne({ where: { url } });

    const source = existing ?? this.jobSourceRepository.create({ url });
    source.lastCheckedAt = now;

    if (dto.platform !== undefined) source.platform = dto.platform;
    if (dto.strategy !== undefined) source.strategy = dto.strategy;
    if (dto.etag !== undefined) source.etag = dto.etag;
    if (dto.lastModified !== undefined) source.lastModified = dto.lastModified;
    if (dto.contentHash !== undefined) source.contentHash = dto.contentHash;
    if (dto.jobCount !== undefined && dto.jobCount !== null) {
      source.jobCount = dto.jobCount;
    }
    if (dto.requiresBrowser !== undefined) {
      source.requiresBrowser = dto.requiresBrowser;
    }
    if (dto.changed) source.lastChangedAt = now;
    if (dto.synced) source.lastSyncedAt = now;

    if (dto.error) {
      source.failureCount = (source.failureCount ?? 0) + 1;
      source.lastError = dto.error.slice(0, 2000);
    } else {
      source.failureCount = 0;
      source.lastError = null;
    }

    await this.jobSourceRepository.save(source);
  }
}
