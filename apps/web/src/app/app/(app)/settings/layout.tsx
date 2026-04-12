import SettingsUserInfo from '@/components/settings-user-info';
import { SettingsNav } from '@/components/settings-nav';
import { getCurrentUser } from '@/lib/auth-server';
import { Suspense, type ReactNode } from 'react';

type SettingsLayoutProps = {
  children: ReactNode;
};

export default async function SettingsLayout({
  children,
}: SettingsLayoutProps) {
  await getCurrentUser();

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden md:flex-row">
      {/* Left sidebar: user info + vertical nav */}
      <aside className="w-full shrink-0 flex flex-col gap-4 border-b p-6 overflow-y-auto md:w-60 md:border-b-0 md:border-r">
        <Suspense
          fallback={<div className="h-32 rounded-lg bg-muted animate-pulse" />}
        >
          <SettingsUserInfo />
        </Suspense>
        <SettingsNav />
      </aside>

      {/* Main content */}
      <section className="flex-1 min-w-0 overflow-y-auto p-6 max-w-4xl">
        {children}
      </section>
    </div>
  );
}
