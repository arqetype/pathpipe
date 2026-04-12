'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@repo/ui/components/sidebar';

const settingsNav = [
  { label: 'Account', href: '/app/settings' },
  { label: 'Profile', href: '/app/settings/profile' },
  { label: 'Security', href: '/app/settings/security' },
  { label: 'Notifications', href: '/app/settings/notifications' },
  { label: 'Contact Us', href: '/app/settings/contact' },
];

function normalize(path: string) {
  return path.replace(/\/$/, '');
}

export function SettingsNav() {
  const pathname = usePathname();
  const normalized = normalize(pathname);

  return (
    <SidebarMenu>
      {settingsNav.map((item) => {
        const isActive = normalize(item.href) === normalized;
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton asChild isActive={isActive}>
              <Link href={item.href}>{item.label}</Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
