import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { HttpClient } from '@/domain/scraping/http';
import { apiClient } from '@/infrastructure/api/api.client';
import { configService } from '@/infrastructure/config/config.service';
import { createLimiter } from '@/domain/scraping/limiter';
import {
  VENDORS,
  candidateTokens,
  probeToken,
  tokenFromInput,
  type BoardHit,
  type VendorProbe,
} from '@/domain/scraping/vendors';
import { JobDiscoveryService } from '@/domain/scraping/pipeline';
import { matchAdapterByUrl } from '@/domain/scraping/registry';

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
 *   pnpm --filter worker seed:boards -- --file src/scripts/boards/greenhouse.txt
 *   pnpm --filter worker seed:boards -- --yc --limit 400 --dry-run
 *   pnpm --filter worker seed:boards -- --companies --platform lever
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

const usage = `
Usage: pnpm --filter worker seed:boards -- [options]

Sources (at least one):
  --file <path>       Board names, or full careers URLs, one per line
  --yc                Y Combinator's public company directory
  --companies         Companies already in the database with no board yet

Options:
  --platform <name>   Only ask one vendor (${VENDORS.map((v) => v.platform).join(', ')})
  --limit <n>         Stop after n candidate companies (default 500)
  --concurrency <n>   Parallel probes (default 4)
  --out <path>        Write the confirmed board names to a file
  --dry-run           Print what would be created, write nothing
  --help              Show this
`;

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

const main = async (): Promise<void> => {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.length === 0) {
    console.log(usage);
    return;
  }

  const flag = (name: string): string | undefined => {
    const index = argv.indexOf(name);
    return index >= 0 ? argv[index + 1] : undefined;
  };

  const dryRun = argv.includes('--dry-run');
  const limit = Number.parseInt(flag('--limit') ?? '500', 10) || 500;
  const concurrency = Number.parseInt(flag('--concurrency') ?? '4', 10) || 4;

  const platformName = flag('--platform');
  const vendors: VendorProbe[] = platformName
    ? VENDORS.filter((vendor) => vendor.platform === platformName)
    : VENDORS;
  if (!vendors.length) {
    console.error(`Unknown platform: ${platformName}`);
    console.log(usage);
    process.exitCode = 1;
    return;
  }

  const scraper = configService.get('scraper');
  const http = new HttpClient({
    userAgent: scraper.userAgent,
    // One board lookup per candidate against public JSON APIs. The floor stops
    // a long candidate list arriving as a burst, and the client's own per-host
    // budget and 429 handling do the rest.
    perHostDelayMs: 200,
    respectRobots: false,
    maxRequestsPerHost: 20_000,
    log: (data, msg) => {
      if (msg.includes('backed off') || msg.includes('Rate limited')) {
        console.warn(`  ! ${msg} ${JSON.stringify(data)}`);
      }
    },
  });

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

  const filePath = flag('--file');
  if (filePath) {
    if (!existsSync(filePath)) {
      console.error(`No such file: ${filePath}`);
      process.exitCode = 1;
      return;
    }
    for (const rawLine of readFileSync(filePath, 'utf8').split('\n')) {
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
    console.log(
      `${candidates.size} board names and ${directUrls.size} careers URLs from ${filePath}`,
    );
  }

  if (argv.includes('--yc')) {
    const before = candidates.size;
    for (const name of await ycCompanies(http, limit)) {
      for (const token of candidateTokens(name)) add(token, name);
    }
    console.log(
      `${candidates.size - before} candidates from Y Combinator's directory`,
    );
  }

  if (argv.includes('--companies')) {
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
      console.log(
        `${candidates.size - before} candidates from companies we already know`,
      );
    } catch (err) {
      console.warn('Could not read the company list from the API:', err);
    }
  }

  if (!candidates.size && !directUrls.size) {
    console.log(usage);
    console.log('Nothing to check — pass at least one source.');
    return;
  }

  const limiter = createLimiter(concurrency);
  const confirmed: Array<BoardHit & { label: string }> = [];
  let checked = 0;

  if (directUrls.size) {
    console.log(
      `Reading ${directUrls.size} careers URLs through their adapter…`,
    );
    const discovery = new JobDiscoveryService({ http, log: () => {} });

    await Promise.all(
      [...directUrls].map((url) =>
        limiter(async () => {
          const result = await discovery.discover(url);
          if (!result.jobs.length) {
            console.warn(`  ! no offers read from ${url}`);
            return;
          }
          const match = matchAdapterByUrl(url);
          const params = match?.target.params ?? {};
          confirmed.push({
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
    console.log(
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
        if (checked % 100 === 0) {
          console.log(`  …${checked}/${candidates.size}`);
        }
        if (hit) confirmed.push({ ...hit, label });
      }),
    ),
  );

  confirmed.sort((a, b) => b.jobCount - a.jobCount);

  const byPlatform = new Map<string, number>();
  for (const hit of confirmed) {
    byPlatform.set(hit.platform, (byPlatform.get(hit.platform) ?? 0) + 1);
  }

  console.log(`\n${confirmed.length} confirmed boards:`);
  for (const hit of confirmed.slice(0, 60)) {
    console.log(
      `  ${hit.platform.padEnd(16)} ${hit.token.padEnd(28)} ${String(hit.jobCount).padStart(5)} offers`,
    );
  }
  if (confirmed.length > 60) {
    console.log(`  … and ${confirmed.length - 60} more`);
  }
  console.log(
    `\nBy platform: ${[...byPlatform.entries()]
      .map(([platform, count]) => `${platform} ${count}`)
      .join(', ')}`,
  );
  console.log(
    `Total open roles behind them: ${confirmed.reduce((sum, hit) => sum + hit.jobCount, 0)}`,
  );

  const outPath = flag('--out');
  if (outPath && confirmed.length) {
    // Written as board names so the file can be fed straight back in with
    // --file, which is how a verified list is grown rather than regenerated.
    writeFileSync(
      outPath,
      `${[
        '# Board names confirmed against the vendor API.',
        '# Regenerate or extend with:',
        `#   pnpm --filter worker seed:boards -- --file ${outPath}`,
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
    console.log(`\nWrote ${confirmed.length} board names to ${outPath}`);
  }

  if (!confirmed.length) return;

  if (dryRun) {
    console.log('\n--dry-run: nothing written.');
    return;
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

  console.log(
    `\nSeeded: ${response.created} created, ${response.updated} updated, ${response.unchanged} left alone.`,
  );
  console.log('The next full crawl will pick their offers up.');
};

void main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
