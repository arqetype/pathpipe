export interface RobotsRules {
  disallow: string[];
  allow: string[];
  crawlDelayMs: number | null;
}

const pathMatches = (pattern: string, path: string): boolean => {
  if (!pattern) return false;
  if (!pattern.includes('*') && !pattern.endsWith('$')) {
    return path.startsWith(pattern);
  }
  const anchored = pattern.endsWith('$');
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const escaped = body
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${escaped}${anchored ? '$' : ''}`).test(path);
};

export const robotsAllows = (rules: RobotsRules, url: string): boolean => {
  const path = (() => {
    try {
      const parsed = new URL(url);
      return `${parsed.pathname}${parsed.search}`;
    } catch {
      return '/';
    }
  })();

  const matchLength = (patterns: string[]): number => {
    let best = -1;
    for (const pattern of patterns) {
      if (pathMatches(pattern, path) && pattern.length > best) {
        best = pattern.length;
      }
    }
    return best;
  };

  const disallowed = matchLength(rules.disallow);
  if (disallowed < 0) return true;
  // Longest match wins.
  return matchLength(rules.allow) >= disallowed;
};

export const parseRobots = (text: string): RobotsRules => {
  const rules: RobotsRules = { disallow: [], allow: [], crawlDelayMs: null };
  let inScope = false;
  let sawNamedGroup = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.split('#')[0]?.trim() ?? '';
    if (!line) continue;
    const separator = line.indexOf(':');
    if (separator < 0) continue;
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (field === 'user-agent') {
      const agent = value.toLowerCase();
      const isOurs = agent.includes('pathpipe');
      if (isOurs && !sawNamedGroup) {
        // A named group replaces the wildcard.
        sawNamedGroup = true;
        rules.disallow.length = 0;
        rules.allow.length = 0;
      }
      inScope = isOurs || (agent === '*' && !sawNamedGroup);
      continue;
    }

    if (!inScope) continue;
    if (field === 'disallow' && value) rules.disallow.push(value);
    if (field === 'allow' && value) rules.allow.push(value);
    if (field === 'crawl-delay') {
      const seconds = Number.parseFloat(value);
      if (Number.isFinite(seconds)) {
        rules.crawlDelayMs = Math.min(10000, seconds * 1000);
      }
    }
  }

  return rules;
};
