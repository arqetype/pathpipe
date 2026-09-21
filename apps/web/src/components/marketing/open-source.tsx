import Link from 'next/link';
import { RiGithubFill, RiArrowRightUpLine } from '@remixicon/react';
import { buttonVariants } from '@repo/ui/components/button';

const NUMBERS = [
  { value: '7', label: 'applicant tracking systems read at the source' },
  { value: '4', label: 'job boards used only to find who is hiring' },
  { value: '0', label: 'postings scraped, resold or invented' },
];

export function OpenSource() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-28">
      <div className="rounded-2xl border border-border bg-card p-8 md:p-12">
        <div className="grid gap-10 md:grid-cols-2 md:items-center md:gap-16">
          <div>
            <span className="font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Built in the open
            </span>
            <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              You can read every line that touches your search
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
              pathpipe is developed in public. How a match is scored, what gets
              stored, which sources are read and how often — it is all in the
              repository, not in a marketing claim.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="https://github.com/arqetype/pathpipe"
                target="_blank"
                rel="noopener"
                className={buttonVariants({ size: 'lg' })}
              >
                <RiGithubFill className="size-4" />
                Read the source
              </Link>
              <Link
                href="/data-sources"
                className={buttonVariants({ variant: 'outline', size: 'lg' })}
              >
                Where the data comes from
                <RiArrowRightUpLine className="size-4" />
              </Link>
            </div>
          </div>

          <dl className="grid gap-6 sm:grid-cols-3 md:gap-4">
            {NUMBERS.map(({ value, label }) => (
              <div key={label}>
                <dt className="font-heading text-4xl font-bold tracking-tight text-primary">
                  {value}
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {label}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
