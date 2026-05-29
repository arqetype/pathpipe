export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto flex max-w-7xl flex-col items-center px-4 pb-28 pt-24 text-center md:pb-40 md:pt-40">
        <h1 className="font-heading max-w-4xl text-6xl font-bold leading-[1.02] tracking-tight text-foreground md:text-8xl">
          Job hunting,
          <br />
          <span className="bg-gradient-to-br from-foreground to-foreground/40 bg-clip-text text-transparent">
            done right.
          </span>
        </h1>

        <p className="mt-8 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
          Every application, company, and follow-up in one organized place. With
          AI that actually helps you move forward.
        </p>
      </div>
    </section>
  );
}
