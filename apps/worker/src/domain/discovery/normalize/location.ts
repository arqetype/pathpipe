import { decodeEntities } from '@repo/db/parsing/sanitize';
import { foldAccents } from './text';

export const isRemote = (...values: Array<string | undefined>): boolean =>
  values.some((value) =>
    value
      ? /\b(remote|télétravail|teletravail|work from home|wfh|anywhere)\b/i.test(
          value,
        )
      : false,
  );

export const cleanLocation = (raw: string | undefined): string | undefined => {
  if (!raw) return undefined;
  const value = decodeEntities(raw)
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–—•|,:]+|[\s\-–—•|,:]+$/g, '')
    .trim();
  if (!value || value.length > 120) return undefined;
  if (/^(location|lieu|standort|ubicación)$/i.test(value)) return undefined;
  return value;
};

const HYBRID_PATTERN =
  /\b(hybrid|hybride|partially remote|remote[- ]friendly|flexible office|\d\s*days?\s*(a|per)\s*week\s*(in|at)\s*(the\s*)?office)\b/i;
const FULLY_REMOTE_PATTERN =
  /\b(fully remote|100% remote|remote[- ]first|remote[- ]only|full remote|teletravail total|work from anywhere)\b/i;
const ON_SITE_PATTERN =
  /\b(on[- ]?site|onsite|in[- ]office|in[- ]person|presentiel|vor ort)\b/i;

// Hybrid is tested before remote.
export const normalizeRemoteType = (
  flag: boolean | undefined,
  ...values: Array<string | undefined | null>
): string | undefined => {
  const text = foldAccents(values.filter(Boolean).join(' '));
  if (HYBRID_PATTERN.test(text)) return 'HYBRID';
  if (FULLY_REMOTE_PATTERN.test(text)) return 'REMOTE';
  if (flag === true) return 'REMOTE';
  if (ON_SITE_PATTERN.test(text)) return 'ON_SITE';
  if (isRemote(text)) return 'REMOTE';
  return undefined;
};
