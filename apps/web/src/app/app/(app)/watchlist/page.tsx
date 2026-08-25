import { WatchlistToolbar } from '@/components/features/watchlist/toolbar';
import { WatchlistGrid } from '@/components/features/watchlist/grid';
import { fetchWatchedCompaniesAction } from '@/actions/company/fetch-watched';

export default async function WatchlistPage() {
  const companies = await fetchWatchedCompaniesAction();

  return (
    <div className="flex flex-col gap-6 p-4">
      <WatchlistToolbar />
      <WatchlistGrid companies={companies} />
    </div>
  );
}
