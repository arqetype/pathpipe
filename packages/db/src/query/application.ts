import { Application } from '../entities/application';
import { ApplicationStatus } from '../types/application/status';

export type ApplicationSortBy = keyof Application;

export interface ApplicationsQuery {
  status?: ApplicationStatus | ApplicationStatus[];
  search?: string;
  sortBy?: ApplicationSortBy;
  sortOrder?: 'asc' | 'desc';
  page?: number | string;
  limit?: number | string;
}

export interface PaginatedApplications {
  data: Application[];
  total: number;
}
