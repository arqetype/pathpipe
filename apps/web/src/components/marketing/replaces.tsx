import {
  RiFileCopyLine,
  RiMailSendLine,
  RiLayoutGridLine,
  RiTimeLine,
} from '@remixicon/react';

const REPLACED = [
  {
    icon: RiFileCopyLine,
    title: 'The spreadsheet',
    body: 'Twelve columns you renamed three times and stopped filling in week two.',
  },
  {
    icon: RiMailSendLine,
    title: 'The job board alerts',
    body: 'Four daily digests, the same posting in each one, none of them scored.',
  },
  {
    icon: RiLayoutGridLine,
    title: 'The fourteen open tabs',
    body: 'One per career page, reopened every morning to check for something new.',
  },
  {
    icon: RiTimeLine,
    title: 'The mental follow-up list',
    body: '"Did I ever hear back from them?" — a question a status column answers.',
  },
];

export function Replaces() {
  return (
    <section className="border-y border-border bg-surface-sunken">
      <div className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            One pipeline instead of the usual four
          </h2>
          <p className="mt-4 text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
            A job search falls apart in the gaps between tools. pathpipe closes
            the gaps by having no tools to bridge.
          </p>
        </div>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {REPLACED.map(({ icon: Icon, title, body }) => (
            <li
              key={title}
              className="rounded-xl border border-border bg-card p-6"
            >
              <Icon className="size-5 text-muted-foreground" />
              <p className="mt-4 text-base font-semibold tracking-tight text-foreground line-through decoration-muted-foreground/40">
                {title}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
