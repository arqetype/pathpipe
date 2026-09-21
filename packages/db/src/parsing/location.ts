import { decodeEntities } from './sanitize';

/**
 * Turning what a board wrote in its location slot into places you can filter on.
 *
 * Boards write one field and mean anything from "Paris" to
 * "San Francisco, New York City, or Remote (US)". Joining those into one string
 * is what makes "San Francisco" and "San Francisco, New York City" look like
 * two different cities in a filter list, so they are split apart here and each
 * part is resolved to `{ city, region, country }`.
 */

export interface ParsedLocation {
  city: string | null;
  region: string | null;
  /** ISO 3166-1 alpha-2, uppercased. */
  country: string | null;
  /** What the board actually wrote, for display and for debugging a bad parse. */
  raw: string;
  /** The part named a work model ("Remote"), not a place. */
  remote?: 'REMOTE' | 'HYBRID';
}

/**
 * Country names and codes seen on job boards, mapped to ISO alpha-2.
 *
 * Deliberately not an exhaustive ISO table: every entry here is a spelling a
 * board actually uses, including the local-language and colloquial forms
 * ("Deutschland", "UK", "USA") that a strict ISO list would miss.
 */
const COUNTRIES: Record<string, string> = {
  // Alpha-2 pass through, listed so a bare "FR" is recognised as a country.
  ar: 'AR',
  at: 'AT',
  au: 'AU',
  be: 'BE',
  bg: 'BG',
  br: 'BR',
  ca: 'CA',
  ch: 'CH',
  cl: 'CL',
  cn: 'CN',
  co: 'CO',
  cz: 'CZ',
  de: 'DE',
  dk: 'DK',
  ee: 'EE',
  eg: 'EG',
  es: 'ES',
  fi: 'FI',
  fr: 'FR',
  gb: 'GB',
  gr: 'GR',
  hk: 'HK',
  hr: 'HR',
  hu: 'HU',
  id: 'ID',
  ie: 'IE',
  il: 'IL',
  in: 'IN',
  it: 'IT',
  jp: 'JP',
  kr: 'KR',
  lt: 'LT',
  lu: 'LU',
  lv: 'LV',
  ma: 'MA',
  mx: 'MX',
  my: 'MY',
  nl: 'NL',
  no: 'NO',
  nz: 'NZ',
  pe: 'PE',
  ph: 'PH',
  pl: 'PL',
  pt: 'PT',
  ro: 'RO',
  rs: 'RS',
  se: 'SE',
  sg: 'SG',
  si: 'SI',
  sk: 'SK',
  th: 'TH',
  tn: 'TN',
  tr: 'TR',
  tw: 'TW',
  ua: 'UA',
  us: 'US',
  vn: 'VN',
  za: 'ZA',
  ae: 'AE',
  sa: 'SA',
  ng: 'NG',
  ke: 'KE',

  // Alpha-3 and colloquial codes.
  usa: 'US',
  esp: 'ES',
  deu: 'DE',
  fra: 'FR',
  gbr: 'GB',
  ita: 'IT',
  nld: 'NL',
  can: 'CA',
  aus: 'AU',
  ind: 'IN',
  jpn: 'JP',
  bra: 'BR',
  uk: 'GB',
  uae: 'AE',

  // English names.
  'united states': 'US',
  'united states of america': 'US',
  'united kingdom': 'GB',
  'great britain': 'GB',
  england: 'GB',
  scotland: 'GB',
  wales: 'GB',
  'northern ireland': 'GB',
  ireland: 'IE',
  france: 'FR',
  germany: 'DE',
  spain: 'ES',
  portugal: 'PT',
  italy: 'IT',
  netherlands: 'NL',
  'the netherlands': 'NL',
  belgium: 'BE',
  luxembourg: 'LU',
  switzerland: 'CH',
  austria: 'AT',
  poland: 'PL',
  czechia: 'CZ',
  'czech republic': 'CZ',
  romania: 'RO',
  bulgaria: 'BG',
  greece: 'GR',
  croatia: 'HR',
  hungary: 'HU',
  slovakia: 'SK',
  slovenia: 'SI',
  serbia: 'RS',
  ukraine: 'UA',
  sweden: 'SE',
  norway: 'NO',
  denmark: 'DK',
  finland: 'FI',
  estonia: 'EE',
  latvia: 'LV',
  lithuania: 'LT',
  canada: 'CA',
  mexico: 'MX',
  brazil: 'BR',
  argentina: 'AR',
  chile: 'CL',
  colombia: 'CO',
  peru: 'PE',
  australia: 'AU',
  'new zealand': 'NZ',
  india: 'IN',
  china: 'CN',
  japan: 'JP',
  'south korea': 'KR',
  korea: 'KR',
  singapore: 'SG',
  malaysia: 'MY',
  indonesia: 'ID',
  thailand: 'TH',
  vietnam: 'VN',
  philippines: 'PH',
  'hong kong': 'HK',
  taiwan: 'TW',
  israel: 'IL',
  turkey: 'TR',
  'united arab emirates': 'AE',
  'saudi arabia': 'SA',
  egypt: 'EG',
  morocco: 'MA',
  tunisia: 'TN',
  'south africa': 'ZA',
  nigeria: 'NG',
  kenya: 'KE',

  // French, German, Spanish, Portuguese spellings.
  'etats-unis': 'US',
  'états-unis': 'US',
  'royaume-uni': 'GB',
  allemagne: 'DE',
  deutschland: 'DE',
  espagne: 'ES',
  espana: 'ES',
  españa: 'ES',
  italie: 'IT',
  italia: 'IT',
  'pays-bas': 'NL',
  belgique: 'BE',
  belgië: 'BE',
  suisse: 'CH',
  schweiz: 'CH',
  autriche: 'AT',
  pologne: 'PL',
  irlande: 'IE',
  suede: 'SE',
  suède: 'SE',
  norvege: 'NO',
  norvège: 'NO',
  danemark: 'DK',
  finlande: 'FI',
  bresil: 'BR',
  brésil: 'BR',
  brasil: 'BR',
  japon: 'JP',
  inde: 'IN',
  chine: 'CN',
  maroc: 'MA',
  tunisie: 'TN',
  frankreich: 'FR',
  francia: 'FR',
  alemania: 'DE',
  'reino unido': 'GB',
  'estados unidos': 'US',
};

