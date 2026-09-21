import type { HttpClient } from '@/infrastructure/http/http';

interface NameFeed {
  name: string;
  url: (page: number, cursor: string | null) => string | null;
  names: (payload: unknown) => string[];
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

const FEEDS: NameFeed[] = [
  {
    name: 'himalayas',
    // 20 is the documented maximum.
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

export const feedCompanies = async (
  http: HttpClient,
  limit: number,
  log: (msg: string) => void,
): Promise<string[]> => {
  const names: string[] = [];

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
