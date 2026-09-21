import type { ReactNode } from 'react';

export type LegalSection = {
  title: string;
  body: ReactNode[];
};

type LegalBodyProps = {
  updatedAt: string;
  sections: LegalSection[];
};

export function LegalBody({ updatedAt, sections }: LegalBodyProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 md:px-6">
      <p className="mt-8 font-mono text-xs text-muted-foreground">
        Last updated {updatedAt}
      </p>

      {sections.map((section) => (
        <section key={section.title} className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {section.title}
          </h2>
          <div className="mt-3 flex flex-col gap-3 text-sm leading-relaxed text-foreground/80">
            {section.body.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
