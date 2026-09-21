import { readFileSync, writeFileSync } from 'node:fs';
import { HttpClient } from '@/infrastructure/http/http';
import { createLimiter } from './limiter';
import { JobDiscoveryService } from './pipeline';
import { matchAdapterByUrl } from './registry';
import {
  VENDORS,
  candidateTokens,
  probeToken,
  tokenFromInput,
  type BoardHit,
  type VendorProbe,
} from './vendors';
import { apiClient } from '@/infrastructure/api/api.client';
import { configService } from '@/infrastructure/config/config.service';

/**
 * Finds job boards and registers the companies behind them.
 *
 * No ATS vendor publishes a directory of its customers, so "every company on
 * Greenhouse" is not something that can be downloaded. What *can* be done is
 * settle the question for one company in one request: each vendor's public API
 * answers with a job array for a real board and 404 for anything else.
 *
 * So this generates candidate board names, asks each vendor, and keeps only the
 * ones that answer with real open roles. Nothing here reads a page of HTML —
 * that is the whole point, and it is why running this cannot get anybody
 * blocked the way crawling company websites would.
 *
 * Both callers land here: `scripts/seed-boards.ts` for a run by hand, and the
 * ATS worker's daily cron. One implementation, so the CLI is what the schedule
 * runs.
 */

interface KnownCompany {
  id: string;
  name: string;
  careersUrl: string | null;
}

interface YcCompany {
  name: string;
  slug: string;
  status: string;
}

/** A board confirmed against its vendor, and the name it was guessed from. */
export type ConfirmedBoard = BoardHit & { label: string };

export interface SeedBoardsOptions {
  /** Board names, or full careers URLs, one per line. */
  file?: string;
  /** Y Combinator's public company directory. */
  yc?: boolean;
  /** Public job feeds (Himalayas, Arbeitnow, Remote OK, Jobicy). */
  feeds?: boolean;
  /** Companies already in the database with no board yet. */
  companies?: boolean;
  /** Ask only these vendors. Defaults to all of them. */
  vendors?: VendorProbe[];
  /** Stop after this many candidate companies. */
  limit?: number;
  /** Parallel probes. */
  concurrency?: number;
  /** Write the confirmed board names to this file. */
  out?: string;
  /** Print what would be created, write nothing. */
  dryRun?: boolean;
  log?: (msg: string) => void;
}

/**
 * Y Combinator's public company directory.
 *
 * An official, paginated JSON API — the closest thing to a list of "companies
 * worth watching" that exists without scraping anybody. Only active companies
 * are worth probing; the rest are acquisitions and shutdowns.
 */
const ycCompanies = async (
  http: HttpClient,
  limit: number,
): Promise<string[]> => {
  const names: string[] = [];

  for (let page = 1; names.length < limit; page++) {
    const payload = await http
      .json<{
        companies?: YcCompany[];
        totalPages?: number;
      }>(`https://api.ycombinator.com/v0.1/companies?page=${page}`, {
        skipRobots: true,
      })
      .catch(() => null);

    const companies = payload?.companies;
    if (!companies?.length) break;

    for (const company of companies) {
      if (company.status && company.status !== 'Active') continue;
      // The YC slug is usually the company's own handle, which is what an ATS
      // board is named after far more often than the display name is.
      if (company.slug) names.push(company.slug);
      else if (company.name) names.push(company.name);
    }

    if (payload.totalPages && page >= payload.totalPages) break;
  }

  return names.slice(0, limit);
};

interface NameFeed {
  name: string;
  /** The page to ask for, or null once the feed has no more. */
  url: (page: number, cursor: string | null) => string | null;
  names: (payload: unknown) => string[];
  /** Set by feeds that page by cursor rather than by number. */
  cursor?: (payload: unknown) => string | null;
}

const field = (value: unknown, key: string): string | undefined => {
  const entry = (value as Record<string, unknown>)?.[key];
  return typeof entry === 'string' && entry.trim() ? entry : undefined;
};

const listOf = (payload: unknown, key: string): unknown[] => {
  const list = (payload as Record<string, unknown>)?.[key];
  return Array.isArray(list) ? list : [];
};

const fields = (entries: unknown[], ...keys: string[]): string[] =>
  entries.flatMap((entry) =>
    keys
      .map((key) => field(entry, key))
      .filter((value): value is string => Boolean(value)),
  );

/**
 * Public job feeds, read for the company names in them.
 *
 * None of these carries the employer's own apply URL — every one links back to
 * its own site — so what they are worth here is the roster: tens of thousands
 * of companies that are hiring *right now*, which is exactly the population
 * worth spending a board probe on. The probe against the vendor API is what
 * decides whether a name is a board; this only proposes the names.
 *
 * All four answer plain JSON without a key. A feed that starts refusing us is
 * one line to delete — no other source depends on it.
 */
const FEEDS: NameFeed[] = [
  {
    // The largest of the four, and the only one exposing a company slug, which
    // is what an ATS board is usually named after.
    name: 'himalayas',
    // 20 is the documented maximum (https://himalayas.app/api); asking for more
    // is asking for an answer the API never promised. The cursor pages the rest.
    url: (_page, cursor) =>
      `https://himalayas.app/jobs/api?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
    names: (payload) =>
      fields(listOf(payload, 'jobs'), 'companySlug', 'companyName'),
    cursor: (payload) => field(payload, 'nextCursor') ?? null,
  },
  {
    name: 'arbeitnow',
    url: (page) => `https://www.arbeitnow.com/api/job-board-api?page=${page}`,
    names: (payload) => fields(listOf(payload, 'data'), 'company_name'),
  },
  {
    name: 'remoteok',
    // One dump, no pagination — and its first entry is a legal notice, not a
    // job, so a missing company name is normal here.
    url: (page) => (page === 1 ? 'https://remoteok.com/api' : null),
    names: (payload) =>
      fields(Array.isArray(payload) ? payload : [], 'company'),
  },
  {
    name: 'jobicy',
    url: (page) =>
      page === 1 ? 'https://jobicy.com/api/v2/remote-jobs?count=50' : null,
    names: (payload) => fields(listOf(payload, 'jobs'), 'companyName'),
  },
];

