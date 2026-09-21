import { classifyDomain, classifySeniority } from '@repo/db/parsing/classify';
import { parseLocations } from '@repo/db/parsing/location';
import { EmploymentType } from '@repo/db/types/job-posting/employment-type';
import {
  SeniorityLevel,
  WorkDomain,
} from '@repo/db/types/job-posting/work-domain';
import { extractResumeKeywords } from './resume';

/**
 * Reading a whole job profile out of a CV.
 *
 * Filling the profile by hand is the step people skip, and a profile nobody
 * filled ranks nothing — so everything that can be read off the document is
 * read off it: the roles somebody has held, what part of software those roles
 * were in, how senior they are, the contracts they have worked under, and where
 * they live.
 *
 * It stays a suggestion. Every field is applied only where the user left a
 * blank, because a CV describes the past and the profile describes what
 * somebody wants next — those agree often enough to be worth proposing and not
 * often enough to be worth overwriting.
 *
 * The same parsers the crawler uses do the work here (`classify`, `location`),
 * which is the point: a city read from a CV has to be spelled the way the
 * offers spell it, or it matches nothing.
 */
export interface ResumeProfile {
  titles: string[];
  domains: WorkDomain[];
  seniorities: SeniorityLevel[];
  employmentTypes: EmploymentType[];
  cities: string[];
  /** ISO 3166-1 alpha-2. */
  countries: string[];
  keywords: string[];
  /** Whole years between the first and last date the experience section names. */
  yearsOfExperience: number | null;
}

const fold = (value: string): string =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Headings that open the part of a CV describing jobs held. */
const EXPERIENCE_HEADING =
  /^(work\s+|professional\s+)?(experience|experiences|employment|emploi|exp[eé]riences?(\s+professionnelles?)?|parcours(\s+professionnel)?|career)\s*:?\s*$/i;

/** Headings that close it — anything that is not a job. */
const OTHER_HEADING =
  /^(education|formation|dipl[oô]mes?|skills|comp[eé]tences|projects|projets|languages|langues|certifications?|interests|centres?\s+d.int[eé]r[eê]ts?|publications|awards|r[eé]f[eé]rences|volunteer|associatif)\b/i;

