import Image from 'next/image';
import Link from 'next/link';
import { RiArrowRightLine } from '@remixicon/react';
import { SIGNUP_CLOSED } from '@/lib/signup-closed';

export function Cta() {
  return (
    <div className="px-4 pb-10 md:pb-14">
      <section className="dark relative isolate overflow-hidden rounded-2xl px-6 py-20 text-center text-foreground md:rounded-3xl md:py-28">
        <Image
          src="/marketing/hills.jpg"
          alt=""
          fill
          sizes="calc(100vw - 2rem)"
          className="-z-20 object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-black/55" />

        <h2 className="mx-auto max-w-2xl text-balance text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-white">
          Stop managing your job search. Start{' '}
          <em className="font-normal italic">running</em> it.
        </h2>
        <p className="mx-auto mt-5 max-w-lg text-balance text-base leading-relaxed text-white/75">
          Free while pathpipe is in beta. Bring a CV, get your first scored
          matches the same day.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={SIGNUP_CLOSED ? '/contact' : '/app/sign-up'}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-7 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto"
          >
            {SIGNUP_CLOSED ? 'Ask for an invite' : 'Get started free'}
            <RiArrowRightLine className="size-4" />
          </Link>
          <Link
            href="/app/sign-in"
            className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-white/25 bg-white/10 px-7 text-base font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto"
          >
            Sign in
          </Link>
        </div>
      </section>
    </div>
  );
}