/**
 * US states and Canadian provinces, so "Austin, TX" resolves its country.
 *
 * Only the two-letter forms: a board writing the full state name puts a
 * country next to it far more often than not.
 */
const US_STATES = new Set([
  'al',
  'ak',
  'az',
  'ar',
  'ca',
  'co',
  'ct',
  'de',
  'fl',
  'ga',
  'hi',
  'ia',
  'il',
  'in',
  'ks',
  'ky',
  'la',
  'ma',
  'md',
  'me',
  'mi',
  'mn',
  'mo',
  'ms',
  'mt',
  'nc',
  'nd',
  'ne',
  'nh',
  'nj',
  'nm',
  'nv',
  'ny',
  'oh',
  'ok',
  'or',
  'pa',
  'ri',
  'sc',
  'sd',
  'tn',
  'tx',
  'ut',
  'va',
  'vt',
  'wa',
  'wi',
  'wv',
  'wy',
  'dc',
]);

const CA_PROVINCES = new Set([
  'ab',
  'bc',
  'mb',
  'nb',
  'nl',
  'ns',
  'nt',
  'nu',
  'on',
  'pe',
  'qc',
  'sk',
  'yt',
]);

/** Cities whose name alone settles the country, where a board omits it. */
const CITY_COUNTRIES: Record<string, string> = {
  paris: 'FR',
  lyon: 'FR',
  marseille: 'FR',
  toulouse: 'FR',
  bordeaux: 'FR',
  lille: 'FR',
  nantes: 'FR',
  montreuil: 'FR',
  london: 'GB',
  manchester: 'GB',
  berlin: 'DE',
  munich: 'DE',
  hamburg: 'DE',
  amsterdam: 'NL',
  madrid: 'ES',
  barcelona: 'ES',
  lisbon: 'PT',
  lisboa: 'PT',
  milan: 'IT',
  rome: 'IT',
  dublin: 'IE',
  brussels: 'BE',
  bruxelles: 'BE',
  zurich: 'CH',
  geneva: 'CH',
  vienna: 'AT',
  stockholm: 'SE',
  copenhagen: 'DK',
  oslo: 'NO',
  helsinki: 'FI',
  warsaw: 'PL',
  prague: 'CZ',
  'new york': 'US',
  'new york city': 'US',
  nyc: 'US',
  'san francisco': 'US',
  'los angeles': 'US',
  seattle: 'US',
  austin: 'US',
  boston: 'US',
  chicago: 'US',
  denver: 'US',
  atlanta: 'US',
  'washington dc': 'US',
  toronto: 'CA',
  vancouver: 'CA',
  montreal: 'CA',
  montréal: 'CA',
  bangalore: 'IN',
  bengaluru: 'IN',
  mumbai: 'IN',
  'new delhi': 'IN',
  singapore: 'SG',
  sydney: 'AU',
  melbourne: 'AU',
  'tel aviv': 'IL',
  tokyo: 'JP',
  'são paulo': 'BR',
  'sao paulo': 'BR',
};

