import Link from 'next/link';
import { RiGithubFill, RiArrowRightUpLine } from '@remixicon/react';
import { Eyebrow } from '@/components/marketing/eyebrow';

const NUMBERS = [
  { value: '7', label: 'applicant tracking systems read at the source' },
  { value: '4', label: 'job boards used only to find who is hiring' },
  { value: '0', label: 'postings scraped, resold or invented' },
];

export function OpenSource() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20 md:py-28">
      <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-start lg:gap-20">
        <div>
          <Eyebrow>Built in the open</Eyebrow>
          <h2 className="mt-5 text-balance text-[clamp(2rem,3.5vw,3rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-foreground">
            You can read every line that touches your search
          </h2>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
            pathpipe is developed in public. How a match is scored, what gets
            stored, which sources are read and how often — it is all in the
            repository, not in a marketing claim.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="https://github.com/arqetype/pathpipe"
              target="_blank"
              rel="noopener"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              <RiGithubFill className="size-4" />
              Read the source
            </Link>
            <Link
              href="/data-sources"
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-border px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Where the data comes from
              <RiArrowRightUpLine className="size-4" />
            </Link>
          </div>
        </div>

        <dl className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          {NUMBERS.map(({ value, label }) => (
            <div
              key={label}
              className="flex items-baseline gap-5 rounded-2xl bg-surface-sunken p-6"
            >
              <dt className="text-4xl font-semibold tabular-nums tracking-tight text-primary">
                {value}
              </dt>
              <dd className="text-sm leading-relaxed text-muted-foreground">
                {label}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
