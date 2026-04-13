import { getCurrentUser } from '@/lib/auth-server';
import { AppSidebar } from '@/components/app-sidebar';
import { AppBreadcrumb } from '@/components/app-breadcrumb';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@repo/ui/components/sidebar';
import { Separator } from '@repo/ui/components/separator';
import type { ReactNode } from 'react';

type ApplicationLayoutProps = {
  children: ReactNode;
};

export default async function ApplicationLayout({
  children,
}: ApplicationLayoutProps) {
  const currentUser = await getCurrentUser();

  return (
    <SidebarProvider>
      <AppSidebar user={currentUser} />
      <SidebarInset className="overflow-hidden">
        <header className="flex h-12 shrink-0 items-center gap-3 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <AppBreadcrumb />
        </header>
        <div className="flex flex-1 flex-col min-h-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
