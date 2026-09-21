'use client';

import {
  RiRadarLine,
  RiStackLine,
  RiBuilding2Line,
  RiFileTextLine,
  RiCheckLine,
} from '@remixicon/react';
import { Badge } from '@repo/ui/components/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@repo/ui/components/tabs';

type BadgeVariant = 'success' | 'info' | 'warning' | 'neutral' | 'accent';

type Row = {
  title: string;
  meta: string;
  badge: { label: string; variant: BadgeVariant };
};

type Pillar = {
  value: string;
  label: string;
  icon: typeof RiRadarLine;
  heading: string;
  body: string;
  points: string[];
  rows: Row[];
};

const PILLARS: Pillar[] = [
  {
    value: 'matches',
    label: 'Matches',
    icon: RiRadarLine,
    heading: 'Openings that actually fit, with the reason attached',
    body: 'Every posting is scored against your profile — domain, seniority, contract, location, salary — and each score comes with the criteria it met and the ones it missed.',
    points: [
      'You decide how much each criterion weighs',
      'The same job on three boards collapses into one card',
      'Exclude a company or a keyword and it never comes back',
    ],
    rows: [
      {
        title: 'Senior Backend Engineer',
        meta: 'Qonto · Paris · Permanent',
        badge: { label: '92% fit', variant: 'success' },
      },
      {
        title: 'Platform Engineer',
        meta: 'Doctolib · Remote (EU)',
        badge: { label: '81% fit', variant: 'success' },
      },
      {
        title: 'Full Stack Developer',
        meta: 'Alan · Paris · Hybrid',
        badge: { label: '64% fit', variant: 'warning' },
      },
    ],
  },
  {
    value: 'pipeline',
    label: 'Pipeline',
    icon: RiStackLine,
    heading: 'One board for every application, from wishlist to offer',
    body: 'Move a card when something happens. Board or list, the pipeline is the single place that answers "where am I with this one?".',
    points: [
      'Wishlist, applied, interview, offer, rejected, ghosted',
      'Notes, contacts and the exact link you applied through',
      'Ghosted is a status, not a guess you have to keep in your head',
    ],
    rows: [
      {
        title: 'Staff Engineer',
        meta: 'Payfit · applied 12 days ago',
        badge: { label: 'Interview', variant: 'info' },
      },
      {
        title: 'Backend Engineer',
        meta: 'Swile · applied 3 days ago',
        badge: { label: 'Applied', variant: 'neutral' },
      },
      {
        title: 'Lead Developer',
        meta: 'Ledger · no reply in 31 days',
        badge: { label: 'Ghosted', variant: 'warning' },
      },
    ],
  },
  {
    value: 'companies',
    label: 'Companies',
    icon: RiBuilding2Line,
    heading: 'Watch the companies you want, not the job boards',
    body: 'Follow a company once. Its board is read at the source, and anything new lands in your matches before it reaches an aggregator.',
    points: [
      'Followed companies get priority in your feed',
      'One card per company: openings, applications, history',
      'Works for any employer running a supported ATS',
    ],
    rows: [
      {
        title: 'Qonto',
        meta: '4 open roles · 1 application',
        badge: { label: 'Watching', variant: 'accent' },
      },
      {
        title: 'Doctolib',
        meta: '11 open roles · 2 applications',
        badge: { label: 'Watching', variant: 'accent' },
      },
      {
        title: 'Alan',
        meta: '2 open roles · no application yet',
        badge: { label: 'Watching', variant: 'accent' },
      },
    ],
  },
  {
    value: 'documents',
    label: 'Documents',
    icon: RiFileTextLine,
    heading: 'Your CVs and letters, attached to the right application',
    body: 'Upload a résumé (PDF, DOCX or TXT, up to 8 MB) and pathpipe reads it to pre-fill your profile — skills, seniority, domain — so matching works from minute one.',
    points: [
      'One library, several tailored versions',
      'Each application remembers which CV you sent',
      'Parsing happens on your account, nothing is resold',
    ],
    rows: [
      {
        title: 'resume-backend-2026.pdf',
        meta: 'used in 7 applications',
        badge: { label: 'Default', variant: 'success' },
      },
      {
        title: 'resume-platform.pdf',
        meta: 'used in 2 applications',
        badge: { label: 'CV', variant: 'neutral' },
      },
      {
        title: 'cover-letter-qonto.pdf',
        meta: 'attached to Qonto · Staff Engineer',
        badge: { label: 'Letter', variant: 'info' },
      },
    ],
  },
];

export function Pillars() {
  return (
    <section
      id="features"
      className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-28"
    >
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
          Four screens. That&apos;s the whole job search.
        </h2>
        <p className="mt-4 text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
          Find the openings, track what you sent, watch the companies you care
          about, keep your documents where they belong.
        </p>
      </div>

      <Tabs defaultValue="matches" className="mt-12">
        <TabsList className="mx-auto flex-wrap">
          {PILLARS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value}>
              <Icon />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {PILLARS.map((pillar) => (
          <TabsContent
            key={pillar.value}
            value={pillar.value}
            className="mt-10"
          >
            <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
              <div>
                <h3 className="text-balance text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                  {pillar.heading}
                </h3>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
                  {pillar.body}
                </p>
                <ul className="mt-6 flex flex-col gap-3">
                  {pillar.points.map((point) => (
                    <li key={point} className="flex items-start gap-3">
                      <RiCheckLine className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span className="text-sm text-foreground/80">
                        {point}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <PillarPreview rows={pillar.rows} />
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}

function PillarPreview({ rows }: { rows: Row[] }) {
  return (
    <div
      aria-hidden
      className="rounded-xl border border-border bg-card p-2 shadow-xs"
    >
      <div className="flex items-center gap-1.5 px-3 py-2">
        <span className="size-2 rounded-full bg-border" />
        <span className="size-2 rounded-full bg-border" />
        <span className="size-2 rounded-full bg-border" />
      </div>
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <li
            key={row.title}
            className="flex items-center justify-between gap-4 rounded-lg bg-surface-sunken px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {row.title}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {row.meta}
              </p>
            </div>
            <Badge variant={row.badge.variant}>{row.badge.label}</Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
