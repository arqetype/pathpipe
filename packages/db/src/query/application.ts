import { Application } from '../entities/application';
import { ApplicationStatus } from '../types/application/status';

export type ApplicationSortBy = keyof Application;

export interface ApplicationsQuery {
  status?: ApplicationStatus | ApplicationStatus[];
  search?: string;
  /** Exact city names, as stored. Several are read as "any of these". */
  city?: string | string[];
  /** ISO 3166-1 alpha-2 codes. */
  country?: string | string[];
  sortBy?: ApplicationSortBy;
  sortOrder?: 'asc' | 'desc';
  page?: number | string;
  limit?: number | string;
}

export interface PaginatedApplications {
  data: Application[];
  total: number;
}

/**
 * One place, as the autocomplete offers it.
 *
 * Either half may be empty — a country with no city, or a city whose country
 * nobody recorded — so both are sent rather than one formatted line, and the
 * caller decides how to write it.
 */
export interface LocationSuggestion {
  city: string;
  country: string;
}
