import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import CookieBanner from '../../components/cookie-banner/cookie-banner';
// import { PostHogProvider } from '@/components/providers/posthog-provider';
import { CookieConsentProvider } from '@/components/providers/cookie-consent-provider';

export const metadata: Metadata = {
  title: 'Pathpipe: Job Tracking Application',
  description:
    'Pathpipe is a job tracking application that helps you manage your job applications and provides suggestions to improve your chances of landing your dream job.',
};

type MarketingLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default async function MarketingLayout({
  children,
}: MarketingLayoutProps) {
  const cookieStore = await cookies();

  // if the user is already authenticated, redirect them to the app
  if (cookieStore.get('auth-token')) redirect('/app');

  const initialConsent = cookieStore.get('cookieConsent')?.value === 'true';

  return (
    <CookieConsentProvider initialConsent={initialConsent}>
      <>{children}</>
      <CookieBanner />
    </CookieConsentProvider>
  );
}
