import type { HttpFetcher } from './types';
import { VENDORS, type VendorProbe } from './vendors/probes';

export * from './vendors/probes';
export * from './vendors/tokens';

export interface BoardHit {
  platform: string;
  token: string;
  careersUrl: string;
  jobCount: number;
}

const countFor = async (
  http: HttpFetcher,
  vendor: VendorProbe,
  token: string,
): Promise<number> => {
  const url = vendor.url(token);

  if (vendor.countJobsInBody) {
    const response = await http
      .request(url, { skipRobots: true })
      .catch(() => null);
    if (!response?.ok || !response.body) return 0;
    return vendor.countJobsInBody(response.body);
  }

  const payload = await http
    .json<unknown>(url, { skipRobots: true })
    .catch(() => null);
  return payload ? vendor.countJobs(payload) : 0;
};

export const probeToken = async (
  http: HttpFetcher,
  token: string,
  vendors: VendorProbe[] = VENDORS,
): Promise<BoardHit | null> => {
  for (const vendor of vendors) {
    const jobCount = await countFor(http, vendor, token);
    if (jobCount > 0) {
      return {
        platform: vendor.platform,
        token,
        careersUrl: vendor.careersUrl(token),
        jobCount,
      };
    }
  }
  return null;
};
