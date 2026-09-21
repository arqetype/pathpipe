import type { ParsedLocation } from '@repo/db/parsing/location';

export interface DiscoveredJob {
  externalId?: string;
  title: string;
  url: string;
  description?: string;
  descriptionHtml?: string;
  location?: string;
  locations?: string[];
  parsedLocations?: ParsedLocation[];
  department?: string;
  domain?: string;
  seniority?: string;
  employmentType?: string;
  remote?: boolean;
  remoteType?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  postedAt?: string;
  validThrough?: string;
}

export type DiscoveryStrategy = 'ats-api';

export interface SourceFingerprint {
  etag?: string | null;
  lastModified?: string | null;
  contentHash?: string | null;
  jobCount?: number | null;
}

export interface DiscoveryResult {
  jobs: DiscoveredJob[];
  strategy?: DiscoveryStrategy;
  platform?: string;
  resolvedUrl?: string;
  fingerprint?: SourceFingerprint;
  notModified?: boolean;
  partial?: boolean;
  error?: string;
}

export interface DiscoverOptions {
  previous?: SourceFingerprint | null;
  fastOnly?: boolean;
}

export interface AtsTarget {
  platform: string;
  params: Record<string, string>;
}

export interface AdapterContext {
  http: HttpFetcher;
  log: (data: Record<string, unknown>, msg: string) => void;
  // A partial listing must say so.
  markPartial?: (reason: string) => void;
  light?: boolean;
}

export interface HttpResponse {
  status: number;
  ok: boolean;
  url: string;
  body: string;
  retryAfter: string | null;
}

export interface HttpRequestOptions {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  skipRobots?: boolean;
}

export interface HttpFetcher {
  request(url: string, options?: HttpRequestOptions): Promise<HttpResponse>;
  json<T>(url: string, options?: HttpRequestOptions): Promise<T | null>;
}

export interface AtsAdapter {
  platform: string;
  match(url: URL): AtsTarget | null;
  fetch(target: AtsTarget, ctx: AdapterContext): Promise<DiscoveredJob[]>;
}
