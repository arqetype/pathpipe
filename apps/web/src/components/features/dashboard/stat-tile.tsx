import Link from 'next/link';
import { cn } from '@repo/ui/lib/utils';

interface StatTileProps {
  label: string;
  value: number | string;
  href: string;
  /** Small square of colour matching the status dot used on the board. */
  dotClass?: string;
}

/**
 * One figure.
 *
 * The tile is the link: the number is the question ("how many are waiting?") and
 * clicking it opens the board that answers it.
 */
export function StatTile({ label, value, href, dotClass }: StatTileProps) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-1 rounded-lg border px-3 py-2 transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {dotClass && <span className={cn('size-1.5 rounded-full', dotClass)} />}
        {label}
      </span>
      <span className="text-xl font-medium tabular-nums">{value}</span>
    </Link>
  );
}
