import type { Metadata } from 'next';
import Link from 'next/link';
import { RiCheckLine } from '@remixicon/react';
import { PageHeader } from '@/components/marketing/page-header';
import { SIGNUP_CLOSED } from '@/lib/signup-closed';
import { CONTACT_EMAIL } from '@/lib/site';
import { buttonVariants } from '@repo/ui/components/button';
import { cn } from '@repo/ui/lib/utils';

export const metadata: Metadata = {
  title: 'Pricing — pathpipe',
  description:
    'pathpipe is free while it is in beta. One account, every feature, no card.',
};

const INCLUDED = [
  'Scored matches from every supported job board',
  'Unlimited applications, companies and documents',
  'Weighted criteria and exclusions',
  'The opt-in email digest',
  'Résumé parsing to pre-fill your profile',
];

export default function PricingPage() {
  return (
    <>
      <PageHeader
        eyebrow="Pricing"
        title="Free while pathpipe is in beta"
        intro="One plan, every feature, no card. The beta is how the product gets good — you are not paying to test it."
      />

      <div className="mx-auto max-w-2xl px-4 pb-16 md:px-6">
        <div className="mt-8 rounded-2xl border border-border bg-card p-8 md:p-10">
          <div className="flex items-baseline gap-2">
            <span className="font-heading text-5xl font-bold tracking-tight text-foreground">
              €0
            </span>
            <span className="text-sm text-muted-foreground">
              per month, during the beta
            </span>
          </div>

          <ul className="mt-8 flex flex-col gap-3">
            {INCLUDED.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <RiCheckLine className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="text-sm text-foreground/80">{item}</span>
              </li>
            ))}
          </ul>

          <Link
            href={SIGNUP_CLOSED ? '/contact' : '/app/sign-up'}
            className={cn(buttonVariants({ size: 'lg' }), 'mt-8 w-full')}
          >
            {SIGNUP_CLOSED ? 'Ask for an invite' : 'Create your account'}
          </Link>
        </div>

        <div className="mt-10 rounded-xl border border-border p-6">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            And after the beta?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Reading job boards and sending digests costs money, so a paid plan
            will exist eventually. Two things will not change: accounts created
            during the beta keep working, and pathpipe will never make its money
            by selling your profile to recruiters. Questions before then —{' '}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-foreground/80 underline underline-offset-4 transition-colors hover:text-foreground"
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </div>
      </div>
    </>
  );
}
