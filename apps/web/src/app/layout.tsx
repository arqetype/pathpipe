import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import CookieBanner from '../components/cookie-banner/cookie-banner';
import { ThemeProvider } from '@/components/providers/theme-provider';
// import { PostHogProvider } from '@/components/providers/posthog-provider';
import { CookieConsentProvider } from '@/components/providers/cookie-consent-provider';
import { Space_Grotesk, Geist } from 'next/font/google';

import '@repo/ui/globals.css';
import { Toaster } from '@repo/ui/components/sonner';
import { cn } from '@repo/ui/lib/utils';

const spaceGroteskHeading = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-heading',
});

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Weaver',
  description: 'A job tracking application with suggestions',
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default async function RootLayout({ children }: RootLayoutProps) {
  const cookieStore = await cookies();

  const initialConsent = cookieStore.get('cookieConsent')?.value === 'true';

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        'font-sans',
        'font-sans',
        geist.variable,
        spaceGroteskHeading.variable,
      )}
    >
      <body>
        <ThemeProvider>
          <CookieConsentProvider initialConsent={initialConsent}>
            <>{children}</>
            <CookieBanner />
          </CookieConsentProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
