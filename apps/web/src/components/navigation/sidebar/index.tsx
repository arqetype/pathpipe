'use client';

import * as React from 'react';
import { RiBriefcaseLine, RiBuildingLine } from '@remixicon/react';
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
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@repo/ui/components/sidebar';
import { signOutAction } from '@/actions/auth/sign-out';
import type { User } from '@repo/db/entities/user';

const navItems = [
  { title: 'Applications', href: '/app/applications', icon: RiBriefcaseLine },
  { title: 'Companies', href: '/app/companies', icon: RiBuildingLine },
];

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: User;
};

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const pathname = usePathname();

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
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/app">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <RiBriefcaseLine className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Weaver</span>
                  <span className="truncate text-xs text-sidebar-foreground/60">
                    Job tracker
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  item.href === '/app'
                    ? pathname === '/app'
                    : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={navUser} onSignOutAction={handleSignOut} />
      </SidebarFooter>
    </Sidebar>
  );
}
