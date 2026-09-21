import {
  RiFilterLine,
  RiBellLine,
  RiUserSearchLine,
  RiCalendarCheckLine,
} from '@remixicon/react';
import { Eyebrow } from '@/components/marketing/eyebrow';

const WEIGHTS = [
  { criterion: 'Salary floor', weight: 'w-[86%]' },
  { criterion: 'Remote or hybrid', weight: 'w-[62%]' },
  { criterion: 'City', weight: 'w-[24%]' },
];

const DUPLICATES = ['Greenhouse', 'LinkedIn', 'Welcome to the Jungle'];

const SMALL = [
  {
    icon: RiFilterLine,
    title: 'Exclusions that stick',
    body: 'Mute a company, a keyword or a contract type once and it stays out — of the feed and of the email digest.',
  },
  {
    icon: RiBellLine,
    title: 'One digest, opt-in',
    body: 'Up to ten strong matches per email, only when the score clears the bar, only if you asked for it.',
  },
  {
    icon: RiUserSearchLine,
    title: 'Profile from your CV',
    body: 'Upload a résumé and your skills, seniority and domain are extracted for you. Correct anything that looks wrong.',
  },
  {
    icon: RiCalendarCheckLine,
    title: 'A dashboard that counts',
    body: 'Applications sent, interviews running, offers open, and what went quiet — in one view, not in your memory.',
  },
];

export function FeaturesGrid() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20 md:py-28">
      <Eyebrow>The details that keep it quiet</Eyebrow>
      <h2 className="mt-5 max-w-2xl text-balance text-[clamp(2rem,3.5vw,3rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-foreground">
        A job tracker only works if it stays out of the way
      </h2>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article className="rounded-2xl bg-surface-sunken p-6 sm:col-span-2 md:p-8">
          <h3 className="text-base font-medium text-foreground">
            Weighted matching
          </h3>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Salary matters more than city? Move the weight. The score follows
            your priorities instead of a vendor default.
          </p>

          <ul className="mt-8 flex flex-col gap-3 rounded-xl bg-background p-5 shadow-sm">
            {WEIGHTS.map(({ criterion, weight }) => (
              <li key={criterion} className="flex items-center gap-4">
                <span className="w-32 shrink-0 text-xs text-muted-foreground sm:w-36">
                  {criterion}
                </span>
                <span className="h-2 flex-1 rounded-full bg-muted">
                  <span
                    className={`block h-full rounded-full bg-primary ${weight}`}
                  />
                </span>
              </li>
            ))}
          </ul>
        </article>

        {SMALL.map(({ icon: Icon, title, body }) => (
          <article
            key={title}
            className="rounded-2xl border border-border bg-background p-6 md:p-8"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <Icon className="size-5 text-primary" />
            </span>
            <h3 className="mt-5 text-base font-medium text-foreground">
              {title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {body}
            </p>
          </article>
        ))}

        <article className="rounded-2xl bg-surface-sunken p-6 sm:col-span-2 md:p-8">
          <h3 className="text-base font-medium text-foreground">
            Deduplicated at ingest
          </h3>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            The same role published on several boards is collapsed into a single
            posting before it ever reaches your feed.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <ul className="flex flex-1 flex-col gap-1.5">
              {DUPLICATES.map((board) => (
                <li
                  key={board}
                  className="flex items-center justify-between gap-3 rounded-lg bg-background/60 px-3 py-2 text-xs text-muted-foreground"
                >
                  Senior Backend Engineer
                  <span className="shrink-0 text-muted-foreground/60">
                    {board}
                  </span>
                </li>
              ))}
            </ul>

            <span aria-hidden className="text-sm text-muted-foreground">
              →
            </span>

            <p className="flex flex-1 items-center justify-between gap-3 rounded-lg bg-background px-3 py-3 text-xs font-medium text-foreground shadow-sm">
              Senior Backend Engineer
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                1 posting
              </span>
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}
