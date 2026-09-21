import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/marketing/page-header';
import { LegalBody, type LegalSection } from '@/components/marketing/legal';
import { CONTACT_EMAIL } from '@/lib/site';

// Drafted from what the codebase actually does. Have it reviewed before launch.
export const metadata: Metadata = {
  title: 'Privacy — pathpipe',
  description: 'What pathpipe stores about you, why, and how to get it back.',
};

const SECTIONS: LegalSection[] = [
  {
    title: 'Who is responsible',
    body: [
      <>
        pathpipe is operated by Arqetype, France. For anything in this policy,
        write to{' '}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="underline underline-offset-4"
        >
          {CONTACT_EMAIL}
        </a>
        .
      </>,
    ],
  },
  {
    title: 'What is stored',
    body: [
      'Your account: email address, name, and either a password hash or the identifier returned by Google or LinkedIn if you signed in through them.',
      'Your search: job preferences, the weight you give each criterion, exclusions, the companies you follow, and every application you record with its status, dates and notes.',
      'Your documents: the résumés and letters you upload, plus the profile fields extracted from them.',
      'Operational data: server logs needed to run the service and to investigate abuse or failures.',
    ],
  },
  {
    title: 'Why it is stored',
    body: [
      'To run the service you asked for: matching openings against your profile, keeping your pipeline, and sending the emails you need — account verification, password reset, and the job digest if you turned it on.',
      'Nothing here is used to build advertising profiles, and no part of your account is sold, rented or shown to recruiters.',
    ],
  },
  {
    title: 'How résumés are handled',
    body: [
      'Uploaded files are stored on your account and read to extract skills, seniority and domain. Extraction is keyword-based and runs on our own servers: your CV is not sent to a model provider and is not used to train anything.',
    ],
  },
  {
    title: 'Job postings',
    body: [
      <>
        Postings come from employers and the systems that host their job boards,
        not from you. The sources are listed on the{' '}
        <Link href="/data-sources" className="underline underline-offset-4">
          data sources
        </Link>{' '}
        page.
      </>,
    ],
  },
  {
    title: 'Who else sees it',
    body: [
      'Only the providers needed to run the service: hosting, the database, and the mail provider that delivers your emails. Google and LinkedIn are involved only if you chose to sign in with them.',
    ],
  },
  {
    title: 'How long it is kept',
    body: [
      'Account data is kept while the account exists. Ask us to delete it and the account, its documents and its applications are removed; logs age out on their own retention cycle.',
    ],
  },
  {
    title: 'Your rights',
    body: [
      <>
        Under the GDPR you can ask for access, correction, export, restriction
        or deletion of your data, and you can object to processing. Write to{' '}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="underline underline-offset-4"
        >
          {CONTACT_EMAIL}
        </a>{' '}
        and you will get an answer within one month. You may also complain to
        the CNIL.
      </>,
    ],
  },
];

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Privacy"
        intro="A job search is sensitive. This page says exactly what is stored and what is not."
      />
      <LegalBody updatedAt="21 September 2026" sections={SECTIONS} />
    </>
  );
}
