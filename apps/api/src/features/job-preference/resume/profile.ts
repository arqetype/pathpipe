import { classifyDomain, classifySeniority } from '@repo/db/parsing/classify';
import { parseLocations } from '@repo/db/parsing/location';
import { EmploymentType } from '@repo/db/types/job-posting/employment-type';
import {
  SeniorityLevel,
  WorkDomain,
} from '@repo/db/types/job-posting/work-domain';
import { extractResumeKeywords } from './keywords';

export interface ResumeProfile {
  titles: string[];
  domains: WorkDomain[];
  seniorities: SeniorityLevel[];
  employmentTypes: EmploymentType[];
  cities: string[];
  /** ISO 3166-1 alpha-2. */
  countries: string[];
  keywords: string[];
  /** First to last experience year. */
  yearsOfExperience: number | null;
}

const fold = (value: string): string =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const EXPERIENCE_HEADING =
  /^(work\s+|professional\s+)?(experience|experiences|employment|emploi|exp[eé]riences?(\s+professionnelles?)?|parcours(\s+professionnel)?|career)\s*:?\s*$/i;

const OTHER_HEADING =
  /^(education|formation|dipl[oô]mes?|skills|comp[eé]tences|projects|projets|languages|langues|certifications?|interests|centres?\s+d.int[eé]r[eê]ts?|publications|awards|r[eé]f[eé]rences|volunteer|associatif)\b/i;

const SCHOOL =
  /\b(universit|école|ecole|school|college|institut|lyc[eé]e|bachelor|master['’]?s?|licence|bts|but\b|dut\b|mba|phd|doctorat|dipl[oô]m|degree|baccalaur)\b/i;

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

const STUDENT =
  /\b([eé]tudiant\w*|student|[eé]l[eè]ve\s+ing[eé]nieur|engineering\s+student|en\s+formation|m1\b|m2\b|master\s*[12]\b|cycle\s+ing[eé]nieur)\b/i;

const LOCATION_HINT =
  /^(location|localisation|adresse|address|based\s+in|bas[eé]\s+[àa]|ville|city)\s*:?\s*/i;

const CONTACT_NOISE =
  /(\S+@\S+|https?:\/\/\S+|(?:www|linkedin|github)\.\S+|\+?\d[\d\s().-]{7,})/gi;

const lines = (text: string): string[] =>
  text
    .split('\n')
    .map((line) => line.replace(/^[\s•·*\-–—]+/, '').trim())
    .filter(Boolean);

const experienceLines = (all: string[]): string[] => {
  const start = all.findIndex((line) => EXPERIENCE_HEADING.test(line));
  if (start < 0) return [];
  const rest = all.slice(start + 1);
  const end = rest.findIndex((line) => OTHER_HEADING.test(line));
  return end < 0 ? rest : rest.slice(0, end);
};

const cleanTitle = (line: string): string =>
  line
    .split(TITLE_SEPARATORS)[0]
    .replace(/\((?:[^)]*)\)/g, ' ')
    .replace(/\b(?:19|20)\d{2}\b/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/[,;:.\s]+$/, '')
    .trim();

const titleFrom = (line: string): string | null => {
  if (line.length > 90 || SCHOOL.test(line)) return null;
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

// Titles first, years as fallback.
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

  // Priority order; parser preserves it.
  for (const place of parseLocations(candidates)) {
    // Unrecognised city: drop it.
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
  const roleScope = experience.length ? experience : all;

  const titles = uniqueBy(
    roleScope
      .map((line) => titleFrom(line))
      .filter((title): title is string => Boolean(title)),
    (title) => fold(title),
  ).slice(0, 6);

  // Most-held domain wins.
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
