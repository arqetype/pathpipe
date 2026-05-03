export interface CompanySearchQuery {
  query?: string;
  limit?: number | string;
}

export interface CompanySearchResult {
  id: string;
  name: string;
  logoUrl?: string;
}
