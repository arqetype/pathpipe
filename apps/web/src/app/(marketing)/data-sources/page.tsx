import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Data sources — pathpipe',
  description:
    'Where pathpipe gets its job and company data, and who to credit for it.',
};

const ATS = [
  { name: 'Greenhouse', href: 'https://www.greenhouse.com/' },
  { name: 'Lever', href: 'https://www.lever.co/' },
  { name: 'Ashby', href: 'https://www.ashbyhq.com/' },
  { name: 'SmartRecruiters', href: 'https://www.smartrecruiters.com/' },
  { name: 'Teamtailor', href: 'https://www.teamtailor.com/' },
  { name: 'Personio', href: 'https://www.personio.com/' },
  { name: 'Workday', href: 'https://www.workday.com/' },
];

const FEEDS = [
  { name: 'Himalayas', href: 'https://himalayas.app/' },
  { name: 'Arbeitnow', href: 'https://www.arbeitnow.com/' },
  { name: 'Remote OK', href: 'https://remoteok.com/' },
  { name: 'Jobicy', href: 'https://jobicy.com/' },
];

// Deliberately plain <a>: these links must be followed (no rel="nofollow"),
// which Remote OK, Jobicy, Arbeitnow and Himalayas require for API access.
function SourceList({ items }: { items: { name: string; href: string }[] }) {
  return (
    <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
      {items.map(({ name, href }) => (
        <li key={name}>
          <a
            href={href}
            target="_blank"
            rel="noopener"
            className="text-sm text-foreground/80 underline underline-offset-4 transition-colors hover:text-foreground"
          >
            {name}
          </a>
        </li>
      ))}
    </ul>
  );
}

export default function DataSourcesPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 pb-16 pt-24 md:pt-32">
      <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Data sources
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
        pathpipe does not write job postings. Everything it shows comes from the
        sources below, and this page credits them.
      </p>

      <section className="mt-12">
        <h2 className="font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Applicant tracking systems
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-foreground/80">
          Job postings are read from each vendor&apos;s own public job board
          API, one employer&apos;s board at a time. The posting itself belongs
          to the employer that published it; the vendor hosts it.
        </p>
        <SourceList items={ATS} />
      </section>

      <section className="mt-12">
        <h2 className="font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Company discovery feeds
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-foreground/80">
          These four job boards are read only for the names of companies that
          are currently hiring. Their postings are not copied, stored or shown
          in pathpipe — once a company name is known, its postings are read from
          that company&apos;s own applicant tracking system.
        </p>
        <SourceList items={FEEDS} />
      </section>
    </div>
  );
}
