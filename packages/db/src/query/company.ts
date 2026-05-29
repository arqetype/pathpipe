import { CompanyStatus } from '../entities/company';
import type { Company } from '../entities/company';
import { CompanyIndustry } from '../types/company/industry';

export type CompanySortBy =
  | 'name'
  | 'industry'
  | 'country'
  | 'status'
  | 'created_at'
  | 'updated_at';

export interface CompaniesQuery {
  search?: string;
  sortBy?: CompanySortBy;
  sortOrder?: 'asc' | 'desc';
  status?: CompanyStatus | CompanyStatus[];
  industry?: CompanyIndustry | CompanyIndustry[];
  page?: number | string;
  limit?: number | string;
}

export interface PaginatedCompanies {
  data: Company[];
  total: number;
  totalCounts: Record<CompanyStatus, number>;
}

export interface CompanySearchResult {
  id: string;
  name: string;
}
