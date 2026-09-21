import type { HttpResponse } from '@/domain/discovery/types';

export interface HostState {
  pausedUntil: number;
  strikes: number;
  requests: number;
  droppedForCycle: boolean;
}

// Bot filter, not server trouble.
const CHALLENGE_MARKERS =
  /(just a moment|attention required|checking your browser|cf-browser-verification|cf_chl_|enable javascript and cookies to continue|__cf_chl|access denied.*cloudflare|error 1015|you have been blocked)/i;

// Measured; raising these gets 429s.
export const VENDOR_DELAY_MS: Record<string, number> = {
  'personio.de': 3000,
  'personio.com': 3000,
  'teamtailor.com': 1500,
  // Their published Crawl-delay: 1.
  'remoteok.com': 1000,
  'lever.co': 1000,
};

export const MAX_RETRIES = 2;
export const DEFAULT_TIMEOUT_MS = 20_000;

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Seconds or HTTP date.
export const retryAfterMs = (header: string | null): number | null => {
  if (!header) return null;
  const seconds = Number(header.trim());
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(header);
  if (Number.isNaN(date)) return null;
  return Math.max(0, date - Date.now());
};

export const isChallenge = (response: HttpResponse): boolean => {
  if (response.status === 403 || response.status === 503) {
    return response.status === 403 || CHALLENGE_MARKERS.test(response.body);
  }
  return false;
};
