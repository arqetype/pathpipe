import Link from 'next/link';
import { Logo } from '@repo/ui/branding/logo';
import { RiGithubFill, RiHeart2Line, RiDrinksLine } from '@remixicon/react';
import { GITHUB_URL } from '@/lib/site';

const sections = [
  {
    label: 'Product',
    links: [
      { label: 'Features', href: '/#features' },
      { label: 'How it works', href: '/#how-it-works' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Changelog', href: '/changelog' },
    ],
  },
  {
    label: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    label: 'Legal',
    links: [
      { label: 'Privacy', href: '/legal/privacy' },
      { label: 'Terms', href: '/legal/terms' },
      { label: 'Cookies', href: '/legal/cookies' },
      { label: 'Data sources', href: '/data-sources' },
    ],
  },
];

const socials = [
  {
    icon: RiGithubFill,
    href: GITHUB_URL,
    label: 'GitHub',
  },
];

export function Footer() {
  return (
    <footer>
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="grid gap-10 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div className="flex flex-col gap-4">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-1.5 transition-opacity hover:opacity-80"
            >
              <Logo className="size-8" />
              <span className="font-heading text-lg font-semibold tracking-tight">
                pathpipe
              </span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              Job hunting, done right. Every application, company, and follow-up
              in one calm pipeline.
            </p>
            <div className="mt-2 flex items-center gap-2">
              {socials.map(({ icon: Icon, href, label }) => (
                <Link
                  key={label}
                  href={href}
                  aria-label={label}
                  className="flex size-8 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                >
                  <Icon className="size-4" />
                </Link>
              ))}
            </div>
          </div>

          {sections.map((section) => (
            <div key={section.label} className="flex flex-col gap-3">
              <span className="font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {section.label}
              </span>
              <ul className="flex flex-col gap-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-foreground/80 transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-14 w-full text-center sm:text-left">
          <span className="select-none inline-flex items-center gap-1">
            &copy; {new Date().getFullYear()} Arqetype - Made with{' '}
            <RiHeart2Line className="size-4" /> and{' '}
            <RiDrinksLine className="size-4" /> in France.
          </span>
        </p>
      </div>
    </footer>
  );
}
