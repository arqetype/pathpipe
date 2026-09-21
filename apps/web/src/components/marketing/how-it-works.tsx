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
    <section
      id="how-it-works"
      className="border-y border-border bg-surface-sunken"
    >
      <div className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Set up in the time it takes to write one cover letter
          </h2>
        </div>

        <ol className="mt-12 grid gap-8 md:grid-cols-3 md:gap-6">
          {STEPS.map((step, index) => (
            <li key={step.title} className="relative">
              <span className="flex size-9 items-center justify-center rounded-full bg-primary font-mono text-sm font-medium text-primary-foreground">
                {index + 1}
              </span>
              <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
