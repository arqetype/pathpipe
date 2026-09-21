import Link from 'next/link';
import { RiLockLine, RiEyeOffLine, RiShieldCheckLine } from '@remixicon/react';
import { Eyebrow } from '@/components/marketing/eyebrow';

const GUARANTEES = [
  {
    icon: RiLockLine,
    title: 'Your CV stays here',
    body: 'Résumés are parsed on our own servers, with plain keyword extraction. Nothing leaves the account it was uploaded to.',
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
    <div className="px-4 py-10 md:py-14">
      <section className="dark rounded-2xl bg-background px-6 py-16 text-foreground md:rounded-3xl md:px-12 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <Eyebrow>Privacy</Eyebrow>
            <h2 className="mt-5 text-balance text-[clamp(2rem,3.5vw,3rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
              A job search is{' '}
              <em className="font-normal italic text-primary">private</em>. It
              should stay that way.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              Looking for a job while employed is the most sensitive thing most
              people do online. pathpipe is built on that assumption.
            </p>
          </div>

          <ul className="mt-12 grid gap-3 md:grid-cols-3">
            {GUARANTEES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="rounded-2xl bg-white/5 p-6 md:p-8">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15">
                  <Icon className="size-5 text-primary" />
                </span>
                <h3 className="mt-5 text-base font-medium">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </li>
            ))}
          </ul>

          <p className="mt-8 text-sm text-muted-foreground">
            <Link
              href="/data-sources"
              className="underline underline-offset-4 transition-colors hover:text-foreground"
            >
              Read how job data is collected
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
