import { get } from '@/lib/fetch';
import { KanbanBoard } from '@/components/features/applications/kanban/kanban-board';
import type { PaginatedApplications } from '@repo/db/query/application';
import { CreateApplicationDialog } from '@/components/features/applications/create-application-dialog';

export default async function AppMainPage() {
  const result = await get<PaginatedApplications>('/applications?limit=500');
  const applications = result.ok ? result.data.data : [];

  return (
    <div className="flex flex-1 flex-col min-h-0 w-full">
      <div className="flex items-center justify-between px-4 pt-4 pb-0">
        <p className="text-sm text-muted-foreground">
          {applications.length} application
          {applications.length !== 1 ? 's' : ''}
        </p>
        <CreateApplicationDialog />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
        <KanbanBoard applications={applications} />
      </div>
    </div>
  );
}
