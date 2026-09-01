import Link from 'next/link';
import { Badge } from '@repo/ui/components/badge';
import { buttonVariants } from '@repo/ui/components/button';
import { cn } from '@repo/ui/lib/utils';
import type { DashboardApplication } from '@repo/db/query/dashboard';
import { ApplicationTier } from '@repo/db/types/application/tier';
import { TIER_CONFIG } from '@/components/features/applications/constants/tier';
import { applicationDetail } from './links';

/** How long it has been sitting there, in the units the board thinks in. */
const age = (days: number): string => {
  if (days <= 0) return 'today';
  if (days === 1) return '1 day';
  if (days < 14) return `${days} days`;
  if (days < 60) return `${Math.floor(days / 7)} weeks`;
  return `${Math.floor(days / 30)} months`;
};

interface ApplicationItemProps {
  application: DashboardApplication;
  /** The words on the action button, e.g. "Open offer". */
  actionLabel: string;
}

/**
 * One application.
 *
 * The row is not one big link: the title opens the record, and the offer's own
 * page is a second target. Nesting the two would make one of them unreachable.
 */
export function ApplicationItem({
  application,
  actionLabel,
}: ApplicationItemProps) {
  const tier =
    application.tier && application.tier !== ApplicationTier.NONE
      ? TIER_CONFIG[application.tier]
      : null;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent/50">
      <Link
        href={applicationDetail(application.id)}
        className="min-w-0 flex-1 focus-visible:outline-none"
      >
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{application.position}</p>
          {tier && (
            <Badge
              variant="outline"
              className={cn('shrink-0 font-normal', tier.className)}
            >
              {tier.label}
            </Badge>
          )}
        </div>
        <p className="truncate text-sm text-muted-foreground">
          {application.companyName ?? 'No company'} ·{' '}
          {age(application.daysSince)}
        </p>
      </Link>

      {application.url && (
        <a
          href={application.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'shrink-0',
          )}
        >
          {actionLabel}
        </a>
      )}
    </div>
  );
}
