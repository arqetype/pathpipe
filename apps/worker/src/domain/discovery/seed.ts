import { readFileSync } from 'node:fs';
import { HttpClient } from '@/infrastructure/http/http';
import { createLimiter } from './limiter';
import { JobDiscoveryService } from './pipeline';
import { matchAdapterByUrl } from './registry';
import {
  VENDORS,
  candidateTokens,
  probeToken,
  tokenFromInput,
} from './vendors';
import { apiClient } from '@/infrastructure/api/api.client';
import { configService } from '@/infrastructure/config/config.service';
import { feedCompanies } from './seed/feeds';
import { reportConfirmed } from './seed/report';
import { ycCompanies } from './seed/yc';
import type { ConfirmedBoard, SeedBoardsOptions } from './seed/types';

export type { ConfirmedBoard, SeedBoardsOptions } from './seed/types';

interface KnownCompany {
  id: string;
  name: string;
  careersUrl: string | null;
}

const seedHttpClient = (log: (msg: string) => void): HttpClient =>
  new HttpClient({
    userAgent: configService.get('discovery').userAgent,
    perHostDelayMs: 200,
    respectRobots: false,
    maxRequestsPerHost: 20_000,
    log: (data, msg) => {
      if (msg.includes('backed off') || msg.includes('Rate limited')) {
        log(`  ! ${msg} ${JSON.stringify(data)}`);
      }
    },
  });

export const seedBoards = async (
  options: SeedBoardsOptions,
): Promise<ConfirmedBoard[]> => {
  const log = options.log ?? ((msg: string) => console.log(msg));
  const limit = options.limit ?? 500;
  const vendors = options.vendors ?? VENDORS;
  const http = seedHttpClient(log);

  const candidates = new Map<string, string>();
  const add = (token: string, label: string): void => {
    if (token && !candidates.has(token)) candidates.set(token, label);
  };

  // Workday boards are given as URLs.
  const directUrls = new Set<string>();

  if (options.file) {
    for (const rawLine of readFileSync(options.file, 'utf8').split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      if (/^https?:\/\//i.test(line) && matchAdapterByUrl(line)) {
        directUrls.add(line);
        continue;
      }

      const token = tokenFromInput(line);
      if (token) add(token, token);
    }
    log(
      `${candidates.size} board names and ${directUrls.size} careers URLs from ${options.file}`,
    );
  }

  if (options.yc) {
    const before = candidates.size;
    for (const name of await ycCompanies(http, limit)) {
      for (const token of candidateTokens(name)) add(token, name);
    }
    log(`${candidates.size - before} candidates from Y Combinator's directory`);
  }

  if (options.feeds) {
    const before = candidates.size;
    log('Reading public job feeds…');
    for (const name of await feedCompanies(http, limit, log)) {
      for (const token of candidateTokens(name)) add(token, name);
    }
    log(`${candidates.size - before} candidates from public job feeds`);
  }

  if (options.companies) {
    const before = candidates.size;
    try {
      const companies = await apiClient.get<KnownCompany[]>(
        '/internal/v1/companies',
      );
      for (const company of companies) {
        if (company.careersUrl) continue;
        for (const token of candidateTokens(company.name)) {
          add(token, company.name);
        }
      }
      log(
        `${candidates.size - before} candidates from companies we already know`,
      );
    } catch (err) {
      log(`Could not read the company list from the API: ${String(err)}`);
    }
  }

  if (!candidates.size && !directUrls.size) return [];

  const limiter = createLimiter(options.concurrency ?? 4);
  const found: ConfirmedBoard[] = [];
  let checked = 0;

  if (directUrls.size) {
    log(`Reading ${directUrls.size} careers URLs through their adapter…`);
    const discovery = new JobDiscoveryService({ http, log: () => {} });

    await Promise.all(
      [...directUrls].map((url) =>
        limiter(async () => {
          const result = await discovery.discover(url);
          if (!result.jobs.length) {
            log(`  ! no offers read from ${url}`);
            return;
          }
          const match = matchAdapterByUrl(url);
          const params = match?.target.params ?? {};
          found.push({
            platform: result.platform ?? match?.adapter.platform ?? 'unknown',
            token: params.tenant ?? params.token ?? new URL(url).hostname,
            careersUrl: url,
            jobCount: result.jobs.length,
            label: url,
          });
        }),
      ),
    );
  }

  if (candidates.size) {
    log(
      `Checking ${candidates.size} candidates against ${vendors
        .map((vendor) => vendor.platform)
        .join(', ')}…`,
    );
  }

  await Promise.all(
    [...candidates.entries()].map(([token, label]) =>
      limiter(async () => {
        const hit = await probeToken(http, token, vendors);
        checked += 1;
        if (checked % 100 === 0) log(`  …${checked}/${candidates.size}`);
        if (hit) found.push({ ...hit, label });
      }),
    ),
  );

  // One board answers to any case.
  const byBoard = new Map<string, ConfirmedBoard>();
  for (const hit of found) {
    const key = `${hit.platform}:${hit.token.toLowerCase()}`;
    const kept = byBoard.get(key);
    if (
      !kept ||
      (kept.token !== kept.token.toLowerCase() &&
        hit.token === hit.token.toLowerCase())
    ) {
      byBoard.set(key, hit);
    }
  }

  const confirmed = [...byBoard.values()].sort(
    (a, b) => b.jobCount - a.jobCount,
  );

  reportConfirmed(confirmed, log, options.out);

  if (!confirmed.length) return confirmed;

  if (options.dryRun) {
    log('\n--dry-run: nothing written.');
    return confirmed;
  }

  const response = await apiClient.post<{
    created: number;
    updated: number;
    unchanged: number;
  }>('/internal/v1/companies/seed', {
    companies: confirmed.map((hit) => ({
      // The board names the company.
      name: hit.token,
      careersUrl: hit.careersUrl,
      source: hit.platform,
    })),
  });

  log(
    `\nSeeded: ${response.created} created, ${response.updated} updated, ${response.unchanged} left alone.`,
  );
  log('The next full crawl will pick their offers up.');

  return confirmed;
};
