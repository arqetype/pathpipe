import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { Space_Grotesk, Geist } from 'next/font/google';

import '@repo/ui/globals.css';
import { cn } from '@repo/ui/lib/utils';

const spaceGroteskHeading = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-heading',
});

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'pathpipe',
  description: 'A job tracking application with suggestions',
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default async function RootLayout({ children }: RootLayoutProps) {
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
          <>{children}</>
        </ThemeProvider>
      </body>
    </html>
  );
}