const REMOTE_ONLY =
  /^(fully\s+)?(remote|télétravail|teletravail|anywhere|work from home|wfh|distributed)\b/i;
const HYBRID_ONLY = /^hybrid(e)?\b/i;

/** Words that mean "several places" rather than naming one. */
const NOISE =
  /^(multiple locations|various locations|several locations|other|n\/?a|tbd|flexible|worldwide|global|emea|apac|amer|latam|europe|international)$/i;

const fold = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/**
 * Separators that mean "another location", as opposed to the comma that
 * separates a city from its region.
 *
 * A comma is ambiguous — "Paris, France" is one place, "Paris, London" is two —
 * so it is resolved later, once the parts are known.
 */
const LOCATION_SEPARATORS =
  /\s*(?:;|\||\/|\bor\b|\bou\b|\band\b|\bet\b|•|·)\s*/i;

const clean = (value: string): string =>
  decodeEntities(value)
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–—•|,:]+|[\s\-–—•|,:]+$/g, '')
    .trim();

/** Country for a lone token, when it names one. */
const countryOf = (token: string): string | null =>
  COUNTRIES[fold(token)] ?? null;

const regionCountry = (token: string): string | null => {
  const folded = fold(token);
  if (folded.length !== 2) return null;
  if (US_STATES.has(folded)) return 'US';
  if (CA_PROVINCES.has(folded)) return 'CA';
  return null;
};

/**
 * Resolves one already-separated place, e.g. "Montreuil, IDF, FR".
 *
 * Read right to left: the last part is a country if it names one, the part
 * before it a region, and whatever is left is the city.
 */
