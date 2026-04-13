import { get } from '@/lib/fetch';
import { KanbanBoard } from '@/components/features/applications/views/kanban';
import { ViewToolbar } from '@/components/features/applications/views/toolbar';
import { CreateApplicationDialog } from '@/components/features/applications/create-application-dialog';
import type {
  PaginatedApplications,
  ApplicationSortBy,
} from '@repo/db/query/application';
import { ApplicationStatus } from '@repo/db/types/application/status';
import { str } from '@/utils/utils';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AppMainPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const search = str(params.search);
  const sortBy = str(params.sortBy) as ApplicationSortBy | undefined;
  const sortOrder = str(params.sortOrder) as 'asc' | 'desc' | undefined;
  const hiddenParam = str(params.hidden) ?? '';
  const hiddenStatuses = new Set(
    hiddenParam ? (hiddenParam.split(',') as ApplicationStatus[]) : [],
  );

  const query = new URLSearchParams({ limit: '500' });
  if (search) query.set('search', search);
  if (sortBy) query.set('sortBy', sortBy);
  if (sortOrder) query.set('sortOrder', sortOrder);

  const result = await get<PaginatedApplications>(
    `/applications?${query.toString()}`,
  );
  const applications = result.ok ? result.data.data : [];
  const total = result.ok ? result.data.total : 0;

  return (
    <div className="flex flex-1 flex-col min-h-0 w-full">
      <ViewToolbar total={total} actions={<CreateApplicationDialog />} />
      <KanbanBoard applications={applications} hiddenColumns={hiddenStatuses} />
    </div>
  );
}
