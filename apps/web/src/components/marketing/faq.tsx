import { RiAddLine } from '@remixicon/react';

const FAQ = [
  {
    q: 'Does pathpipe apply to jobs for me?',
    a: 'No. It finds the openings, scores them and remembers everything you sent — you write the application. Auto-applying is how people end up with a hundred rejections and no idea why.',
  },
  {
    q: 'Where do the openings come from?',
    a: 'From the employer’s own job board, through the public API of the applicant tracking system they use — Greenhouse, Lever, Ashby, SmartRecruiters, Teamtailor, Personio or Workday. Four job boards are read on top of that, only to learn which companies are hiring.',
  },
  {
    q: 'Can I track applications I sent before signing up?',
    a: 'Yes. Any application can be created by hand, with its company, status, date and the link you applied through, whether or not the posting is in pathpipe.',
  },
  {
    q: 'What happens to my résumé?',
    a: 'It is stored on your account and read once to pre-fill your profile, using keyword extraction on our own servers. It is never sent to a model provider and never shown to a recruiter.',
  },
  {
    q: 'Which markets are covered?',
    a: 'Coverage follows the sources: it is densest in tech and in Europe. Following a company works anywhere, as long as that company runs one of the supported systems.',
  },
  {
    q: 'How often do new matches arrive?',
    a: 'Boards are read continuously, and matches land in the app as they are ingested. The email digest is separate, opt-in, and carries at most ten strong matches at a time.',
  },
];

export function Faq() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-20 md:px-6 md:py-28">
      <h2 className="text-balance text-center text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Questions people actually ask
      </h2>

      <div className="mt-12 divide-y divide-border border-y border-border">
        {FAQ.map(({ q, a }) => (
          <details key={q} className="group py-5">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-left text-base font-medium text-foreground marker:content-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
              {q}
              <RiAddLine className="mt-0.5 size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-45" />
            </summary>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
