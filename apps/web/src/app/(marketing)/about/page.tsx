import type { Metadata } from 'next';
import Link from 'next/link';
import { RiGithubFill } from '@remixicon/react';
import { PageHeader } from '@/components/marketing/page-header';
import { GITHUB_URL } from '@/lib/site';
import { buttonVariants } from '@repo/ui/components/button';

export const metadata: Metadata = {
  title: 'About — pathpipe',
  description:
    'Why pathpipe exists, who builds it, and the rules it is built under.',
};

const PRINCIPLES = [
  {
    title: 'The candidate is the customer',
    body: 'Every product in this space eventually gets tempted to sell candidate profiles to recruiters. pathpipe has no recruiter side, so there is nothing to sell and no incentive to bend.',
  },
  {
    title: 'Read the source, not the aggregator',
    body: 'Postings are read from the employer’s own job board. That is why they are current, why duplicates collapse, and why a job that closed yesterday does not still sit in your feed.',
  },
  {
    title: 'Quiet beats clever',
    body: 'A tracker that pings you eleven times a day gets muted in a week. Scores, exclusions and one opt-in digest exist so that what reaches you is worth reading.',
  },
  {
    title: 'Nothing hidden',
    body: 'The code is public, the data sources are credited by name, and the scoring rules are readable. If a claim on this site is not in the repository, it should not be on this site.',
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About"
        title="Built by someone who kept the spreadsheet"
        intro="pathpipe started as a job-search spreadsheet that got out of hand: eleven columns, four job board alerts, and no honest answer to “which of these is actually worth my evening?”"
      />

      <div className="mx-auto max-w-3xl px-4 pb-20 md:px-6">
        <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-foreground/80 md:text-base">
          <p>
            Applying for jobs is a pipeline problem wearing a motivation
            costume. The hard part is not writing the cover letter — it is
            knowing what is out there, what you already sent, and what has gone
            quiet. Tools for that exist for sales teams. Candidates get a
            spreadsheet.
          </p>
          <p>
            So pathpipe was built the way a sales pipeline is built: postings
            read straight from employers’ job boards, scored against criteria
            you weight yourself, and tracked through the statuses a real search
            actually has — including <em>ghosted</em>, because pretending that
            state does not exist is how a tracker starts lying to you.
          </p>
          <p>
            It is made in France under the Arqetype name, in the open, by a very
            small team with the unfair advantage of being its own first user.
          </p>
        </div>

        <h2 className="mt-16 text-2xl font-semibold tracking-tight text-foreground">
          The rules it is built under
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {PRINCIPLES.map(({ title, body }) => (
            <li
              key={title}
              className="rounded-xl border border-border bg-card p-6"
            >
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {body}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link
            href={GITHUB_URL}
            target="_blank"
            rel="noopener"
            className={buttonVariants({ size: 'lg' })}
          >
            <RiGithubFill className="size-4" />
            Read the source
          </Link>
          <Link
            href="/contact"
            className={buttonVariants({ variant: 'outline', size: 'lg' })}
          >
            Get in touch
          </Link>
        </div>
      </div>
    </>
  );
}
