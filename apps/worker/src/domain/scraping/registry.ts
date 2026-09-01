import type { AtsAdapter, AtsTarget } from './types';
import { greenhouseAdapter } from './adapters/greenhouse';
import { leverAdapter } from './adapters/lever';
import { ashbyAdapter } from './adapters/ashby';
import { smartRecruitersAdapter } from './adapters/smartrecruiters';
import { workdayAdapter } from './adapters/workday';
import { teamtailorAdapter } from './adapters/teamtailor';
import { personioAdapter } from './adapters/personio';

/**
 * Order matters: the first adapter that claims a URL or a page wins, so the
 * ones with the tightest patterns come first.
 *
 * Every adapter here has been verified against a live board. Adding a vendor
 * means writing the adapter and confirming it with `pnpm --filter worker probe`
 * before it lands.
 */
export const ADAPTERS: AtsAdapter[] = [
  greenhouseAdapter,
  leverAdapter,
  ashbyAdapter,
  smartRecruitersAdapter,
  teamtailorAdapter,
  personioAdapter,
  workdayAdapter,
];

export interface AdapterMatch {
  adapter: AtsAdapter;
  target: AtsTarget;
}

/** Identifies the ATS from the URL alone — no network access needed. */
export const matchAdapterByUrl = (rawUrl: string): AdapterMatch | null => {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  for (const adapter of ADAPTERS) {
    const target = adapter.match(url);
    if (target) return { adapter, target };
  }
  return null;
};

/**
 * Identifies the ATS from a company's own careers page. Most companies host a
 * marketing page that embeds their board via an iframe or a script tag, so the
 * vendor is named in the HTML even when the URL says nothing.
 */
export const detectAdapterInHtml = (
  html: string,
  pageUrl: string,
): AdapterMatch | null => {
  let url: URL;
  try {
    url = new URL(pageUrl);
  } catch {
    return null;
  }
  for (const adapter of ADAPTERS) {
    const target = adapter.detectInHtml?.(html, url);
    if (target) return { adapter, target };
  }
  return null;
};
