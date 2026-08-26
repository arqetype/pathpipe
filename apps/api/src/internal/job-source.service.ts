import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyWatch } from '@repo/db/entities/company-watch';
import { JobSource } from '@repo/db/entities/job-source';
import { UpdateJobSourceStateDto } from '@repo/db/dto/job-posting/update-job-source-state.dto';

export interface JobSourceWatcher {
  userId: string;
  userEmail: string;
  userName: string;
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
  watchers: JobSourceWatcher[];
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
 * Turns the watch list into a crawl work list: one entry per careers URL, with
 * every user watching it attached, plus the crawl state from the previous run.
 *
 * Grouping by URL is what stops the worker from fetching the same board once
 * per watcher.
 */
@Injectable()
export class JobSourceService {
  constructor(
    @InjectRepository(CompanyWatch)
    private readonly companyWatchRepository: Repository<CompanyWatch>,
    @InjectRepository(JobSource)
    private readonly jobSourceRepository: Repository<JobSource>,
  ) {}

  async listTasks(): Promise<JobSourceTask[]> {
    const watches = await this.companyWatchRepository.find({
      relations: ['user', 'company'],
    });

    const grouped = new Map<string, JobSourceTask>();
    for (const watch of watches) {
      const rawUrl =
        watch.careersUrl ??
        watch.company?.careersUrl ??
        watch.website ??
        watch.company?.website;
      if (!rawUrl || !watch.user || !watch.company) continue;

      const url = normalizeSourceUrl(rawUrl);
      const existing = grouped.get(url);
      const watcher: JobSourceWatcher = {
        userId: watch.user.id,
        userEmail: watch.user.email,
        userName: watch.user.name ?? watch.user.email,
        companyId: watch.company.id,
        companyName: watch.company.name,
      };

      if (existing) {
        existing.watchers.push(watcher);
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
        watchers: [watcher],
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
