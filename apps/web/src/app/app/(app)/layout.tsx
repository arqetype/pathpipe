import { getCurrentUser } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

type ApplicationLayoutProps = {
  children: ReactNode;
};

export default async function ApplicationLayout({
  children,
}: ApplicationLayoutProps) {
  const user = await getCurrentUser();

  return (
    <>
      <header>Hello world</header>
      {children}
    </>
  );
}
