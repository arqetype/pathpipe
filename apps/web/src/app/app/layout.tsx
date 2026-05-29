import type { ReactNode } from 'react';
import { Toaster } from '@repo/ui/components/sonner';

type AppLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default async function AppLayout({ children }: AppLayoutProps) {
  return (
    <>
      <>{children}</>
      <Toaster />
    </>
  );
}
