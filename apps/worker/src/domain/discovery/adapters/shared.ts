import type { AtsTarget } from '../types';

export const firstMatch = (text: string, patterns: RegExp[]): string | null => {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    const value = match?.[1];
    if (value) return value;
  }
  return null;
};

export const target = (
  platform: string,
  params: Record<string, string | undefined>,
): AtsTarget => ({
  platform,
  params: Object.fromEntries(
    Object.entries(params).filter(([, value]) => Boolean(value)),
  ) as Record<string, string>,
});
export const subdomain = (url: URL): string | null => {
  const parts = url.hostname
    .toLowerCase()
    .replace(/^www\./, '')
    .split('.');
  if (parts.length < 3) return null;
  const first = parts[0];
  return first && first !== 'jobs' && first !== 'careers' ? first : null;
};

export const strings = (
  ...values: Array<string | null | undefined>
): string[] => values.filter((value): value is string => Boolean(value));

export const asString = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number') return String(value);
  return undefined;
};

export const joinLocation = (
  ...parts: Array<string | undefined | null>
): string | undefined => {
  const unique = [
    ...new Set(parts.filter((p): p is string => Boolean(p && p.trim()))),
  ];
  return unique.length ? unique.join(', ') : undefined;
};
