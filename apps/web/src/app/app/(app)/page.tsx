import { fetchDashboardAction } from '@/actions/dashboard/fetch';
import { HomeDashboard } from '@/components/features/dashboard';

export default async function AppMainPage() {
  const dashboard = await fetchDashboardAction();

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <HomeDashboard dashboard={dashboard} />
    </div>
  );
}
