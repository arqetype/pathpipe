import { get } from '@/lib/fetch';
import { KanbanBoard } from '@/components/features/applications/views/kanban';
import { ViewToolbar } from '@/components/features/applications/views/toolbar';
import { CreateApplicationDialog } from '@/components/features/applications/create-application-dialog';
import type {
  PaginatedCandidates,
  CandidateSortBy,
} from '@repo/db/query/candidate';
import { CandidateStage } from '@repo/db/types/candidate/stage';
import { str } from '@/utils/utils';
import { ScrollArea, ScrollBar } from '@repo/ui/components/scroll-area';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AppMainPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const search = str(params.search);
  const sortBy = str(params.sortBy) as CandidateSortBy | undefined;
  const sortOrder = str(params.sortOrder) as 'asc' | 'desc' | undefined;
  const hiddenParam = str(params.hidden) ?? '';
  const hiddenStatuses = new Set(
    hiddenParam ? (hiddenParam.split(',') as CandidateStage[]) : [],
  );

  const query = new URLSearchParams({ limit: '500' });
  if (search) query.set('search', search);
  if (sortBy) query.set('sortBy', sortBy);
  if (sortOrder) query.set('sortOrder', sortOrder);

  const result = await get<PaginatedCandidates>(
    `/applications?${query.toString()}`,
  );
  const applications = result.ok ? result.data.data : [];
  const total = result.ok ? result.data.total : 0;

  return (
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
  );
}
