import type { ScrapedJob } from './types';
import { jobKey, normalizeUrl } from './url';
import { formatLocations, parseLocations } from './location';
import { classifyDomain, classifySeniority } from './classify';
import { decodeEntities, looksLikeHtml, sanitizeHtml } from './sanitize';

/**
 * Titles that show up in navigation, footers and consent banners. Kept as exact
 * matches on the normalised title, so real jobs containing these words survive.
 */
const NAV_TITLES = new Set([
  'sign out',
  'sign in',
  'sign up',
  'log in',
  'log out',
  'login',
  'logout',
  'register',
  'settings',
  'my profile',
  'profile',
  'my applications',
  'applications',
  'account security',
  'my account',
  'account',
  'dashboard',
  'privacy',
  'privacy policy',
  'terms',
  'terms of use',
  'terms and conditions',
  'cookies',
  'cookie policy',
  'legal',
  'imprint',
  'accessibility',
  'mentions legales',
  'mentions légales',
  'confidentialite',
  'confidentialité',
  'politique de confidentialite',
  'protection des donnees',
  'protection des données',
  'contact',
  'contact us',
  'nous contacter',
  'help',
  'support',
  'faq',
  'about',
  'about us',
  'a propos',
  'à propos',
  'newsletter',
  'home',
  'accueil',
  'blog',
  'news',
  'press',
  'presse',
  'skip to main content',
  'skip to content',
  'main menu',
  'menu',
  'navigation',
  'footer',
  'back to top',
  'load more',
  'show more',
  'view all',
  'see all',
  'view all jobs',
  'all jobs',
  'all openings',
  'search jobs',
  'job search',
  'careers',
  'carrieres',
  'carrières',
  'join us',
  'join our team',
  'work with us',
  'working at',
  'life at',
  'our culture',
  'culture',
  'benefits',
  'avantages',
  'diversity',
  'inclusion',
  'our values',
  'values',
  'leadership principles',
  'principes de leadership',
  'interview tips',
  'conseils pour reussir vos entretiens',
  'inclusive experiences',
  'accommodations',
  'amenagements',
  'aménagements',
  'military careers',
  'carrieres militaires',
  'verify status',
  'verifier le statut',
  'my candidature',
  'ma candidature',
  'candidature spontanee',
  'candidature spontanée',
  'talent community',
  'talent pool',
  'job alerts',
  'create alert',
  'apply',
  'apply now',
  'postuler',
  'en savoir plus',
  'learn more',
  'read more',
  'next',
  'previous',
  'page suivante',
  'linkedin',
  'twitter',
  'facebook',
  'instagram',
  'youtube',
  'github',
  'departments',
  'locations',
  'teams',
  'offices',
  'students',
  'internships',
  'graduates',
  'events',
  'faq candidats',
  'espace candidat',
]);

const NAV_PREFIXES =
  /^(?:sign\s|log\s|my\s|our\s|all\s|view\s|see\s|browse\s|search\s|back\s|go\s|skip\s|share\s|follow\s|subscribe\s|download\s|learn\s|read\s|discover\s|explore\s|why\s|how\s|what\s|meet\s|about\s|contact\s|privacy|cookie|terms|legal|mentions|conditions|politique)/i;

export const stripHtml = (value: string): string =>
  decodeEntities(
    value
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[ \t ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const foldAccents = (value: string): string =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const cleanTitle = (raw: string): string =>
  decodeEntities(raw)
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–—•|/,:]+/, '')
    .replace(/[\s\-–—•|/,:]+$/, '')
    // Badges and counters that boards append to the link text.
    .replace(/\b(new|nouveau|urgent|hot|featured)\s*!?$/i, '')
    .replace(/\(\s*\d+\s*\)$/, '')
    .trim();

/**
 * Does this look like an actual job title rather than a navigation label?
 *
 * Deliberately permissive on wording (job titles are wildly varied) and strict
 * on shape: nav labels are short, generic, or sentence-like.
 */
export const isPlausibleTitle = (raw: string): boolean => {
  const title = cleanTitle(raw);
  if (title.length < 3 || title.length > 160) return false;
  if (!/\p{L}/u.test(title)) return false;

  const folded = foldAccents(title.toLowerCase()).replace(/\s+/g, ' ').trim();
  if (NAV_TITLES.has(folded)) return false;
  if (NAV_PREFIXES.test(folded) && folded.split(' ').length <= 4) return false;
  // Sentences and questions are copy, not titles.
  if (/[.!?]$/.test(title) && title.split(' ').length > 6) return false;
  if (title.split(/\s+/).length > 22) return false;
  if (/^\d+$/.test(title)) return false;
  if (/^(share|apply|postuler|voir|view|read)\b/i.test(folded)) return false;
  return true;
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  '€': 'EUR',
  $: 'USD',
  '£': 'GBP',
  '¥': 'JPY',
  CHF: 'CHF',
};

