'use client';

import * as React from 'react';
import {
  RiBriefcaseLine,
  RiBuildingLine,
  RiEyeLine,
  RiHome5Line,
  RiKeyLine,
  RiFileListLine,
  RiFolder3Line,
  RiRadarLine,
  RiUserSearchLine,
} from '@remixicon/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { startTransition } from 'react';
import { NavUser } from '@/components/navigation/sidebar/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@repo/ui/components/sidebar';
import { signOutAction } from '@/actions/auth/sign-out';
import { UserRole } from '@repo/db/types/user/roles';
import type { User } from '@repo/db/entities/user';
import { Logo } from '@repo/ui/branding/logo';

const userNavItems = [
  { title: 'Home', href: '/app', icon: RiHome5Line },
  { title: 'Applications', href: '/app/applications', icon: RiBriefcaseLine },
  { title: 'Job Matches', href: '/app/job-matches', icon: RiFileListLine },
  { title: 'Company Watch List', href: '/app/watchlist', icon: RiEyeLine },
  { title: 'Job Profile', href: '/app/job-profile', icon: RiUserSearchLine },
  { title: 'Documents', href: '/app/documents', icon: RiFolder3Line },
];

const adminNavItems = [
  { title: 'Discovery', href: '/app/discover', icon: RiRadarLine },
  { title: 'Companies', href: '/app/companies', icon: RiBuildingLine },
  { title: 'API Keys', href: '/app/api-keys', icon: RiKeyLine },
];

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: User;
};

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const pathname = usePathname();
  const isAdmin = user.role === UserRole.ADMIN;

  const handleSignOut = () => {
    startTransition(async () => {
      await signOutAction();
    });
  };

  const displayName = user.name ?? user.email;
  const fallback = user.name
    ? user.name
        .split(' ')
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join('')
        .slice(0, 2)
    : user.email.slice(0, 2).toUpperCase();

  const navUser = {
    name: displayName,
    email: user.email,
    avatar: user.avatar_url ?? '',
    fallback,
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      {/*
        Exactly as tall as the breadcrumb bar next to it — h-12 here, min-h-12
        there — so the wordmark and the breadcrumb sit on the same line rather
        than a few pixels off. No rule underneath: the sidebar's own right-hand
        border already separates it from the page.
      */}
      <SidebarHeader className="h-12 justify-center px-2 py-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/app" />}
              // The collapsed rail is a 32px square; its default padding would
              // leave 16px of room and clip the mark.
              className="group-data-[collapsible=icon]:p-0!"
            >
              <Logo
                className="aspect-square !size-6"
                aria-label="pathpipe logo"
              />
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate text-base font-semibold">
                  pathpipe
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {userNavItems.map((item) => {
                const isActive =
                  item.href === '/app'
                    ? pathname === '/app'
                    : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <>
            <SidebarSeparator className="my-2" />
            <SidebarGroup>
              <SidebarGroupLabel>Administration</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminNavItems.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          render={<Link href={item.href} />}
                          isActive={isActive}
                          tooltip={item.title}
                        >
                          <item.icon />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={navUser} onSignOutAction={handleSignOut} />
      </SidebarFooter>
    </Sidebar>
  );
}
