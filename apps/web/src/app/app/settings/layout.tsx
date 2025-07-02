import SettingsHeader from '@/components/settings-header';
import SettingsUserInfo from '@/components/settings-user-info';
import { TabNavigation } from '@/components/tab-navigation';
import { getCurrentUser } from '@/lib/auth-server';
import { Suspense, type ReactNode } from 'react';

type SettingsLayoutProps = {
  children: ReactNode;
};

const tabs = [
  { label: 'Account', href: '/app/settings/' },
  { label: 'Profile', href: '/app/settings/profile/' },
  { label: 'Security', href: '/app/settings/security/' },
  { label: 'Notifications', href: '/app/settings/notifications/' },
  { label: 'Contact Us', href: '/app/settings/contact/' },
];

export default async function SettingsLayout({
  children,
}: SettingsLayoutProps) {
  await getCurrentUser();

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col p-8 pb-24 min-h-screen">
      <SettingsHeader />
      <div className="flex h-full">
        <section className="w-1/4 h-full">
          <Suspense fallback={<div className="p-4">Loading...</div>}>
            <SettingsUserInfo />
          </Suspense>
        </section>
        <section className="flex-1 h-full">
          <TabNavigation tabs={tabs} />
          <div className="p-4 flex flex-col gap-2">{children}</div>
        </section>
      </div>
    </div>
  );
}
