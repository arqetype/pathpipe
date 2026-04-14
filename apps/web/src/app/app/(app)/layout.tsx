import {
  getCurrentUser,
  handleAuthenticationRedirection,
} from '@/lib/auth-server';
import { AppSidebar } from '@/components/navigation/sidebar';
import { AppBreadcrumb } from '@/components/navigation/breadcrumbs/app-breadcrumb';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@repo/ui/components/sidebar';
import { Separator } from '@repo/ui/components/separator';
import type { ReactNode } from 'react';
import { BreadcrumbProvider } from '@/components/navigation/breadcrumbs/breadcrumb-context';
import { redirect } from 'next/navigation';

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

  return (
    <SidebarProvider>
      <BreadcrumbProvider defaultLabels={{ settings: 'Settings' }}>
        <AppSidebar user={currentUser} />
        <SidebarInset className="overflow-hidden">
          <header className="flex h-12 shrink-0 items-center gap-3 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="h-4" />
            <AppBreadcrumb />
          </header>
          <div className="flex flex-1 flex-col min-h-0">{children}</div>
        </SidebarInset>
      </BreadcrumbProvider>
    </SidebarProvider>
  );
}
