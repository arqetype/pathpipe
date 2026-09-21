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
import { cookies } from 'next/headers';
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

  // The sidebar already writes this cookie every time it is toggled; reading it
  // here is what makes the choice survive a reload. Server-side rather than
  // localStorage so the first paint is already right — a sidebar that opens and
  // then snaps shut looks broken.
  const sidebarState = (await cookies()).get('sidebar_state')?.value;

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={sidebarState !== 'false'}>
        <BreadcrumbProvider defaultLabels={{ settings: 'Settings' }}>
          <AppSidebar user={currentUser} className="z-20" />
          <SidebarInset className="min-w-0 flex flex-col h-screen">
            {/*
              Sticky and separated, because it is the only thing on screen that
              says where you are. A header that scrolls away with the content
              leaves a dense list with no fixed point of reference — and the
              breadcrumb is the one control every page shares.
            */}
            <header className="sticky top-0 z-10 flex min-h-12 w-full shrink-0 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur-sm">
              <SidebarTrigger size="icon-lg" />
              <AppBreadcrumb />
            </header>
            <div className="flex-1 min-h-0">{children}</div>
          </SidebarInset>
        </BreadcrumbProvider>
      </SidebarProvider>
    </TooltipProvider>
  );
}
