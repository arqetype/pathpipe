import type { AtsAdapter, AtsTarget, DiscoveredJob } from '../types';
import { asString, strings, target } from './shared';
import { decodeEntities } from '@repo/db/parsing/sanitize';

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

const RESERVED = new Set(['www', 'api', 'app', 'assets', 'cdn']);

const tagText = (block: string, tag: string): string | undefined => {
  const match = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i').exec(block);
  const raw = match?.[1];
  if (raw === undefined) return undefined;
  const unwrapped = raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
  return unwrapped ? decodeEntities(unwrapped) : undefined;
};

const tagTexts = (block: string, tag: string): string[] => {
  const found: string[] = [];
  const pattern = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'gi');
  for (const match of block.matchAll(pattern)) {
    const value = match[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
    if (value) found.push(decodeEntities(value));
  }
  return found;
};

const department = (block: string): string | undefined => {
  const own = tagText(block, 'department');
  if (own) return own;
  const category = tagText(block, 'recruitingCategory');
  return category?.replace(/^\d+\s*[_-]\s*/, '') || undefined;
};

// Strip nested blocks before reading title.
const parsePosition = (block: string, light: boolean): PersonioPosition => {
  const descriptionsBlock =
    /<jobDescriptions>([\s\S]*?)<\/jobDescriptions>/i.exec(block)?.[1] ?? '';
  const officesBlock =
    /<additionalOffices>([\s\S]*?)<\/additionalOffices>/i.exec(block)?.[1] ??
    '';

  const flat = block
    .replace(/<jobDescriptions>[\s\S]*?<\/jobDescriptions>/i, '')
    .replace(/<additionalOffices>[\s\S]*?<\/additionalOffices>/i, '');

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

  async fetch(atsTarget, ctx): Promise<DiscoveredJob[]> {
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
          url: `https://${host}/job/${position.id}`,
          description: position.descriptionHtml,
          descriptionHtml: position.descriptionHtml,
          locations: strings(position.office, ...position.offices),
          department: position.department,
          employmentType: asString(position.employmentType),
          postedAt: position.createdAt,
        },
      ];
    });
  },
};
