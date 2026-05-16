import {
  getCurrentUser,
  handleAuthenticationRedirection,
} from '@/lib/auth-server';
import type { ReactNode } from 'react';
import { notFound, redirect } from 'next/navigation';
import { UserRole } from '@repo/db/types/user/roles';

type ApplicationLayoutProps = {
  children: ReactNode;
};

export default async function ApplicationLayout({
  children,
}: ApplicationLayoutProps) {
  const { isAuthenticated, redirectTo } =
    await handleAuthenticationRedirection();
  const currentUser = await getCurrentUser();

  if (!isAuthenticated) redirect(redirectTo);
  if (currentUser.role !== UserRole.ADMIN) notFound();

  return <>{children}</>;
}
