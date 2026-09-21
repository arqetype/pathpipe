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
    <section className="border-y border-border bg-surface-sunken">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
        <p className="text-center font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Openings read from the employer&apos;s own job board
        </p>

        <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 md:gap-x-12">
          {SOURCES.map((name) => (
            <li
              key={name}
              className="text-base font-semibold tracking-tight text-foreground/45 transition-colors hover:text-foreground/70 md:text-lg"
            >
              {name}
            </li>
          ))}
        </ul>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          No scraped listings, no ghost jobs from six months ago.{' '}
          <Link
            href="/data-sources"
            className="text-foreground/80 underline underline-offset-4 transition-colors hover:text-foreground"
          >
            Every source, credited
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
