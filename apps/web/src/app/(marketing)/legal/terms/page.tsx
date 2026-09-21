import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/marketing/page-header';
import { LegalBody, type LegalSection } from '@/components/marketing/legal';
import { CONTACT_EMAIL } from '@/lib/site';

// Drafted from what the codebase actually does. Have it reviewed before launch.
export const metadata: Metadata = {
  title: 'Terms — pathpipe',
  description: 'The rules for using pathpipe, in plain language.',
};

const SECTIONS: LegalSection[] = [
  {
    title: 'The service',
    body: [
      'pathpipe collects job openings published by employers, scores them against the profile you fill in, and lets you track the applications you send. It does not apply on your behalf and does not promise you a job, an interview or a reply.',
    ],
  },
  {
    title: 'Your account',
    body: [
      'You need an account, one per person, with accurate contact details. You are responsible for what happens under it, so keep your credentials to yourself and tell us if you think they leaked.',
      'You must be old enough to work where you are applying.',
    ],
  },
  {
    title: 'Beta',
    body: [
      'pathpipe is in beta and free. Features move, break and get replaced; availability is best effort. If a paid plan arrives you will be told before anything is charged, and nothing is charged without you agreeing to it.',
    ],
  },
  {
    title: 'What you upload',
    body: [
      'Your documents and notes stay yours. You give pathpipe permission to store and process them for one purpose: running your account. Do not upload anything you have no right to share, and do not upload other people’s personal data.',
    ],
  },
  {
    title: 'Job data',
    body: [
      <>
        Postings belong to the employers that published them and are read from
        the sources listed on the{' '}
        <Link href="/data-sources" className="underline underline-offset-4">
          data sources
        </Link>{' '}
        page. pathpipe shows them for your personal job search; it does not
        licence them to you for redistribution, resale or bulk extraction.
      </>,
      'Accuracy and availability depend on the employer. A posting can be out of date or already closed by the time you see it.',
    ],
  },
  {
    title: 'Fair use',
    body: [
      'No scraping the service, no automated bulk downloads, no reselling access, no attempt to reach other users’ data, no load that degrades it for everyone else. Break that and the account can be suspended.',
    ],
  },
  {
    title: 'Liability',
    body: [
      'The service is provided as is, without warranty. To the extent the law allows, pathpipe is not liable for indirect damage, lost opportunities or a job you did not get. Nothing here limits liability that cannot legally be limited.',
    ],
  },
  {
    title: 'Ending it',
    body: [
      <>
        You can stop at any time and ask for your account to be deleted by
        writing to{' '}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="underline underline-offset-4"
        >
          {CONTACT_EMAIL}
        </a>
        . We can close an account that breaks these terms. French law applies.
      </>,
    ],
  },
];

export default function TermsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Terms of use"
        intro="What you can expect from pathpipe, and what it expects from you."
      />
      <LegalBody updatedAt="21 September 2026" sections={SECTIONS} />
    </>
  );
}
