import type { HttpFetcher } from './types';

/**
 * Deciding which ATS a company uses, without fetching a single page of HTML.
 *
 * Every vendor here answers a public JSON endpoint keyed by a board name: real
 * board, real jobs, 200; anything else, 404. That makes "does this company use
 * Lever?" a question one cheap request settles, which is the whole reason
 * discovery can work without crawling company websites.
 *
 * These are the same vendors `registry.ts` has adapters for — a board is only
 * worth finding if something can read it afterwards.
 */

export interface VendorProbe {
  platform: string;
  /** The public endpoint that confirms a board exists. */
  url: (token: string) => string;
  /** The careers URL stored on the company once confirmed. */
  careersUrl: (token: string) => string;
  /** How many open roles the payload describes, or 0 when it is not a board. */
  countJobs: (payload: unknown) => number;
  /**
   * Set instead of relying on `countJobs` when the vendor answers with
   * something other than JSON. `countJobs` is then never called.
   */
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

/**
 * Ordered by how often a hit is expected, because probing stops at the first
 * one that answers: the cheapest run is the one that guesses right early.
 *
 * Personio comes last for a second reason: it is the one vendor throttled to a
 * multi-second gap, so every miss on it costs more wall clock than a miss
 * anywhere else.
 */
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
    // Lever answers with a bare array rather than an envelope.
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
    // Personio serves XML, so the positions are counted in the document rather
    // than in a parsed payload. A tenant that exists but has nothing open
    // answers `<workzag-jobs></workzag-jobs>`, which counts as zero and is
    // therefore not a hit — same rule as every other vendor here.
    url: (token) => `https://${encodeURIComponent(token)}.jobs.personio.de/xml`,
    careersUrl: (token) => `https://${token}.jobs.personio.de`,
    countJobs: () => 0,
    countJobsInBody: (body) => (body.match(/<position>/gi) ?? []).length,
  },
];

export interface BoardHit {
  platform: string;
  token: string;
  careersUrl: string;
  jobCount: number;
}

/** Open roles the vendor reports for this token, 0 when it is not a board. */
const countFor = async (
  http: HttpFetcher,
  vendor: VendorProbe,
  token: string,
): Promise<number> => {
  const url = vendor.url(token);

  if (vendor.countJobsInBody) {
    const response = await http
      .request(url, { skipRobots: true })
      .catch(() => null);
    if (!response?.ok || !response.body) return 0;
    return vendor.countJobsInBody(response.body);
  }

  const payload = await http
    .json<unknown>(url, { skipRobots: true })
    .catch(() => null);
  return payload ? vendor.countJobs(payload) : 0;
};

/**
 * The board a token names, if any vendor claims it.
 *
 * Stops at the first vendor that answers with open roles — a company is on one
 * ATS, so there is nothing to gain from asking the rest.
 *
 * A board with no open roles is not treated as a hit: there is nothing to
 * crawl, and nothing in the answer to show the token belongs to the company we
 * guessed rather than to somebody else with a similar name.
 */
export const probeToken = async (
  http: HttpFetcher,
  token: string,
  vendors: VendorProbe[] = VENDORS,
): Promise<BoardHit | null> => {
  for (const vendor of vendors) {
    const jobCount = await countFor(http, vendor, token);
    if (jobCount > 0) {
      return {
        platform: vendor.platform,
        token,
        careersUrl: vendor.careersUrl(token),
        jobCount,
      };
    }
  }
  return null;
};

/**
 * Words too generic to probe on their own.
 *
 * A one-word guess like "agency" or "atlas" will find *a* board — just not the
 * company we were asking about. Seeding somebody else's board under a YC
 * startup's name is worse than missing it, so these are never tried alone.
 */
const GENERIC_TOKENS = new Set([
  'agency',
  'agent',
  'atlas',
  'impact',
  'intelligence',
  'mosaic',
  'guild',
  'rise',
  'lambda',
  'nex',
  'trident',
  'praxis',
  'whitespace',
  'tenor',
  'arlo',
  'bernard',
  'apex',
  'nova',
  'orbit',
  'pulse',
  'spark',
  'vertex',
  'zenith',
  'summit',
  'horizon',
  'beacon',
  'bridge',
  'catalyst',
  'compass',
  'element',
  'flow',
  'forge',
  'fusion',
  'genesis',
  'harbor',
  'helix',
  'ignite',
  'jupiter',
  'kernel',
  'lattice',
  'legend',
  'lumen',
  'matrix',
  'meridian',
  'nexus',
  'nimbus',
  'onyx',
  'oracle',
  'origin',
  'phoenix',
  'pillar',
  'prism',
  'quest',
  'quantum',
  'radar',
  'relay',
  'ripple',
  'sage',
  'sentinel',
  'signal',
  'sigma',
  'solaris',
  'sonar',
  'stellar',
  'strata',
  'summit',
  'tempo',
  'titan',
  'union',
  'vector',
  'venture',
  'vista',
  'vault',
  'zenith',
  'labs',
  'studio',
  'group',
  'global',
  'digital',
  'systems',
  'solutions',
  'technologies',
  'ventures',
  'partners',
  'health',
  'energy',
  'capital',
  'data',
  'cloud',
  'security',
  'robotics',
  'medical',
  'financial',
  'insurance',
  'software',
  'platform',
]);

/**
 * Board names worth trying for a company called `name`.
 *
 * Board names are chosen by the customer, so these are guesses — but each is
 * settled by one cheap request, and these shapes are what companies pick in
 * practice.
 *
 * Deliberately conservative: the company's *whole* name, not its first word. A
 * first-word guess turns "Cosmic Robotics" into "cosmic" and finds whoever owns
 * that board instead — and a confidently wrong company is worse than a missing
 * one, because nothing downstream will ever question it.
 */
export const candidateTokens = (name: string): string[] => {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim();
  if (!base) return [];

  const words = base.split(/[\s-]+/).filter(Boolean);
  const meaningful = words.filter(
    (word) =>
      ![
        'inc',
        'llc',
        'ltd',
        'limited',
        'corp',
        'sa',
        'sas',
        'gmbh',
        'bv',
        'ag',
        'the',
      ].includes(word),
  );
  const parts = meaningful.length ? meaningful : words;

  const tokens = [
    ...new Set([
      parts.join(''),
      parts.join('-'),
      // Some boards keep the company's own capitalisation.
      name.replace(/[^A-Za-z0-9]/g, ''),
    ]),
  ];

  return tokens.filter((token) => {
    if (token.length < 3 || token.length > 60) return false;
    // A single generic word is a coin flip on whose board it finds; a
    // multi-word name that happens to contain one is fine.
    if (parts.length === 1 && GENERIC_TOKENS.has(token.toLowerCase())) {
      return false;
    }
    return true;
  });
};

/** A pasted board URL is accepted anywhere a board name is. */
export const tokenFromInput = (raw: string): string | null => {
  const value = raw.trim();
  if (!value || value.startsWith('#')) return null;

  const patterns = [
    /jobs\.ashbyhq\.com\/([A-Za-z0-9._-]+)/i,
    /job-board\/([A-Za-z0-9._-]+)/i,
    /boards\.greenhouse\.io\/([A-Za-z0-9._-]+)/i,
    /job-boards\.greenhouse\.io\/([A-Za-z0-9._-]+)/i,
    /jobs\.lever\.co\/([A-Za-z0-9._-]+)/i,
    /careers\.smartrecruiters\.com\/([A-Za-z0-9._-]+)/i,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(value);
    if (match?.[1]) return match[1];
  }

  return /^[A-Za-z0-9._-]+$/.test(value) ? value : null;
};