const parseOne = (raw: string): ParsedLocation | null => {
  const value = clean(raw);
  if (!value || value.length > 120) return null;
  if (NOISE.test(value)) return null;

  if (HYBRID_ONLY.test(value)) {
    // "Hybrid - Paris" still names a city; keep it and record the model.
    const rest = clean(
      value.replace(HYBRID_ONLY, '').replace(/^[\s\-–—(,]+/, ''),
    );
    const inner = rest ? parseOne(rest) : null;
    return {
      ...(inner ?? { city: null, region: null, country: null }),
      raw: value,
      remote: 'HYBRID',
    };
  }
  if (REMOTE_ONLY.test(value)) {
    const rest = clean(
      value
        .replace(REMOTE_ONLY, '')
        .replace(/^[\s\-–—(,]+/, '')
        .replace(/\)$/, ''),
    );
    const inner = rest ? parseOne(rest) : null;
    return {
      ...(inner ?? { city: null, region: null, country: null }),
      raw: value,
      remote: 'REMOTE',
    };
  }

  // "Paris (France)" and "Berlin (HQ)" both end in a parenthetical; only the
  // one that names a country is worth keeping.
  let body = value;
  let parenthetical: string | null = null;
  const parens = /\(([^)]+)\)\s*$/.exec(body);
  if (parens?.[1]) {
    body = clean(body.slice(0, parens.index));
    parenthetical = countryOf(parens[1]) ? clean(parens[1]) : null;
  }

  const parts = [
    ...body
      .split(',')
      .map((part) => clean(part))
      .filter(Boolean),
    ...(parenthetical ? [parenthetical] : []),
  ];
  if (!parts.length) return null;

  let country: string | null = null;
  let region: string | null = null;
  const rest = [...parts];

  const last = rest[rest.length - 1];
  if (last && countryOf(last)) {
    country = countryOf(last);
    rest.pop();
  }

  const nextLast = rest[rest.length - 1];
  if (rest.length > 1 && nextLast) {
    const implied = regionCountry(nextLast);
    if (implied || country) {
      region = nextLast;
      country = country ?? implied;
      rest.pop();
    }
  }

  const city = rest.length ? rest.join(', ') || null : null;
  if (!city && !region && !country) return null;

  return {
    city,
    region,
    country: country ?? (city ? (CITY_COUNTRIES[fold(city)] ?? null) : null),
    raw: value,
  };
};

/**
 * A comma-joined string is two places, not one, when both sides name cities —
 * "San Francisco, New York City" — but one place when the string ends in a
 * qualifier: "Paris, France", "Austin, TX", "Montreuil, IDF, FR".
 *
 * The trailing part decides. Boards listing several cities do not append a
 * country to the list, and boards writing a full address always end with one —
 * which makes this readable rather than a guess taken part by part.
 */
const splitAmbiguousCommas = (value: string): string[] => {
  const parts = value.split(',').map(clean).filter(Boolean);
  if (parts.length < 2) return [value];

  const last = parts[parts.length - 1] ?? '';
  if (countryOf(last) || regionCountry(last)) return [value];

  return parts;
};

/**
 * Every distinct place a board named, deduped.
 *
 * Accepts the raw strings an adapter collected — one per location field the
 * board exposes — and never a pre-joined string, which is the shape that
 * created the problem in the first place.
 */
export const parseLocations = (
  values: Array<string | undefined | null>,
): ParsedLocation[] => {
  const out = new Map<string, ParsedLocation>();

  for (const value of values) {
    if (!value) continue;
    for (const chunk of clean(value).split(LOCATION_SEPARATORS)) {
      if (!chunk) continue;
      for (const candidate of splitAmbiguousCommas(chunk)) {
        const parsed = parseOne(candidate);
        if (!parsed) continue;
        const key = `${parsed.city ?? ''}|${parsed.region ?? ''}|${parsed.country ?? ''}|${parsed.remote ?? ''}`;
        if (!out.has(key)) out.set(key, parsed);
      }
    }
  }

  return [...out.values()].slice(0, 20);
};

/** One label for the whole set, for the offer's display line. */
export const formatLocations = (
  locations: ParsedLocation[],
): string | undefined => {
  if (!locations.length) return undefined;
  const labels = locations.map((location) => {
    if (location.city) {
      return location.country && location.country !== 'US'
        ? `${location.city}, ${location.country}`
        : location.region
          ? `${location.city}, ${location.region}`
          : location.city;
    }
    if (location.remote)
      return location.remote === 'REMOTE' ? 'Remote' : 'Hybrid';
    return location.region ?? location.country ?? location.raw;
  });
  const unique = [...new Set(labels.filter(Boolean))];
  return unique.slice(0, 4).join(' · ');
};
