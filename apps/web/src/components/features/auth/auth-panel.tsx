'use client';

import { Logo } from '@repo/ui/branding/logo';

export function AuthPanel() {
  return (
    <div className="relative h-full overflow-hidden rounded-lg bg-black">
      <div className="absolute -bottom-1/3 -left-1/3 h-full w-full rounded-full bg-primary/70 blur-[64px]" />
      <div className="absolute -right-1/3 -top-1/3 h-3/4 w-3/4 rounded-full bg-primary/50 blur-[48px]" />

      <div className="relative flex h-full flex-col items-start justify-between p-8">
        <div className="flex items-center gap-2">
          <Logo className="size-7" color="white" />
          <span className="font-heading text-base font-semibold tracking-tight text-white">
            pathpipe
          </span>
        </div>

        <div className="space-y-3">
          <p className="text-3xl font-bold leading-snug tracking-tight text-white">
            Track every application.
            <br />
            <span className="text-white/60">Land your next role.</span>
          </p>
          <p className="max-w-xs text-sm leading-relaxed text-white/40">
            One place for your job search, applications, follow-ups, and
            progress.
          </p>
        </div>
      </div>
    </div>
  );
}
