import Link from 'next/link';
import { RiArrowRightLine } from '@remixicon/react';
import { SIGNUP_CLOSED } from '@/lib/signup-closed';
import { buttonVariants } from '@repo/ui/components/button';
import { cn } from '@repo/ui/lib/utils';

export function Cta() {
  return (
    <section className="relative overflow-hidden border-t border-border">
      {/* Glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-gradient-to-b from-primary/15 to-transparent blur-3xl" />

      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-4 py-24 text-center md:px-6 md:py-32">
        <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
          Stop managing your job search. Start running it.
        </h2>
        <p className="mt-4 max-w-lg text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
          Free while pathpipe is in beta. Bring a CV, get your first scored
          matches the same day.
        </p>

        <div className="mt-8 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
          {SIGNUP_CLOSED ? (
            <Link
              href="/contact"
              className={cn(buttonVariants({ size: 'lg' }), 'w-full sm:w-auto')}
            >
              Ask for an invite
              <RiArrowRightLine className="size-4" />
            </Link>
          ) : (
            <Link
              href="/app/sign-up"
              className={cn(buttonVariants({ size: 'lg' }), 'w-full sm:w-auto')}
            >
              Get started free
              <RiArrowRightLine className="size-4" />
            </Link>
          )}
          <Link
            href="/app/sign-in"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'lg' }),
              'w-full sm:w-auto',
            )}
          >
            Sign in
          </Link>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          No card, no recruiter contact, no résumé resale.
        </p>
      </div>
    </section>
  );
}
