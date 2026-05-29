import { KanbanBoard } from '@/components/features/applications/views/kanban';
import { ViewToolbar } from '@/components/features/applications/views/toolbar';
import { CreateApplicationDialog } from '@/components/features/applications/create-application-dialog';
import type { ApplicationSortBy } from '@repo/db/query/application';
import { ApplicationStatus } from '@repo/db/types/application/status';
import { str } from '@/utils/utils';
import { ScrollArea, ScrollBar } from '@repo/ui/components/scroll-area';
import { fetchApplicationsAction } from '@/actions/application/fetch';
import { ApplicationDialog } from '@/components/features/applications/application-dialog';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AppMainPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const id = str(params.id) ?? null;
  const search = str(params.search);
  const sortBy = str(params.sortBy) as ApplicationSortBy | undefined;
  const sortOrder = str(params.sortOrder) as 'asc' | 'desc' | undefined;
  const hiddenParam = str(params.hidden) ?? '';
  const hiddenStatuses = new Set(
    hiddenParam ? (hiddenParam.split(',') as ApplicationStatus[]) : [],
  );

  const { result } = await fetchApplicationsAction({
    search,
    sortBy,
    sortOrder,
  });
  const applications = result.ok ? result.data.data : [];
  const total = result.ok ? result.data.total : 0;

  return (
    <>
      <div className="flex flex-col h-full max-h-[calc(100vh-theme(space.12))]">
        <ViewToolbar total={total} actions={<CreateApplicationDialog />} />
        <ScrollArea className="flex-1 flex flex-col h-full overflow-y-auto w-full">
          <KanbanBoard
            applications={applications}
            hiddenColumns={hiddenStatuses}
          />
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
      <ApplicationDialog id={id} />
    </>
  );
}
