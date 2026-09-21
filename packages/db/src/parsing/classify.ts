/**
 * Reading the shape of a role out of the words a board used for it.
 *
 * Boards do not publish "this is a backend job at senior level" — they publish
 * a title and, if you are lucky, a team name. Matching a person's answer to
 * "what do you want to work on?" against free text is a guessing game played
 * once per query; classifying once at ingest turns it into a column comparison.
 *
 * Both classifiers return `undefined` rather than a default. An offer we could
 * not read is not the same as an offer that is OTHER or MID, and the scorer
 * treats those two cases very differently.
 */

/** Ordered: the first pattern that hits wins, so specific ones come first. */
const DOMAIN_PATTERNS: Array<[RegExp, string]> = [
  [
    /\b(machine learning|ml engineer|ml scientist|deep learning|nlp|computer vision|llm|generative ai|ai (engineer|scientist|researcher)|mlops)\b/i,
    'MACHINE_LEARNING',
  ],
  [
    /\b(research scientist|research engineer|researcher|scientifique|chercheur)\b/i,
    'RESEARCH',
  ],
  [
    /\b(data (engineer|analyst|scientist|platform)|analytics engineer|business intelligence|bi engineer|donnees|données)\b/i,
    'DATA',
  ],
  [
    /\b(security|s[eé]curit[eé]|appsec|infosec|penetration tester|red team|soc analyst|detection engineer|cryptograph)\b/i,
    'SECURITY',
  ],
  [
    /\b(sre|site reliability|devops|platform engineer|infrastructure|cloud engineer|kubernetes|systems engineer|network engineer|infra)\b/i,
    'INFRASTRUCTURE',
  ],
  [
    /\b(embedded|firmware|hardware|fpga|rtos|electronics|robotics)\b/i,
    'EMBEDDED',
  ],
  [
    /\b(mobile|ios|android|react native|flutter|swift|kotlin) (engineer|developer|d[eé]veloppeur)\b|\b(ios|android) engineer\b/i,
    'MOBILE',
  ],
  [/\b(full[\s-]?stack|fullstack)\b/i, 'FULLSTACK'],
  [
    /\b(front[\s-]?end|frontend|ui engineer|web developer|react developer)\b/i,
    'FRONTEND',
  ],
  [
    /\b(back[\s-]?end|backend|server[\s-]side|api engineer|distributed systems)\b/i,
    'BACKEND',
  ],
  [
    /\b(qa|quality assurance|test engineer|sdet|automation engineer|testeur)\b/i,
    'QA',
  ],
  [
    /\b(product manager|product owner|product lead|chef de produit|product analyst|pm\b)/i,
    'PRODUCT',
  ],
  [/\b(designer|design|ux|ui\/ux|user experience|graphiste)\b/i, 'DESIGN'],
  [
    /\b(developer (advocate|relations)|devrel|community engineer|technical writer)\b/i,
    'DEVREL',
  ],
  [
    /\b(account executive|sales|business development|bdr|sdr|commercial|partnerships)\b/i,
    'SALES',
  ],
  [/\b(marketing|growth|seo|content|brand|communication)\b/i, 'MARKETING'],
  [/\b(finance|accountant|controller|comptab|fp&a|treasury)\b/i, 'FINANCE'],
  [
    /\b(operations|recruiter|talent|people ops|human resources|hr\b|office manager|legal|counsel)\b/i,
    'OPERATIONS',
  ],
  // Last: a bare "engineer" with no qualifier is most often server-side work,
  // but only claim it when nothing more specific matched.
  [/\b(software engineer|swe|d[eé]veloppeur|developer|engineer)\b/i, 'BACKEND'],
];

const foldAccents = (value: string): string =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/**
 * The part of software a role belongs to.
 *
 * The title carries the signal; the team name is consulted only as a tiebreak,
 * because "Engineering" as a department says nothing a title has not said.
 */
export const classifyDomain = (
  title: string,
  department?: string,
): string | undefined => {
  const haystack = foldAccents(`${title} ${department ?? ''}`);
  for (const [pattern, domain] of DOMAIN_PATTERNS) {
    if (
      pattern.test(haystack) ||
      pattern.test(`${title} ${department ?? ''}`)
    ) {
      return domain;
    }
  }
  return undefined;
};

const SENIORITY_PATTERNS: Array<[RegExp, string]> = [
  [
    /\b(intern|internship|stage|stagiaire|praktikum|working student)\b/i,
    'INTERN',
  ],
  [/\b(director|vp|vice president|head of|chief|cto|cpo|cio)\b/i, 'DIRECTOR'],
  // "Product Manager" and "Account Manager" are roles, not levels — only a
  // manager *of people* counts, which is what the qualifier is doing here.
  [
    /\b(engineering|people|team|technical|dev(elopment)?)\s+manager\b|\bmanager,?\s+engineering\b/i,
    'MANAGER',
  ],
  [/\b(staff|principal|lead|tech lead|architect)\b/i, 'LEAD'],
  [/\b(senior|sr\.?|confirm[eé]|experienced)\b/i, 'SENIOR'],
  [
    /\b(junior|jr\.?|graduate|entry[\s-]level|d[eé]butant|apprentice\w*|alternan\w*|apprenti\w*|contrat pro\w*)\b/i,
    'JUNIOR',
  ],
];

/**
 * How senior a role is.
 *
 * Order matters more than usual here: "Senior Engineering Manager" is a manager
 * before it is a senior, and an internship is an internship whatever else the
 * title claims.
 */
export const classifySeniority = (title: string): string | undefined => {
  const haystack = foldAccents(title);
  for (const [pattern, level] of SENIORITY_PATTERNS) {
    if (pattern.test(haystack) || pattern.test(title)) return level;
  }
  return undefined;
};
