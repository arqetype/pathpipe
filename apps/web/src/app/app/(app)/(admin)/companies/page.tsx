import { CompanyStatus } from '@repo/db/entities/company';
import { CompaniesToolbar } from '@/components/features/companies/companies-list/toolbar';
import { CompaniesList } from '@/components/features/companies/companies-list';
import { CompanyDialog } from '@/components/features/companies/company-dialog';
import { str } from '@/utils/utils';
import { fetchCompaniesAction } from '@/actions/company/fetch';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

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
  const id = str(params.id) ?? null;
  const limit = 20;

  const { result, statusCounts } = await fetchCompaniesAction({
    status,
    page,
    limit,
    search,
    sortBy,
    sortOrder,
    industry,
  });

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
      <CompanyDialog id={id} />
    </div>
  );
}