/**
 * Best-effort salary range from free text, e.g. "€45,000 - €55,000 per year"
 * or "$120k–$150k". Returns nothing rather than guessing wrong.
 */
export const parseSalary = (
  text: string | undefined,
): Pick<ScrapedJob, 'salaryMin' | 'salaryMax' | 'salaryCurrency'> => {
  if (!text) return {};
  const match =
    /([€$£¥]|CHF)?\s*(\d{1,3}(?:[.,\s]\d{3})+|\d{2,3})\s*(k)?\s*(?:-|–|—|to|à|bis)\s*([€$£¥]|CHF)?\s*(\d{1,3}(?:[.,\s]\d{3})+|\d{2,3})\s*(k)?/i.exec(
      text,
    );
  if (!match) return {};

  const toNumber = (value: string, thousands: boolean): number | undefined => {
    const digits = Number.parseInt(value.replace(/[.,\s]/g, ''), 10);
    if (!Number.isFinite(digits)) return undefined;
    const scaled = thousands ? digits * 1000 : digits;
    // Reject values that are clearly not annual or monthly pay.
    if (scaled < 1000 || scaled > 10_000_000) return undefined;
    return scaled;
  };

  const min = toNumber(match[2] ?? '', Boolean(match[3]));
  const max = toNumber(match[5] ?? '', Boolean(match[6]));
  if (min === undefined || max === undefined || max < min) return {};

  const symbol = match[1] ?? match[4];
  return {
    salaryMin: min,
    salaryMax: max,
    salaryCurrency: symbol ? CURRENCY_SYMBOLS[symbol] : undefined,
  };
};

export const isRemote = (...values: Array<string | undefined>): boolean =>
  values.some((value) =>
    value
      ? /\b(remote|télétravail|teletravail|work from home|wfh|anywhere)\b/i.test(
          value,
        )
      : false,
  );

export const cleanLocation = (raw: string | undefined): string | undefined => {
  if (!raw) return undefined;
  const value = decodeEntities(raw)
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–—•|,:]+|[\s\-–—•|,:]+$/g, '')
    .trim();
  if (!value || value.length > 120) return undefined;
  if (/^(location|lieu|standort|ubicación)$/i.test(value)) return undefined;
  return value;
};

const toIsoDate = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'number') {
    const ms = value > 1e12 ? value : value * 1000;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }
  if (typeof value !== 'string') return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  // Guard against nonsense dates from bad parses. Expiry dates are legitimately
  // in the future, so the upper bound has to leave room for them.
  const year = date.getUTCFullYear();
  if (year < 2000 || year > new Date().getUTCFullYear() + 5) return undefined;
  return date.toISOString();
};

