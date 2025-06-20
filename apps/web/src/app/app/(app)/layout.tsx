import Header from '@/components/header';
import { getCurrentUser } from '@/lib/auth-server';
import type { ReactNode } from 'react';

type ApplicationLayoutProps = {
  children: ReactNode;
};

export default async function ApplicationLayout({
  children,
}: ApplicationLayoutProps) {
  await getCurrentUser();

  return (
    <>
      <Header />
      {children}
    </>
  );
}
