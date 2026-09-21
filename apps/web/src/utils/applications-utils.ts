export function formatSalary(
  min?: number | null,
  max?: number | null,
): string | null {
  if (min == null && max == null) return null;
  const fmt = (n: number) =>
    n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);
  if (min != null && max != null) return `${fmt(min)}€ – ${fmt(max)}€`;
  if (min != null) return `${fmt(min)}+`;
  return `Up to ${fmt(max!)}€`;
}

/** "3d ago" — offers are compared by freshness far more than by exact date. */
export function relativeDate(value: string | null): string | null {
  if (!value) return null;
  const days = Math.floor(
    (Date.now() - new Date(value).getTime()) / 86_400_000,
  );
  if (!Number.isFinite(days) || days < 0) return null;
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function formatDate(date?: Date | string | null): string | null {
  if (!date) return null;
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}
