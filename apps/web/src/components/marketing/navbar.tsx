'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Logo } from '@repo/ui/branding/logo';
import { buttonVariants } from '@repo/ui/components/button';
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
      { href: '/feature-1', label: 'Features', description: 'Description' },
      { href: '/feature-2', label: 'Test', description: 'Description' },
    ],
  },
  {
    label: 'Company',
    links: [
      { href: '/pricing', label: 'Pricing' },
      { href: '/changelog', label: 'Now' },
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
      <header className="sticky top-0 z-50 w-full bg-background/70 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 md:px-6">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-1.5 transition-opacity hover:opacity-80"
            >
              <Logo className="size-8" />
              <span className="font-heading text-lg font-semibold tracking-tight">
                Pathpipe
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
              className={buttonVariants({ variant: 'secondary', size: 'lg' })}
            >
              Sign in
            </Link>
            <Link
              href="/app/sign-up"
              className={buttonVariants({ size: 'lg' })}
            >
              Sign up
            </Link>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <Link
              href="/app/sign-in"
              className={buttonVariants({ variant: 'secondary', size: 'sm' })}
            >
              Sign in
            </Link>
            <Link
              href="/app/sign-up"
              className={buttonVariants({ size: 'sm' })}
            >
              Sign up
            </Link>
            <button
              className="flex size-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent"
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
          className="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto bg-background/70 backdrop-blur-xl backdrop-saturate-150md:hidden"
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
