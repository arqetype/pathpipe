import Image from 'next/image';
import Link from 'next/link';
import { RiArrowRightLine } from '@remixicon/react';
import { SIGNUP_CLOSED } from '@/lib/signup-closed';

const FEED = [
  {
    role: 'Senior Backend Engineer',
    company: 'Qonto',
    logo: 'qonto',
    score: 92,
  },
  {
    role: 'Platform Engineer',
    company: 'Doctolib',
    logo: 'doctolib',
    score: 81,
  },
  { role: 'Staff Engineer', company: 'Payfit', logo: 'payfit', score: 88 },
  { role: 'Full Stack Developer', company: 'Alan', logo: 'alan', score: 64 },
  { role: 'Lead Developer', company: 'Ledger', logo: 'ledger', score: 77 },
  {
    role: 'Site Reliability Engineer',
    company: 'Swile',
    logo: 'swile',
    score: 85,
  },
  {
    role: 'Data Engineer',
    company: 'Back Market',
    logo: 'backmarket',
    score: 71,
  },
];

export function Hero() {
  return (
    <>
      <section className="mx-auto max-w-4xl px-6 py-14 md:py-24">
        <h1 className="text-balance text-[clamp(2rem,7vw,4.25rem)] font-semibold leading-[1.05] tracking-[-0.035em] text-foreground">
          One pipe for the{' '}
          <em className="font-normal italic text-primary">whole</em> job search.
        </h1>

        <p className="mt-5 max-w-lg text-balance text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg">
          Openings read from the employer&apos;s own job board, scored against
          your profile, and tracked from the day you apply to the day you get an
          answer.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center md:mt-9">
          <Link
            href={SIGNUP_CLOSED ? '/contact' : '/app/sign-up'}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-7 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {SIGNUP_CLOSED ? 'Ask for an invite' : 'Get started free'}
            <RiArrowRightLine className="size-4" />
          </Link>
          <Link
            href="#features"
            className="inline-flex h-12 items-center justify-center rounded-lg border border-border px-7 text-base font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            See how it works
          </Link>
        </div>
      </section>

      <ProductBand />
    </>
  );
}

function ProductBand() {
  return (
    <div className="px-4 pb-10 md:pb-14">
      <section className="dark relative isolate overflow-hidden rounded-2xl bg-background md:rounded-3xl text-foreground">
        <Image
          src="/marketing/hills.jpg"
          alt=""
          fill
          sizes="calc(100vw - 2rem)"
          priority
          className="-z-20 object-cover opacity-80"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/50 via-black/60 to-background" />

        <Feed />

        <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 md:pt-20">
          <div className="h-[200px] overflow-hidden rounded-t-xl border border-b-0 border-white/15 sm:h-[400px] sm:rounded-t-2xl lg:h-[560px]">
            <Image
              src="/dashboard-preview-dark.png"
              alt="The pathpipe dashboard: scored openings on the left, the application pipeline on the right"
              width={1280}
              height={800}
              className="w-full min-w-[620px] sm:min-w-[820px]"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function Feed() {
  return (
    <div aria-hidden className="relative border-b border-white/15">
      <div className="absolute inset-0 bg-black/25 backdrop-blur-md" />

      <div className="relative overflow-hidden py-4 [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
        <div className="flex w-max animate-marquee motion-reduce:animate-none">
          {[...FEED, ...FEED].map(({ role, company, logo, score }, index) => (
            <span
              key={`${role}-${index}`}
              className="flex items-center gap-3 whitespace-nowrap px-5"
            >
              <Image
                src={`/marketing/logos/${logo}.png`}
                alt=""
                width={32}
                height={32}
                className="size-7 rounded-md"
              />
              <span className="text-sm font-medium text-white">{role}</span>
              <span className="text-sm text-white/50">{company}</span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/80">
                {score}% fit
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
