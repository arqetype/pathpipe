import { WatchedCompany } from '@repo/db/query/company';
import { WatchlistCard } from './card';

export function WatchlistGrid({ companies }: { companies: WatchedCompany[] }) {
  if (companies.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No companies in your watchlist yet. Add one above.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {companies.map((company) => (
        <WatchlistCard key={company.id} company={company} />
      ))}
    </div>
  );
}
