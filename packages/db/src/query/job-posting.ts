import { JobPostingStatus } from '../types/job-posting/status';
import { JobPostingClosedReason } from '../types/job-posting/closed-reason';
import { EmploymentType } from '../types/job-posting/employment-type';
import { RemoteType } from '../types/job-posting/remote-type';

/** Which slice of the board to show — the filter bar. */
export interface JobPostingsQuery {
  /** Free text over title, location, department and description. */
  search?: string;
  status?: JobPostingStatus | JobPostingStatus[];
  companyId?: string | string[];
  /** Exact city names, as they appear on the offers. */
  city?: string | string[];
  /** ISO 3166-1 alpha-2. */
  country?: string | string[];
  remoteType?: RemoteType | RemoteType[];
  employmentType?: EmploymentType | EmploymentType[];
  department?: string | string[];
  salaryMin?: number | string;
  /**
   * Only offers scoring inside this band.
   *
   * A band rather than a floor: "show me what I have not already seen at the
   * top" is a real request, and so is hiding the 90%+ matches you have already
   * worked through.
   */
  minScore?: number | string;
  maxScore?: number | string;
  /** Only offers first published within the last N days. */
  postedWithinDays?: number | string;
  /** Only bookmarked offers. */
  saved?: boolean | string;
  /** Only offers already pushed to the applications board (or only those not). */
  tracked?: boolean | string;
  /** Only companies the user follows. */
  followed?: boolean | string;
  /**
   * Hide offers that fail a requirement of the user's profile.
   *
   * Off by default: a board that mislabels its contract type or its location
   * would make a real offer invisible and the user would never know it was
   * there. Ranking surfaces the good ones without hiding the rest.
   */
  onlyMatches?: boolean | string;
  /**
   * Include offers that have been taken down. Off by default: an expired offer
   * is noise unless the user is looking back at something they saved.
   */
  includeClosed?: boolean | string;
  sortBy?:
    | 'match'
    | 'relevance'
    | 'postedAt'
    | 'createdAt'
    | 'title'
    | 'salaryMax'
    | 'company';
  sortOrder?: 'asc' | 'desc';
  page?: number | string;
  limit?: number | string;
}

export interface JobPostingLocationResponse {
  city: string | null;
  region: string | null;
  country: string | null;
  raw: string;
}

/** Why an offer scored the way it did, in the words shown on the card. */
export interface JobMatchReason {
  kind:
    | 'domain'
    | 'seniority'
    | 'motivation'
    | 'resume'
    | 'employmentType'
    | 'city'
    | 'country'
    | 'remote'
    | 'title'
    | 'keyword'
    | 'required'
    | 'industry'
    | 'salary'
    | 'followed';
  label: string;
  /** False when the offer misses something the profile asked for. */
  met: boolean;
}

export interface JobPostingResponse {
  id: string;
  title: string;
  url: string;
  externalId: string | null;
  description: string | null;
  descriptionHtml: string | null;
  /** One label for the whole set of places. */
  location: string | null;
  locations: JobPostingLocationResponse[];
  department: string | null;
  employmentType: EmploymentType | null;
  remoteType: RemoteType | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  source: string | null;
  postedAt: string | null;
  validThrough: string | null;
  lastSeenAt: string | null;
  closedAt: string | null;
  closedReason: JobPostingClosedReason | null;
  companyId: string;
  companyName: string;
  /** True when the user follows this company. */
  followed: boolean;
  createdAt: string;
  updatedAt: string;

  // Per-user state. A missing interaction reads as NEW / not saved / not tracked.
  status: JobPostingStatus;
  saved: boolean;
  applicationId: string | null;

  /** 0–100 against the user's profile; null when they have not set one. */
  matchScore: number | null;
  matchReasons: JobMatchReason[];
}

/** One value of a filterable column with how many offers carry it. */
export interface JobPostingFacet {
  value: string;
  label: string;
  count: number;
}

/**
 * The counts behind the filter bar.
 *
 * Computed against the same filters as the results, minus the facet's own
 * dimension, so ticking one company does not empty the company list.
 */
export interface JobPostingFacets {
  companies: JobPostingFacet[];
  cities: JobPostingFacet[];
  countries: JobPostingFacet[];
  departments: JobPostingFacet[];
  employmentTypes: JobPostingFacet[];
  remoteTypes: JobPostingFacet[];
}

export interface PaginatedJobPostings {
  data: JobPostingResponse[];
  total: number;
  page: number;
  limit: number;
  facets: JobPostingFacets;
  /** Open offers the user has never opened, first seen in the last week. */
  newCount: number;
  /** True when the user has a profile, so the UI can offer to set one up. */
  hasProfile: boolean;
}
