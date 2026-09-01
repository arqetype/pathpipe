/**
 * Pulling the matchable part out of a CV.
 *
 * A CV is mostly prose about the past; what the matcher can use is the
 * vocabulary — the tools, languages and domains a person actually names. So the
 * text is scanned for terms from a known list rather than split into words and
 * hoped over: "Java" is a skill, "January" is not, and only a list can tell
 * them apart.
 *
 * Anything the list does not know is dropped. That is a deliberate floor on
 * precision: a wrong keyword quietly re-ranks somebody's whole board, and the
 * user can always add terms by hand.
 */

/**
 * Skills worth matching on, lowercased.
 *
 * Multi-word entries are matched as phrases, so "machine learning" is found
 * without "learning" on its own becoming a skill.
 */
const SKILLS = [
  // Languages
  'typescript',
  'javascript',
  'python',
  'java',
  'kotlin',
  'swift',
  'go',
  'golang',
  'rust',
  'c++',
  'c#',
  'ruby',
  'php',
  'scala',
  'elixir',
  'haskell',
  'sql',
  'bash',
  'r',
  'matlab',
  'dart',
  'perl',
  'lua',
  'solidity',
  // Frontend
  'react',
  'next.js',
  'nextjs',
  'vue',
  'nuxt',
  'angular',
  'svelte',
  'remix',
  'tailwind',
  'css',
  'html',
  'redux',
  'webpack',
  'vite',
  'storybook',
  'react native',
  'flutter',
  'swiftui',
  'jetpack compose',
  // Backend
  'node.js',
  'nodejs',
  'express',
  'nestjs',
  'django',
  'flask',
  'fastapi',
  'rails',
  'spring',
  'spring boot',
  'laravel',
  'symfony',
  '.net',
  'graphql',
  'rest',
  'grpc',
  'microservices',
  'kafka',
  'rabbitmq',
  'redis',
  'celery',
  // Data
  'postgresql',
  'postgres',
  'mysql',
  'mongodb',
  'elasticsearch',
  'cassandra',
  'dynamodb',
  'snowflake',
  'bigquery',
  'redshift',
  'databricks',
  'spark',
  'hadoop',
  'airflow',
  'dbt',
  'kafka streams',
  'clickhouse',
  'duckdb',
  'pandas',
  'numpy',
  'etl',
  // ML
  'machine learning',
  'deep learning',
  'pytorch',
  'tensorflow',
  'keras',
  'scikit-learn',
  'hugging face',
  'transformers',
  'llm',
  'nlp',
  'computer vision',
  'reinforcement learning',
  'mlops',
  'langchain',
  'rag',
  // Infra
  'aws',
  'gcp',
  'azure',
  'kubernetes',
  'docker',
  'terraform',
  'ansible',
  'pulumi',
  'jenkins',
  'github actions',
  'gitlab ci',
  'circleci',
  'linux',
  'nginx',
  'prometheus',
  'grafana',
  'datadog',
  'ci/cd',
  'serverless',
  // Security
  'penetration testing',
  'owasp',
  'cryptography',
  'oauth',
  'saml',
  'iam',
  'threat modeling',
  'siem',
  'soc',
  // Practice
  'agile',
  'scrum',
  'kanban',
  'tdd',
  'code review',
  'system design',
  'distributed systems',
  'accessibility',
  'seo',
  'a/b testing',
  'product management',
  'user research',
  'figma',
  'ux',
  'ui design',
  'data analysis',
  'unit testing',
  'e2e testing',
  'cypress',
  'playwright',
  'jest',
  'pytest',
];

/** Terms that are only skills in context, so a bare mention is not enough. */
const AMBIGUOUS = new Set(['r', 'go', 'rest', 'ux', 'soc', 'rag', 'iam']);

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Skills the CV actually names.
 *
 * Matched on word boundaries so "java" does not fire on "javascript", and the
 * ambiguous one-or-two letter entries need to appear as standalone words.
 */
export const extractResumeKeywords = (text: string, limit = 40): string[] => {
  if (!text.trim()) return [];
  const haystack = text.toLowerCase();
  const found: string[] = [];

  for (const skill of SKILLS) {
    const pattern = AMBIGUOUS.has(skill)
      ? new RegExp(`(^|[^a-z0-9+#.])${escapeRegex(skill)}([^a-z0-9+#.]|$)`, 'i')
      : new RegExp(`(^|[^a-z0-9])${escapeRegex(skill)}([^a-z0-9]|$)`, 'i');
    if (pattern.test(haystack)) found.push(skill);
    if (found.length >= limit) break;
  }

  return found;
};

/** CV text we are willing to store, capped and stripped of stray whitespace. */
export const normalizeResumeText = (raw: string): string =>
  raw
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 40_000);
