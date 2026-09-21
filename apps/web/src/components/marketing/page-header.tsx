type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  intro?: string;
};

export function PageHeader({ eyebrow, title, intro }: PageHeaderProps) {
  return (
    <header className="mx-auto max-w-3xl px-4 pb-4 pt-24 text-center md:px-6 md:pt-32">
      {eyebrow && (
        <p className="font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {eyebrow}
        </p>
      )}
      <h1 className="mt-3 text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
        {title}
      </h1>
      {intro && (
        <p className="mx-auto mt-4 max-w-xl text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
          {intro}
        </p>
      )}
    </header>
  );
}
