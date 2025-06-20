import Header from '@/components/header';
import { getCurrentUser } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
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
