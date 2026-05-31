import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import CookieBanner from '../../components/cookie-banner/cookie-banner';
// import { PostHogProvider } from '@/components/providers/posthog-provider';
import { CookieConsentProvider } from '@/components/providers/cookie-consent-provider';

export const metadata: Metadata = {
  title: 'pathpipe: Job Tracking Application',
  description:
    'pathpipe is a job tracking application that helps you manage your job applications and provides suggestions to improve your chances of landing your dream job.',
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
      <>{children}</>
      <CookieBanner />
    </CookieConsentProvider>
  );
}
