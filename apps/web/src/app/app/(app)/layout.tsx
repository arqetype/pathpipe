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
import { TooltipProvider } from '@repo/ui/components/tooltip';
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
    <TooltipProvider>
      <SidebarProvider>
        <BreadcrumbProvider defaultLabels={{ settings: 'Settings' }}>
          <AppSidebar user={currentUser} className="z-20" />
          <SidebarInset className="min-w-0 flex flex-col h-screen">
            <div className="flex min-h-12 items-center gap-3 px-4 w-full">
              <SidebarTrigger size="icon-lg" />
              <AppBreadcrumb />
            </div>
            <div className="flex-1 h-full">{children}</div>
          </SidebarInset>
        </BreadcrumbProvider>
      </SidebarProvider>
    </TooltipProvider>
  );
}
