import Link from 'next/link';
import { RiLockLine, RiEyeOffLine, RiShieldCheckLine } from '@remixicon/react';

const GUARANTEES = [
  {
    icon: RiLockLine,
    title: 'Your CV stays here',
    body: 'Résumés are parsed on our own servers, with plain keyword extraction. No model vendor, no third party, no training set.',
  },
  {
    icon: RiEyeOffLine,
    title: 'No recruiter marketplace',
    body: 'pathpipe works for the candidate. Your profile is not listed, sold or pitched to anyone hiring.',
  },
  {
    icon: RiShieldCheckLine,
    title: 'Measured only if you say yes',
    body: 'Analytics stay off until you accept them in the banner. Decline and nothing about your session is recorded.',
  },
];

export function Privacy() {
  return (
    <section className="border-y border-border bg-surface-sunken">
      <div className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            A job search is private. It should stay that way.
          </h2>
          <p className="mt-4 text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
            Looking for a job while employed is the most sensitive thing most
            people do online. pathpipe is built on that assumption.
          </p>
        </div>

        <ul className="mt-12 grid gap-4 md:grid-cols-3">
          {GUARANTEES.map(({ icon: Icon, title, body }) => (
            <li
              key={title}
              className="rounded-xl border border-border bg-card p-6 md:p-8"
            >
              <Icon className="size-5 text-primary" />
              <h3 className="mt-4 text-base font-semibold tracking-tight text-foreground">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {body}
              </p>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Curious about the fine print?{' '}
          <Link
            href="/data-sources"
            className="text-foreground/80 underline underline-offset-4 transition-colors hover:text-foreground"
          >
            Read how job data is collected
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
