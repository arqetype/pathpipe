'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Logo } from '@repo/ui/branding/logo';
import { SIGNUP_CLOSED } from '@/lib/signup-closed';
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
  navigationMenuTriggerStyle,
} from '@repo/ui/components/navigation-menu';
import { RiMenuLine, RiCloseLine } from '@remixicon/react';

const NAV_SECTIONS = [
  {
    label: 'Product',
    dropdown: true,
    links: [
      {
        href: '/#features',
        label: 'Features',
        description: 'Matches, pipeline, companies, documents',
      },
      {
        href: '/#how-it-works',
        label: 'How it works',
        description: 'From your CV to your first scored matches',
      },
      {
        href: '/data-sources',
        label: 'Data sources',
        description: 'Every job board pathpipe reads, credited',
      },
      {
        href: '/changelog',
        label: 'Changelog',
        description: 'What shipped, newest first',
      },
    ],
  },
  {
    label: 'Company',
    links: [
      { href: '/pricing', label: 'Pricing' },
      { href: '/about', label: 'About' },
      { href: '/contact', label: 'Contact' },
    ],
  },
] as const;

export function MarketingNavbar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-50 w-full px-4 py-3">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-6 rounded-full border border-border bg-background/80 pl-5 pr-3 shadow-sm backdrop-blur-xl backdrop-saturate-150">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-1.5 transition-opacity hover:opacity-80"
            >
              <Logo className="size-8" />
              <span className="font-heading text-lg font-semibold tracking-tight">
                pathpipe
              </span>
            </Link>

            <NavigationMenu className="hidden md:flex">
              <NavigationMenuList className="text-muted-foreground">
                {NAV_SECTIONS.map((section) =>
                  'dropdown' in section && section.dropdown ? (
                    <NavigationMenuItem key={section.label}>
                      <NavigationMenuTrigger>
                        {section.label}
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <ul className="grid w-[460px] grid-cols-2 gap-1 p-1">
                          {section.links.map((link) => (
                            <ListItem key={link.href} href={link.href}>
                              <div>
                                <span className="font-medium leading-none">
                                  {link.label}
                                </span>
                                {'description' in link && (
                                  <span className="line-clamp-2 text-muted-foreground">
                                    {link.description}
                                  </span>
                                )}
                              </div>
                            </ListItem>
                          ))}
                        </ul>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  ) : (
                    section.links.map((link) => (
                      <NavigationMenuItem key={link.href}>
                        <NavigationMenuLink
                          render={<Link href={link.href} />}
                          className={navigationMenuTriggerStyle()}
                        >
                          {link.label}
                        </NavigationMenuLink>
                      </NavigationMenuItem>
                    ))
                  ),
                )}
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <Link
              href="/app/sign-in"
              className="inline-flex h-9 items-center rounded-full px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            {!SIGNUP_CLOSED && (
              <Link
                href="/app/sign-up"
                className="inline-flex h-9 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Sign up
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            {!SIGNUP_CLOSED && (
              <Link
                href="/app/sign-up"
                className="inline-flex h-8 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground"
              >
                Sign up
              </Link>
            )}
            <button
              className="flex size-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? (
                <RiCloseLine className="size-5" />
              ) : (
                <RiMenuLine className="size-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div
          className="fixed inset-x-0 bottom-0 top-20 z-40 overflow-y-auto bg-background/80 backdrop-blur-xl backdrop-saturate-150 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <nav className="mx-auto max-w-7xl px-4 py-8">
            {NAV_SECTIONS.map((section) => (
              <div key={section.label} className="mb-8">
                <p className="text-sm text-muted-foreground">{section.label}</p>
                <ul>
                  {section.links.map((link) => (
                    <MobileNavLink
                      key={link.href}
                      href={link.href}
                      onClose={() => setOpen(false)}
                    >
                      {link.label}
                    </MobileNavLink>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}

function MobileNavLink({
  href,
  onClose,
  children,
}: {
  href: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onClose}
        className="block py-2 text-xl font-medium transition-colors hover:text-muted-foreground"
      >
        {children}
      </Link>
    </li>
  );
}

function ListItem({
  children,
  href,
}: {
  children: React.ReactNode;
  href: string;
}) {
  return (
    <li>
      <NavigationMenuLink
        render={<Link href={href} />}
        className="!items-start gap-3 rounded-md p-3 hover:bg-accent"
      >
        {children}
      </NavigationMenuLink>
    </li>
  );
}
