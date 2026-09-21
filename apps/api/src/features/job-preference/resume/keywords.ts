// Multi-word entries match as phrases.
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

// Only skills in context.
const AMBIGUOUS = new Set(['r', 'go', 'rest', 'ux', 'soc', 'rag', 'iam']);

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Word boundaries: java != javascript.
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

export const normalizeResumeText = (raw: string): string =>
  raw
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 40_000);
