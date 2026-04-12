'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@repo/ui/components/breadcrumb';

const settingsLabels: Record<string, string> = {
  '/app/settings': 'Account',
  '/app/settings/profile': 'Profile',
  '/app/settings/security': 'Security',
  '/app/settings/notifications': 'Notifications',
  '/app/settings/contact': 'Contact Us',
};

// Normalize trailing slash away for matching
function normalize(path: string) {
  return path.replace(/\/$/, '');
}

export function AppBreadcrumb() {
  const pathname = usePathname();
  const normalized = normalize(pathname);

  if (normalized === '/app') {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Applications</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  if (normalized.startsWith('/app/settings')) {
    const subLabel = settingsLabels[normalized];
    const isSettingsRoot = normalized === '/app/settings';

    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            {isSettingsRoot ? (
              <BreadcrumbPage>Settings</BreadcrumbPage>
            ) : (
              <BreadcrumbLink asChild>
                <Link href="/app/settings">Settings</Link>
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
          {!isSettingsRoot && subLabel && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{subLabel}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  return null;
}
