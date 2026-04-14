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

export function formatDate(date?: Date | string | null): string | null {
  if (!date) return null;
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}
