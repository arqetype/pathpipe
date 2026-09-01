import type { AtsAdapter, AtsTarget, ScrapedJob } from '../types';
import { asString, target } from './shared';
import { decodeEntities } from '../sanitize';

/**
 * Personio boards. Every tenant publishes its open positions as XML at
 * `{tenant}.jobs.personio.{tld}/xml` — public, no key, full descriptions
 * inline.
 *
 * The feed is the only machine-readable view Personio offers: there is no JSON
 * equivalent, so this adapter reads XML where every other one reads JSON.
 */
interface PersonioPosition {
  id?: string;
  title?: string;
  office?: string;
  offices: string[];
  department?: string;
  employmentType?: string;
  descriptionHtml?: string;
  createdAt?: string;
}

const TOKEN_PATTERNS = [
  /([a-z0-9][a-z0-9-]*)\.jobs\.personio\.(de|com|eu)/i,
  /jobs\.personio\.(?:de|com|eu)\/([a-z0-9-]+)/i,
];

/** Subdomains under jobs.personio.* that are the product, not a tenant. */
const RESERVED = new Set(['www', 'api', 'app', 'assets', 'cdn']);

/**
 * Text of the first `<tag>` in a block, CDATA unwrapped and entities decoded.
 *
 * A regex reader rather than an XML parser: the feed is one flat level of
 * elements with no attributes and no namespaces, so a parser would be a
 * dependency bought for nothing. Anything richer than this shape belongs in a
 * real parser, not in a longer regex.
 */
const tagText = (block: string, tag: string): string | undefined => {
  const match = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i').exec(block);
  const raw = match?.[1];
  if (raw === undefined) return undefined;
  const unwrapped = raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
  return unwrapped ? decodeEntities(unwrapped) : undefined;
};

/** Every `<tag>` in a block, in document order. */
const tagTexts = (block: string, tag: string): string[] => {
  const found: string[] = [];
  const pattern = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'gi');
  for (const match of block.matchAll(pattern)) {
    const value = match[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
    if (value) found.push(decodeEntities(value));
  }
  return found;
};

/**
 * The team the position sits in.
 *
 * `department` is the org chart and `recruitingCategory` is the grouping shown
 * on the board, but tenants number the latter to force a display order
 * ("002_Sales & Growth"), so the org chart is preferred and the ordering prefix
 * is stripped when it is all there is.
 */
const department = (block: string): string | undefined => {
  const own = tagText(block, 'department');
  if (own) return own;
  const category = tagText(block, 'recruitingCategory');
  return category?.replace(/^\d+\s*[_-]\s*/, '') || undefined;
};

/**
 * One position, read from its XML block.
 *
 * Order matters here: `<name>` names the position at the top level and names a
 * description section inside `<jobDescriptions>`, so the nested block is taken
 * out of the way before the title is read.
 */
const parsePosition = (block: string, light: boolean): PersonioPosition => {
  const descriptionsBlock =
    /<jobDescriptions>([\s\S]*?)<\/jobDescriptions>/i.exec(block)?.[1] ?? '';
  const officesBlock =
    /<additionalOffices>([\s\S]*?)<\/additionalOffices>/i.exec(block)?.[1] ??
    '';

  const flat = block
    .replace(/<jobDescriptions>[\s\S]*?<\/jobDescriptions>/i, '')
    .replace(/<additionalOffices>[\s\S]*?<\/additionalOffices>/i, '');

  // Personio splits a description into titled sections ("Introduction", "Your
  // tasks"). Rejoining them with their headings keeps the offer readable, which
  // a bare concatenation of the bodies would not be.
  const descriptionHtml = light
    ? undefined
    : [
        ...descriptionsBlock.matchAll(
          /<jobDescription>([\s\S]*?)<\/jobDescription>/gi,
        ),
      ]
        .map((section) => {
          const body = tagText(section[1] ?? '', 'value');
          if (!body) return '';
          const heading = tagText(section[1] ?? '', 'name');
          return heading ? `<h3>${heading}</h3>${body}` : body;
        })
        .filter(Boolean)
        .join('\n') || undefined;

  const schedule = tagText(flat, 'schedule');
  const contract = tagText(flat, 'employmentType');

  return {
    id: tagText(flat, 'id'),
    title: tagText(flat, 'name'),
    office: tagText(flat, 'office'),
    offices: tagTexts(officesBlock, 'office'),
    department: department(flat),
    // Two fields describe one thing: "permanent" plus "part-time". Joined so
    // the normaliser sees both, and in this order because a part-time contract
    // is more specific than a permanent one.
    employmentType: [contract, schedule].filter(Boolean).join(' ') || undefined,
    descriptionHtml,
    createdAt: tagText(flat, 'createdAt'),
  };
};

const tokenFrom = (text: string): AtsTarget | null => {
  const hosted = TOKEN_PATTERNS[0]?.exec(text);
  const token = hosted?.[1]?.toLowerCase();
  if (token && !RESERVED.has(token)) {
    return target('personio', { token, tld: hosted?.[2]?.toLowerCase() });
  }
  return null;
};

export const personioAdapter: AtsAdapter = {
  platform: 'personio',

  match(url: URL): AtsTarget | null {
    if (!/(^|\.)personio\.(de|com|eu)$/i.test(url.hostname)) return null;
    return tokenFrom(url.hostname);
  },

  detectInHtml(html: string): AtsTarget | null {
    return tokenFrom(html);
  },

  async fetch(atsTarget, ctx): Promise<ScrapedJob[]> {
    const token = atsTarget.params['token'];
    if (!token) return [];
    const tld = atsTarget.params['tld'] ?? 'de';

    const host = `${token}.jobs.personio.${tld}`;
    const response = await ctx.http.request(`https://${host}/xml`);
    if (!response.ok || !response.body) return [];

    const positions = [
      ...response.body.matchAll(/<position>([\s\S]*?)<\/position>/gi),
    ];

    return positions.flatMap((match) => {
      const position = parsePosition(match[1] ?? '', Boolean(ctx.light));
      if (!position.id || !position.title) return [];
      return [
        {
          externalId: position.id,
          title: position.title,
          // The feed carries no link; Personio serves every position under the
          // tenant's own board at this path.
          url: `https://${host}/job/${position.id}`,
          description: position.descriptionHtml,
          descriptionHtml: position.descriptionHtml,
          locations: [position.office, ...position.offices].filter(
            (value): value is string => Boolean(value),
          ),
          department: position.department,
          employmentType: asString(position.employmentType),
          postedAt: position.createdAt,
        },
      ];
    });
  },
};
