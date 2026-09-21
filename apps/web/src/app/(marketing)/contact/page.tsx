import type { Metadata } from 'next';
import Link from 'next/link';
import { RiMailLine, RiGithubFill, RiBugLine } from '@remixicon/react';
import { PageHeader } from '@/components/marketing/page-header';
import { CONTACT_EMAIL, GITHUB_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Contact — pathpipe',
  description: 'How to reach the people building pathpipe.',
};

const CHANNELS = [
  {
    icon: RiMailLine,
    title: 'Email',
    body: 'Questions, invite requests, anything about your account or your data.',
    href: `mailto:${CONTACT_EMAIL}`,
    label: CONTACT_EMAIL,
  },
  {
    icon: RiBugLine,
    title: 'Bug or missing feature',
    body: 'Open an issue — it lands straight where the work is planned.',
    href: `${GITHUB_URL}/issues/new`,
    label: 'Open an issue',
  },
  {
    icon: RiGithubFill,
    title: 'The code itself',
    body: 'Read how matching, ingestion and storage actually work.',
    href: GITHUB_URL,
    label: 'github.com/arqetype/pathpipe',
  },
];

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Talk to a person"
        intro="No ticket queue, no chatbot. Three ways in, all of them read by the people who write the code."
      />

      <div className="mx-auto max-w-3xl px-4 pb-20 md:px-6">
        <ul className="mt-8 grid gap-4">
          {CHANNELS.map(({ icon: Icon, title, body, href, label }) => (
            <li key={title}>
              <Link
                href={href}
                target={href.startsWith('mailto:') ? undefined : '_blank'}
                rel="noopener"
                className="flex items-start gap-4 rounded-xl border border-border bg-card p-6 transition-colors hover:border-foreground/20"
              >
                <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
                <div>
                  <h2 className="text-base font-semibold tracking-tight text-foreground">
                    {title}
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {body}
                  </p>
                  <p className="mt-2 text-sm text-foreground/80 underline underline-offset-4">
                    {label}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-sm leading-relaxed text-muted-foreground">
          Already have an account? Write from the address you signed up with —
          it is how your account gets found without asking you for anything
          else.
        </p>
      </div>
    </>
  );
}
