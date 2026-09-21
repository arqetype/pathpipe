import Link from 'next/link';

// Credited in full on /data-sources.
const SOURCES = [
  'Greenhouse',
  'Lever',
  'Ashby',
  'SmartRecruiters',
  'Teamtailor',
  'Personio',
  'Workday',
];

export function Sources() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
        <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
          Read from the employer&apos;s own job board.{' '}
          <Link
            href="/data-sources"
            className="text-foreground underline underline-offset-4 transition-colors hover:text-primary"
          >
            Every source, credited
          </Link>
          .
        </p>

        <ul className="flex flex-wrap items-center gap-2 lg:justify-end">
          {SOURCES.map((name) => (
            <li
              key={name}
              className="rounded-full border border-border bg-surface-sunken px-4 py-2 text-sm font-medium text-foreground/70"
            >
              {name}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