export const normalizeJob = (job: ScrapedJob): ScrapedJob | null => {
  const title = cleanTitle(job.title ?? '');
  if (!isPlausibleTitle(title)) return null;
  const url = normalizeUrl(job.url ?? '');
  if (!/^https?:\/\//i.test(url)) return null;

  // Boards put markup in whichever field they feel like; whatever carries tags
  // becomes the rendered copy, and the plain text is derived from it.
  const rawHtml =
    job.descriptionHtml ??
    (job.description && looksLikeHtml(job.description)
      ? job.description
      : undefined);
  const descriptionHtml = rawHtml
    ? sanitizeHtml(rawHtml).slice(0, 60000) || undefined
    : undefined;
  const plainSource = job.description ?? rawHtml;
  const description = plainSource
    ? stripHtml(plainSource).slice(0, 20000) || undefined
    : undefined;

  // Places first: the display label is derived from them, so a board that names
  // three cities reads as three cities everywhere.
  const parsedLocations = parseLocations([
    ...(job.locations ?? []),
    job.location,
  ]);
  const location =
    formatLocations(parsedLocations) ?? cleanLocation(job.location);
  const department = job.department ? cleanLocation(job.department) : undefined;
  const salary =
    job.salaryMin || job.salaryMax
      ? {
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          salaryCurrency: job.salaryCurrency,
        }
      : parseSalary(description?.slice(0, 4000));

  return {
    externalId: job.externalId ? String(job.externalId) : undefined,
    title,
    url,
    description,
    descriptionHtml,
    location,
    parsedLocations,
    department,
    // Classified once here rather than guessed at on every query.
    domain: job.domain ?? classifyDomain(title, department),
    seniority: job.seniority ?? classifySeniority(title),
    employmentType: normalizeEmploymentType(
      job.employmentType,
      title,
      description?.slice(0, 400),
    ),
    remote: job.remote ?? isRemote(title, location, job.employmentType),
    remoteType:
      job.remoteType ??
      // A place the board itself labelled "Remote" or "Hybrid" outranks any
      // guess made from the wording of the title.
      parsedLocations.find((place) => place.remote)?.remote ??
      normalizeRemoteType(job.remote, title, location, job.employmentType),
    salaryMin: salary.salaryMin ?? undefined,
    salaryMax: salary.salaryMax ?? undefined,
    salaryCurrency: salary.salaryCurrency ?? undefined,
    postedAt: toIsoDate(job.postedAt),
    validThrough: toIsoDate(job.validThrough),
  };
};

/** Number of populated optional fields — used to keep the richest duplicate. */
const richness = (job: ScrapedJob): number =>
  [
    job.description,
    job.descriptionHtml,
    job.location,
    job.parsedLocations?.length,
    job.department,
    job.postedAt,
    job.validThrough,
    job.salaryMin,
    job.employmentType,
    job.remoteType,
    job.externalId,
  ].filter(Boolean).length;

export const normalizeJobs = (
  jobs: ScrapedJob[],
  platform?: string | null,
): ScrapedJob[] => {
  const byKey = new Map<string, ScrapedJob>();
  for (const raw of jobs) {
    const job = normalizeJob(raw);
    if (!job) continue;
    const key = jobKey(job, platform);
    const existing = byKey.get(key);
    if (!existing || richness(job) > richness(existing)) byKey.set(key, job);
  }
  return [...byKey.values()];
};

/** Raw employment wording, folded into the values the UI filters on. */
const EMPLOYMENT_PATTERNS: Array<[RegExp, string]> = [
  [
    /\b(intern|interns|internship|stage|stagiaire|praktikum|becario|estagio)\b/i,
    'INTERNSHIP',
  ],
  [
    /\b(apprentice|apprenticeship|alternance|alternant|apprenti|contrat pro|professionnalisation|ausbildung)\b/i,
    'APPRENTICESHIP',
  ],
  [
    /\b(freelance|independent contractor|auto[- ]entrepreneur|self[- ]employed)\b/i,
    'FREELANCE',
  ],
  [/\b(volunteer|benevolat|service civique)\b/i, 'VOLUNTEER'],
  [
    /\b(temporary|temp|interim|seasonal|saisonnier|cdd|fixed[- ]term|befristet)\b/i,
    'TEMPORARY',
  ],
  [/\b(contract|contractor|contract to hire|w2|c2c)\b/i, 'CONTRACT'],
  [/\b(part[\s_-]?time|temps partiel|teilzeit|medio tiempo)\b/i, 'PART_TIME'],
  [
    /\b(full[\s_-]?time|temps plein|vollzeit|cdi|permanent|regular|tiempo completo)\b/i,
    'FULL_TIME',
  ],
];

/**
 * FULL_TIME / PART_TIME / … from whatever the board wrote.
 *
 * Values are tried in order of specificity — "full-time internship" is an
 * internship — and accents are folded first so "stagiaire" and "stagiaîre"
 * behave the same.
 */
export const normalizeEmploymentType = (
  ...values: Array<string | undefined | null>
): string | undefined => {
  for (const value of values) {
    if (!value) continue;
    const text = foldAccents(String(value)).replace(/_/g, ' ');
    for (const [pattern, result] of EMPLOYMENT_PATTERNS) {
      if (pattern.test(text)) return result;
    }
  }
  return undefined;
};

const HYBRID_PATTERN =
  /\b(hybrid|hybride|partially remote|remote[- ]friendly|flexible office|\d\s*days?\s*(a|per)\s*week\s*(in|at)\s*(the\s*)?office)\b/i;
const FULLY_REMOTE_PATTERN =
  /\b(fully remote|100% remote|remote[- ]first|remote[- ]only|full remote|teletravail total|work from anywhere)\b/i;
const ON_SITE_PATTERN =
  /\b(on[- ]?site|onsite|in[- ]office|in[- ]person|presentiel|vor ort)\b/i;

/**
 * ON_SITE / HYBRID / REMOTE from whatever signals the board gave.
 *
 * Hybrid is tested first: "hybrid remote" is hybrid, and boards write that
 * pairing both ways round.
 */
export const normalizeRemoteType = (
  flag: boolean | undefined,
  ...values: Array<string | undefined | null>
): string | undefined => {
  const text = foldAccents(values.filter(Boolean).join(' '));
  if (HYBRID_PATTERN.test(text)) return 'HYBRID';
  if (FULLY_REMOTE_PATTERN.test(text)) return 'REMOTE';
  if (flag === true) return 'REMOTE';
  if (ON_SITE_PATTERN.test(text)) return 'ON_SITE';
  if (isRemote(text)) return 'REMOTE';
  return undefined;
};
