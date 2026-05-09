import { get } from '@/lib/fetch';
import type { PaginatedCompanies } from '@repo/db/query/company';
import { CompanyStatus } from '@repo/db/entities/company';
import { CompaniesToolbar } from '@/components/features/companies/companies-list/toolbar';
import { CompaniesList } from '@/components/features/companies/companies-list';
import { CompanyDialog } from '@/components/features/companies/company-dialog';
import { str } from '@/utils/utils';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function getStatusCounts(): Promise<Record<CompanyStatus, number>> {
  const result = await get<PaginatedCompanies>('/companies?limit=1');
  return result.ok
    ? result.data.totalCounts
    : {
        [CompanyStatus.PENDING]: 0,
        [CompanyStatus.APPROVED]: 0,
        [CompanyStatus.REJECTED]: 0,
      };
}

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const search = str(params.search);
  const sortBy = str(params.sortBy);
  const sortOrder = str(params.sortOrder) as 'asc' | 'desc' | undefined;
  const industry = str(params.industry);
  const status = (str(params.status) as CompanyStatus) || CompanyStatus.PENDING;
  const page = Number(str(params.page)) || 1;
  const limit = 20;

  const query = new URLSearchParams();
  query.set('status', status);
  query.set('page', String(page));
  query.set('limit', String(limit));
  if (search) query.set('search', search);
  if (sortBy) query.set('sortBy', sortBy);
  if (sortOrder) query.set('sortOrder', sortOrder);
  if (industry) query.set('industry', industry);

  const [result, statusCounts] = await Promise.all([
    get<PaginatedCompanies>(`/companies?${query.toString()}`),
    getStatusCounts(),
  ]);

  const companies = result.ok ? result.data.data : [];
  const total = result.ok ? result.data.total : 0;
  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="flex flex-col gap-6 p-4">
      <CompaniesToolbar
        total={total}
        pendingCount={statusCounts[CompanyStatus.PENDING]}
        approvedCount={statusCounts[CompanyStatus.APPROVED]}
        rejectedCount={statusCounts[CompanyStatus.REJECTED]}
      />
      <CompaniesList
        companies={companies}
        currentPage={page}
        totalPages={totalPages}
      />
      <CompanyDialog />
    </div>
  );
}
