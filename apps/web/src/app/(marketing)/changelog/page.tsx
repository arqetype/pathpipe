import type { Metadata } from 'next';
import { PageHeader } from '@/components/marketing/page-header';
import { Badge } from '@repo/ui/components/badge';

export const metadata: Metadata = {
  title: 'Changelog — pathpipe',
  description: 'What shipped in pathpipe, newest first.',
};

type Entry = {
  date: string;
  tag: 'New' | 'Improved' | 'Fixed';
  title: string;
  body: string;
};

// Mirrors the repository history; add an entry when something user-visible ships.
const ENTRIES: Entry[] = [
  {
    date: '2026-09-21',
    tag: 'New',
    title: 'Every data source, credited',
    body: 'A public page now names the applicant tracking systems and job boards pathpipe reads, and spells out what each one is used for. Posting parsing was tightened at the same time, so fewer half-filled jobs reach your feed.',
  },
  {
    date: '2026-09-21',
    tag: 'Improved',
    title: 'Steadier discovery and posting lifecycle',
    body: 'Job discovery and the posting lifecycle were rebuilt around a single ingest path. Duplicates collapse earlier, and a posting that disappears from an employer’s board is now closed instead of lingering.',
  },
  {
    date: '2026-09-02',
    tag: 'New',
    title: 'Dashboard overview',
    body: 'A home screen that opens on the numbers that matter: applications in flight, interviews running, offers open, and what has gone quiet.',
  },
  {
    date: '2026-09-01',
    tag: 'New',
    title: 'Record where a job came from',
    body: 'An application now keeps the exact source and link you applied through, so following up does not start with a search through your history.',
  },
  {
    date: '2026-09-01',
    tag: 'New',
    title: 'Weighted criteria and CV parsing',
    body: 'Decide how much each criterion counts in the score, and upload a résumé to pre-fill skills, seniority and domain instead of typing them.',
  },
  {
    date: '2026-09-01',
    tag: 'New',
    title: 'Job matching board',
    body: 'Scored matches arrive from the ATS ingestion pipeline, with the criteria met and missed shown next to each opening.',
  },
  {
    date: '2026-08-26',
    tag: 'Improved',
    title: 'Discovery that scales',
    body: 'Company discovery moved to its own pipeline, so new employers are picked up without slowing down the boards already being read.',
  },
  {
    date: '2026-07-27',
    tag: 'Improved',
    title: 'Company watch list',
    body: 'Following companies became its own feature, with batch actions on applications and a faster list.',
  },
];

const TAG_VARIANT = {
  New: 'success',
  Improved: 'info',
  Fixed: 'neutral',
} as const;

export default function ChangelogPage() {
  return (
    <>
      <PageHeader
        eyebrow="Changelog"
        title="What shipped, and when"
        intro="pathpipe is built in the open. Every entry below matches a commit you can read in the repository."
      />

      <div className="mx-auto max-w-3xl px-4 pb-20 md:px-6">
        <ol className="mt-8 border-l border-border">
          {ENTRIES.map((entry) => (
            <li key={entry.title} className="relative pb-10 pl-6 md:pl-8">
              <span className="absolute -left-[4.5px] top-2 size-2 rounded-full bg-primary" />
              <div className="flex flex-wrap items-center gap-3">
                <time
                  dateTime={entry.date}
                  className="font-mono text-xs text-muted-foreground"
                >
                  {entry.date}
                </time>
                <Badge variant={TAG_VARIANT[entry.tag]}>{entry.tag}</Badge>
              </div>
              <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                {entry.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {entry.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}
