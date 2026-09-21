export const toArray = <T>(value: T | T[] | undefined): T[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

export const toBoolean = (
  value: boolean | string | undefined,
): boolean | undefined => {
  if (value === undefined || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  return value === 'true' || value === '1';
};

export const toInt = (
  value: number | string | undefined,
): number | undefined => {
  if (value === undefined || value === '') return undefined;
  const parsed = typeof value === 'number' ? value : Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const MAX_SEARCH_TERMS = 8;

export const toTsQuery = (raw: string): string | null => {
  const terms = raw
    .toLowerCase()
    .split(/[^\p{L}\p{N}+#.]+/u)
    .map((term) => term.replace(/^[.+#]+|[.+#]+$/g, ''))
    .filter((term) => term.length > 0)
    .slice(0, MAX_SEARCH_TERMS);

  if (!terms.length) return null;
  return terms.map((term) => `'${term}':*`).join(' & ');
};
