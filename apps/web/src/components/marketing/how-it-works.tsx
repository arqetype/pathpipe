import Image from 'next/image';
import { Eyebrow } from '@/components/marketing/eyebrow';

const STEPS = [
  {
    title: 'Drop in your CV',
    body: 'PDF, DOCX or plain text. pathpipe reads it and fills in the skills, seniority and domain it finds — you keep the pen.',
  },
  {
    title: 'Say what you are looking for',
    body: 'Contract, cities or remote, salary floor, the companies you never want to see again. Then weight what matters most.',
  },
  {
    title: 'Work the pipeline',
    body: 'Scored openings arrive daily. Apply, move the card, and the board tells you what is waiting on you.',
  },
];

export function HowItWorks() {
  return (
    <div id="how-it-works" className="px-4 py-10 md:py-14">
      <section className="rounded-2xl bg-surface-sunken px-6 py-16 md:rounded-3xl md:px-12 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-16">
          <div className="relative aspect-4/3 overflow-hidden rounded-2xl shadow-md">
            <Image
              src="/marketing/desk.jpg"
              alt="Hands on a laptop keyboard, a spreadsheet open on screen"
              fill
              sizes="(min-width: 1024px) 40vw, calc(100vw - 3rem)"
              className="object-cover grayscale"
            />
            <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-6 pt-16 text-sm leading-relaxed text-white">
              The spreadsheet you renamed three times and stopped filling in on
              week two.
            </p>
          </div>

          <div>
            <Eyebrow>Getting started</Eyebrow>
            <h2 className="mt-5 text-balance text-[clamp(2rem,3.5vw,3rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-foreground">
              Set up in the time it takes to write one cover letter
            </h2>

            <ol className="mt-10 flex flex-col gap-3">
              {STEPS.map((step, index) => (
                <li
                  key={step.title}
                  className="flex gap-5 rounded-2xl bg-background p-5 shadow-sm md:p-6"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-medium text-primary">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="text-base font-medium text-foreground">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-muted-foreground">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </div>
  );
}