/** Lines that describe a school, not a job. */
const SCHOOL =
  /\b(universit|école|ecole|school|college|institut|lyc[eé]e|bachelor|master['’]?s?|licence|bts|but\b|dut\b|mba|phd|doctorat|dipl[oô]m|degree|baccalaur)\b/i;

/** What somebody has worked as, in the words their CV used. */
const TITLE_SEPARATORS = /\s[–—|·•@]\s|\s[-–]\s|\s\bchez\b\s|\s\bat\b\s|,\s/;

const DATE_RANGE =
  /\b((?:19|20)\d{2})\s*(?:[-–—]|to|à|a|jusqu'?[àa]|until)\s*((?:19|20)\d{2}|pr[ée]sent|current|today|aujourd'?hui|now|en cours|ongoing)\b/gi;

const CONTRACT_PATTERNS: Array<[RegExp, EmploymentType]> = [
  [
    /\b(alternan\w*|apprenti\w*|apprenticeship|contrat\s+pro\w*|ausbildung|work[-\s]?study)\b/i,
    EmploymentType.APPRENTICESHIP,
  ],
  [
    /\b(stage|stagiaire|internship|intern\b|praktikum|working\s+student)\b/i,
    EmploymentType.INTERNSHIP,
  ],
  [
    /\b(freelance|auto[-\s]?entrepreneur|independent\s+contractor|self[-\s]?employed)\b/i,
    EmploymentType.FREELANCE,
  ],
  [
    /\b(cdi|permanent|full[-\s]?time|temps\s+plein)\b/i,
    EmploymentType.FULL_TIME,
  ],
  [
    /\b(cdd|fixed[-\s]?term|temporary|int[eé]rim|mission)\b/i,
    EmploymentType.TEMPORARY,
  ],
  [/\b(part[-\s]?time|temps\s+partiel)\b/i, EmploymentType.PART_TIME],
];

/** Somebody still studying is looking for the contracts a student can take. */
const STUDENT =
  /\b([eé]tudiant\w*|student|[eé]l[eè]ve\s+ing[eé]nieur|engineering\s+student|en\s+formation|m1\b|m2\b|master\s*[12]\b|cycle\s+ing[eé]nieur)\b/i;

const LOCATION_HINT =
  /^(location|localisation|adresse|address|based\s+in|bas[eé]\s+[àa]|ville|city)\s*:?\s*/i;

/** Contact noise that would otherwise be read as a place. */
const CONTACT_NOISE =
  /(\S+@\S+|https?:\/\/\S+|(?:www|linkedin|github)\.\S+|\+?\d[\d\s().-]{7,})/gi;

const lines = (text: string): string[] =>
  text
    .split('\n')
    .map((line) => line.replace(/^[\s•·*\-–—]+/, '').trim())
    .filter(Boolean);

/** The lines between "Experience" and whatever heading comes next. */
const experienceLines = (all: string[]): string[] => {
  const start = all.findIndex((line) => EXPERIENCE_HEADING.test(line));
  if (start < 0) return [];
  const rest = all.slice(start + 1);
  const end = rest.findIndex((line) => OTHER_HEADING.test(line));
  return end < 0 ? rest : rest.slice(0, end);
};

/** "Senior Backend Engineer — Acme (2021-2024)" → "Senior Backend Engineer". */
const cleanTitle = (line: string): string =>
  line
    .split(TITLE_SEPARATORS)[0]
    .replace(/\((?:[^)]*)\)/g, ' ')
    .replace(/\b(?:19|20)\d{2}\b/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/[,;:.\s]+$/, '')
    .trim();

/**
 * A line that names a job somebody held.
 *
 * The test is whether the domain classifier recognises it: that is the same
 * question the crawler asks of an offer's title, so a line it can read is a
 * line that will match offers. Everything long, punctuated like prose, or
 * plainly about a school is dropped first.
 */
const titleFrom = (line: string): string | null => {
  if (line.length > 90 || SCHOOL.test(line)) return null;
  // A sentence describes what somebody did; a title names what they were.
  if (/[.!?]$/.test(line) || (line.match(/,/g) ?? []).length > 3) return null;

  const title = cleanTitle(line);
  if (title.length < 3 || title.length > 70) return null;
  if (title.split(/\s+/).length > 9) return null;
  if (!classifyDomain(title)) return null;
  return title;
};

const uniqueBy = <T>(values: T[], key: (value: T) => string): T[] => {
  const seen = new Set<string>();
  return values.filter((value) => {
    const id = key(value);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

/** Years covered by the date ranges in the experience section. */
const yearsFrom = (scope: string): number | null => {
  const thisYear = new Date().getFullYear();
  let first: number | null = null;
  let last: number | null = null;

  for (const match of scope.matchAll(DATE_RANGE)) {
    const from = Number(match[1]);
    const toRaw = match[2] ?? '';
    const to = /^\d{4}$/.test(toRaw) ? Number(toRaw) : thisYear;
    if (from < 1970 || from > thisYear) continue;
    first = first === null ? from : Math.min(first, from);
    last = last === null ? to : Math.max(last, to);
  }

  if (first === null || last === null) return null;
  return Math.max(0, Math.min(50, last - first));
};

/**
 * How senior somebody is, from their titles first and their years second.
 *
 * Titles win because they are what the person and their employer agreed to call
 * the job. The span is the fallback for a CV whose titles carry no level at
 * all, which is most French ones — "Développeur" says nothing, five years does.
 */
const senioritiesFrom = (
  titles: string[],
  years: number | null,
  text: string,
): SeniorityLevel[] => {
  const found = titles
    .map((title) => classifySeniority(title))
    .filter((level): level is SeniorityLevel => Boolean(level));

  if (STUDENT.test(text) || found.includes(SeniorityLevel.INTERN)) {
    found.unshift(SeniorityLevel.INTERN, SeniorityLevel.JUNIOR);
  }

  if (!found.length && years !== null) {
    if (years < 1) found.push(SeniorityLevel.INTERN, SeniorityLevel.JUNIOR);
    else if (years < 3) found.push(SeniorityLevel.JUNIOR, SeniorityLevel.MID);
    else if (years < 6) found.push(SeniorityLevel.MID, SeniorityLevel.SENIOR);
    else if (years < 9) found.push(SeniorityLevel.SENIOR, SeniorityLevel.LEAD);
    else found.push(SeniorityLevel.LEAD);
  }

  return [...new Set(found)].slice(0, 3);
};

/**
 * Where somebody is, read with the crawler's own location parser.
 *
 * The header is where a CV states it and where LinkedIn's PDF export puts it;
 * the experience section is the fallback, because a role's own location line is
 * often the only place a city appears at all.
 */
const placesFrom = (
  all: string[],
  experience: string[],
): { cities: string[]; countries: string[] } => {
  const candidates = [
    ...all.slice(0, 12),
    ...all.filter((line) => LOCATION_HINT.test(line)),
    ...experience,
  ]
    .map((line) => line.replace(LOCATION_HINT, '').replace(CONTACT_NOISE, ' '))
    .filter((line) => line.trim().length > 1 && line.length < 80);

  const cities: string[] = [];
  const countries: string[] = [];

  // One call, candidates in priority order: the parser dedupes and keeps the
  // order it was given, so the header's answer stays ahead of a role's.
  for (const place of parseLocations(candidates)) {
    // A bare country is worth keeping; a "city" nothing recognised is not, or
    // every job title in the section would land here as a place.
    if (place.country) countries.push(place.country.toUpperCase());
    if (place.city && place.country) cities.push(place.city);
  }

  return {
    cities: [...new Set(cities)].slice(0, 3),
    countries: [...new Set(countries)].slice(0, 3),
  };
};

export const extractResumeProfile = (text: string): ResumeProfile => {
  const empty: ResumeProfile = {
    titles: [],
    domains: [],
    seniorities: [],
    employmentTypes: [],
    cities: [],
    countries: [],
    keywords: [],
    yearsOfExperience: null,
  };
  if (!text.trim()) return empty;

  const all = lines(text);
  const experience = experienceLines(all);
  // A CV with no heading we recognise is still a CV: read the whole thing
  // rather than returning nothing.
  const roleScope = experience.length ? experience : all;

  const titles = uniqueBy(
    roleScope
      .map((line) => titleFrom(line))
      .filter((title): title is string => Boolean(title)),
    (title) => fold(title),
  ).slice(0, 6);

  // Counted, not collected: the domain somebody held three roles in outranks
  // the one they touched once.
  const counts = new Map<WorkDomain, number>();
  for (const title of titles) {
    const domain = classifyDomain(title);
    if (domain) counts.set(domain, (counts.get(domain) ?? 0) + 1);
  }
  const domains = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([domain]) => domain);

  const years = yearsFrom(roleScope.join('\n'));

  const employmentTypes = CONTRACT_PATTERNS.filter(([pattern]) =>
    pattern.test(text),
  )
    .map(([, type]) => type)
    .slice(0, 3);

  return {
    titles,
    domains,
    seniorities: senioritiesFrom(titles, years, text),
    employmentTypes,
    ...placesFrom(all, experience),
    keywords: extractResumeKeywords(text, 25),
    yearsOfExperience: years,
  };
};
