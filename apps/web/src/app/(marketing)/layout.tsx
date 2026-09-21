import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import CookieBanner from '../../components/cookie-banner/cookie-banner';
// import { PostHogProvider } from '@/components/providers/posthog-provider';
import { CookieConsentProvider } from '@/components/providers/cookie-consent-provider';
import { MarketingNavbar } from '@/components/marketing/navbar';
import { Footer } from '@/components/marketing/footer';

export const metadata: Metadata = {
  title: 'pathpipe: Job Tracking Application',
  description:
    "pathpipe reads openings from the employer's own job board, scores them against your profile, and tracks every application from the day you apply to the day you get an answer.",
};

type MarketingLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default async function MarketingLayout({
  children,
}: MarketingLayoutProps) {
  const cookieStore = await cookies();

  const initialConsent = cookieStore.get('cookieConsent')?.value === 'true';

  return (
    <CookieConsentProvider initialConsent={initialConsent}>
      <MarketingNavbar />
      <main>{children}</main>
      <Footer />
      <CookieBanner />
    </CookieConsentProvider>
  );
}