/** Company names from every feed, stopping once `limit` names are in hand. */
const feedCompanies = async (
  http: HttpClient,
  limit: number,
  log: (msg: string) => void,
): Promise<string[]> => {
  const names: string[] = [];

  // An even share each, rather than first-come: Himalayas alone could fill any
  // budget, and four rosters overlap less than one of them read four times.
  const share = Math.ceil(limit / FEEDS.length);

  for (const feed of FEEDS) {
    const before = names.length;
    let cursor: string | null = null;

    for (let page = 1; names.length - before < share; page++) {
      const url = feed.url(page, cursor);
      if (!url) break;

      const payload: unknown = await http
        .json<unknown>(url, { skipRobots: true })
        .catch(() => null);
      if (!payload) break;

      const pageNames = feed.names(payload);
      if (!pageNames.length) break;
      names.push(...pageNames);

      if (feed.cursor) {
        cursor = feed.cursor(payload);
        if (!cursor) break;
      }
    }

    log(`  ${feed.name.padEnd(10)} ${names.length - before} names`);
  }

  return names.slice(0, limit);
};

/**
 * The HTTP client every board probe goes through.
 *
 * Its own settings rather than the crawler's: a probe is one cheap request per
 * candidate against a public JSON API, so the pace is a floor that stops a long
 * candidate list arriving as a burst, and the client's per-vendor budget and
 * 429 handling do the rest.
 */
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

/**
 * Finds the boards the requested sources point at and registers them.
 *
 * Safe to re-run: the API call is an upsert, and a board that answers to two
 * spellings of its name is kept once.
 */
export const seedBoards = async (
  options: SeedBoardsOptions,
): Promise<ConfirmedBoard[]> => {
  const log = options.log ?? ((msg: string) => console.log(msg));
  const limit = options.limit ?? 500;
  const vendors = options.vendors ?? VENDORS;
  const http = seedHttpClient(log);

  /** token -> the label to name the company by if it is confirmed. */
  const candidates = new Map<string, string>();
  const add = (token: string, label: string): void => {
    if (token && !candidates.has(token)) candidates.set(token, label);
  };

  /**
   * Full careers URLs an adapter already claims.
   *
   * Not every board can be found by guessing a name. A Workday board is three
   * unknowns — tenant, datacenter and site path — so it is given as a URL and
   * verified by running the adapter that will read it, which is a stronger
   * check than any name probe: it proves the crawler can read the board, not
   * merely that something answers there.
   */
  const directUrls = new Set<string>();

  if (options.file) {
    for (const rawLine of readFileSync(options.file, 'utf8').split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      // A URL an adapter recognises is verified as a whole, not reduced to a
      // name — which is the only way a Workday tenant can be expressed.
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
        // A company already pointed at a board needs nothing from this.
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
            // Whatever the adapter uses to identify the board is what names the
            // company, for the same reason a probed board is named by its token.
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

  // A board answers to its name whatever the case, so probing both "everai"
  // and the company's own "EverAI" confirms one board twice — and each spelling
  // would be registered as its own company. One hit per board wins, the plain
  // lowercase spelling for preference.
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

  const byPlatform = new Map<string, number>();
  for (const hit of confirmed) {
    byPlatform.set(hit.platform, (byPlatform.get(hit.platform) ?? 0) + 1);
  }

  log(`\n${confirmed.length} confirmed boards:`);
  for (const hit of confirmed.slice(0, 60)) {
    log(
      `  ${hit.platform.padEnd(16)} ${hit.token.padEnd(28)} ${String(hit.jobCount).padStart(5)} offers`,
    );
  }
  if (confirmed.length > 60) log(`  … and ${confirmed.length - 60} more`);
  log(
    `\nBy platform: ${[...byPlatform.entries()]
      .map(([platform, count]) => `${platform} ${count}`)
      .join(', ')}`,
  );
  log(
    `Total open roles behind them: ${confirmed.reduce((sum, hit) => sum + hit.jobCount, 0)}`,
  );

  if (options.out && confirmed.length) {
    // Written as board names so the file can be fed straight back in with
    // --file, which is how a verified list is grown rather than regenerated.
    writeFileSync(
      options.out,
      `${[
        '# Board names confirmed against the vendor API.',
        '# Regenerate or extend with:',
        `#   pnpm --filter worker seed:boards -- --file ${options.out}`,
        '',
        ...confirmed.map((hit) =>
          // Written in the form it was verified in, so the file round-trips.
          hit.careersUrl.includes('myworkdayjobs.com')
            ? hit.careersUrl
            : hit.token,
        ),
      ].join('\n')}\n`,
      'utf8',
    );
    log(`\nWrote ${confirmed.length} board names to ${options.out}`);
  }

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
      // Named after the board rather than the label we guessed from: a
      // candidate that happens to hit somebody else's board must not end up
      // labelled with the wrong company's name.
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
