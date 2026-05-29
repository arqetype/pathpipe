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
            <div className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b px-4 w-full bg-popover/80 backdrop-blur-2xl backdrop-saturate-150">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="h-12" />
              <AppBreadcrumb />
            </div>
            <div className="flex-1 h-full">{children}</div>
          </SidebarInset>
        </BreadcrumbProvider>
      </SidebarProvider>
    </TooltipProvider>
  );
}
