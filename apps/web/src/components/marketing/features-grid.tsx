import {
  RiScales3Line,
  RiFilterLine,
  RiBellLine,
  RiDatabase2Line,
  RiCalendarCheckLine,
  RiUserSearchLine,
} from '@remixicon/react';

const FEATURES = [
  {
    icon: RiScales3Line,
    title: 'Weighted matching',
    body: 'Salary matters more than city? Move the weight. The score follows your priorities instead of a vendor default.',
  },
  {
    icon: RiDatabase2Line,
    title: 'Deduplicated at ingest',
    body: 'The same role published on several boards is collapsed into a single posting before it ever reaches your feed.',
  },
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
    <section className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          The details that decide whether you keep using it
        </h2>
        <p className="mt-4 text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
          A job tracker only works if it stays quiet. These are the parts that
          keep the noise down.
        </p>
      </div>

      <ul className="mt-12 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <li key={title} className="bg-background p-6 md:p-8">
            <div className="flex size-9 items-center justify-center rounded-lg bg-surface-sunken">
              <Icon className="size-4.5 text-primary" />
            </div>
            <h3 className="mt-4 text-base font-semibold tracking-tight text-foreground">
              {title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {body}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
