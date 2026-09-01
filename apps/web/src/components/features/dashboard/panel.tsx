import Link from 'next/link';
import type { ReactNode } from 'react';

interface PanelProps {
  title: string;
  /** Shown next to the title when there is more than what fits below. */
  count?: number;
  seeAllHref?: string;
  seeAllLabel?: string;
  /** What the panel says when it has nothing. */
  empty?: ReactNode;
  isEmpty?: boolean;
  children: ReactNode;
}

/**
 * A titled list.
 *
 * Rows sit flush against the edges rather than in padded cards: a row here is
 * one click, and a row that reads as a card invites reading instead.
 */
export function Panel({
  title,
  count,
  seeAllHref,
  seeAllLabel = 'View all',
  empty,
  isEmpty = false,
  children,
}: PanelProps) {
  return (
    <section className="flex flex-col overflow-hidden rounded-lg border">
      <header className="flex items-baseline gap-2 border-b px-4 py-2.5">
        <h2 className="text-sm font-medium">{title}</h2>
        {count !== undefined && count > 0 && (
          <span className="text-sm tabular-nums text-muted-foreground">
            {count}
          </span>
        )}
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="ml-auto text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            {seeAllLabel}
          </Link>
        )}
      </header>

      {isEmpty ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="divide-y">{children}</div>
      )}
    </section>
  );
}
