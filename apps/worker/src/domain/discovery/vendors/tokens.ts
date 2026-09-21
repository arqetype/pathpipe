// Never probed alone: wrong company.
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

// The whole name, never one word.
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
      name.replace(/[^A-Za-z0-9]/g, ''),
    ]),
  ];

  return tokens.filter((token) => {
    if (token.length < 3 || token.length > 60) return false;
    if (parts.length === 1 && GENERIC_TOKENS.has(token.toLowerCase())) {
      return false;
    }
    return true;
  });
};

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
