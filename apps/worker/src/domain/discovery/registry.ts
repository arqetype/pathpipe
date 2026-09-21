import type { AtsAdapter, AtsTarget } from './types';
import { greenhouseAdapter } from './adapters/greenhouse';
import { leverAdapter } from './adapters/lever';
import { ashbyAdapter } from './adapters/ashby';
import { smartRecruitersAdapter } from './adapters/smartrecruiters';
import { workdayAdapter } from './adapters/workday';
import { teamtailorAdapter } from './adapters/teamtailor';
import { personioAdapter } from './adapters/personio';

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
