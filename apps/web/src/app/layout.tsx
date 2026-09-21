import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { Geist, Geist_Mono } from 'next/font/google';

import '@repo/ui/globals.css';
import { cn } from '@repo/ui/lib/utils';

/**
 * One typeface for the interface, one for figures.
 *
 * Hierarchy is carried by size, weight and tracking rather than by a second
 * family — a display face in the headings makes a page look designed and a
 * product look inconsistent, and it costs a second font request on first paint.
 * `font-heading` still resolves, now to this same stack.
 */
const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' });

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
      className={cn('font-sans', geist.variable, geistMono.variable)}
    >
      <body>
        <ThemeProvider>
          <>{children}</>
        </ThemeProvider>
      </body>
    </html>
  );
}
