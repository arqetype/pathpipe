export interface VendorProbe {
  platform: string;
  url: (token: string) => string;
  careersUrl: (token: string) => string;
  countJobs: (payload: unknown) => number;
  countJobsInBody?: (body: string) => number;
}

const asArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

const countKey =
  (key: string) =>
  (payload: unknown): number => {
    if (!payload || typeof payload !== 'object') return 0;
    return asArray((payload as Record<string, unknown>)[key]).length;
  };

// Ordered by hit rate; Personio throttled.
export const VENDORS: VendorProbe[] = [
  {
    platform: 'ashby',
    url: (token) =>
      `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(token)}`,
    careersUrl: (token) => `https://jobs.ashbyhq.com/${token}`,
    countJobs: countKey('jobs'),
  },
  {
    platform: 'greenhouse',
    url: (token) =>
      `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs`,
    careersUrl: (token) => `https://job-boards.greenhouse.io/${token}`,
    countJobs: countKey('jobs'),
  },
  {
    platform: 'lever',
    url: (token) =>
      `https://api.lever.co/v0/postings/${encodeURIComponent(token)}?mode=json&limit=1`,
    careersUrl: (token) => `https://jobs.lever.co/${token}`,
    // Lever answers with a bare array.
    countJobs: (payload) => asArray(payload).length,
  },
  {
    platform: 'teamtailor',
    url: (token) =>
      `https://${encodeURIComponent(token)}.teamtailor.com/jobs.json`,
    careersUrl: (token) => `https://${token}.teamtailor.com/jobs`,
    countJobs: countKey('items'),
  },
  {
    platform: 'smartrecruiters',
    url: (token) =>
      `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(token)}/postings?limit=1`,
    careersUrl: (token) => `https://careers.smartrecruiters.com/${token}`,
    countJobs: (payload) => {
      if (!payload || typeof payload !== 'object') return 0;
      const record = payload as Record<string, unknown>;
      const found = record.totalFound;
      if (typeof found === 'number') return found;
      return asArray(record.content).length;
    },
  },
  {
    platform: 'personio',
    // Personio serves XML, not JSON.
    url: (token) => `https://${encodeURIComponent(token)}.jobs.personio.de/xml`,
    careersUrl: (token) => `https://${token}.jobs.personio.de`,
    countJobs: () => 0,
    countJobsInBody: (body) => (body.match(/<position>/gi) ?? []).length,
  },
];
