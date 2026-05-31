'use client';

import Image from 'next/image';
import Link from 'next/link';
import { RiArrowRightLine, RiCheckboxCircleFill } from '@remixicon/react';
import { buttonVariants } from '@repo/ui/components/button';
import { cn } from '@repo/ui/lib/utils';

const TRUST_ITEMS = ['AI Copilot', 'Smart Tracking', 'All in One Place'];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-background">
      {/* Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:48px_48px] dark:bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)]" />

      {/* Glow */}
      <div className="absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-gradient-to-b from-emerald-500/20 to-transparent blur-3xl md:w-[800px]" />

      {/* Centered text */}
      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 pb-12 pt-24 text-center md:pb-16 md:pt-32">
        {/* Heading */}
        <h1 className="text-balance text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
          The smart way to <span className="text-emerald-400">track jobs.</span>
          <br />
          Not spreadsheets.
        </h1>

        {/* Subtitle */}
        <p className="mt-5 max-w-lg text-balance text-sm leading-relaxed text-muted-foreground sm:text-base md:text-lg">
          pathpipe helps you organize applications, automate follow-ups, and
          land more interviews with AI.
        </p>

        {/* CTAs */}
        <div className="mt-8 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row sm:gap-4">
          <Link
            href="/app/sign-up"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'h-11 w-full gap-2.5 bg-gradient-to-br from-emerald-600 to-emerald-800 px-6 text-base text-background transition-all hover:from-emerald-500 hover:to-emerald-700 hover:shadow-[0_0_24px_rgba(16,185,129,0.4)] dark:from-emerald-400 dark:to-emerald-600 dark:hover:from-emerald-300 dark:hover:to-emerald-500 sm:w-auto',
            )}
          >
            Get Started Free
            <RiArrowRightLine className="size-4" />
          </Link>
          <Link
            href="#features"
            className={cn(
              buttonVariants({ size: 'lg', variant: 'outline' }),
              'h-11 w-full px-6 text-base sm:w-auto',
            )}
          >
            Learn More
          </Link>
        </div>

        {/* Trust indicators */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 md:gap-5">
          {TRUST_ITEMS.map((item) => (
            <div key={item} className="flex items-center gap-2">
              <RiCheckboxCircleFill className="size-4 shrink-0 text-emerald-500" />
              <span className="text-sm text-muted-foreground">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Screenshot */}
      <div className="relative z-10 ml-4 pb-0 sm:ml-6 lg:mx-auto lg:px-6 lg:[perspective:1000px]">
        <div className="h-[260px] overflow-hidden rounded-tl-xl border border-b-0 border-border shadow-[0_-8px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_-8px_60px_rgba(0,0,0,0.6)] sm:h-[320px] lg:h-[520px] lg:rounded-tr-2xl lg:[transform:rotateX(6deg)] lg:[transform-origin:bottom_center] lg:[transform-style:preserve-3d]">
          <Image
            src="/dashboard-preview-light.png"
            alt="pathpipe dashboard"
            width={1280}
            height={800}
            className="max-w-none w-[220%] dark:hidden lg:w-full"
            priority
          />
          <Image
            src="/dashboard-preview-dark.png"
            alt="pathpipe dashboard"
            width={1280}
            height={800}
            className="hidden max-w-none w-[220%] dark:block lg:w-full"
            priority
          />
        </div>
        {/* Fade bottom */}
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background via-background/80 to-transparent md:h-64" />
      </div>
    </section>
  );
}
