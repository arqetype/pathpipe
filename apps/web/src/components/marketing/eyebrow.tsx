type EyebrowProps = { children: string };

export function Eyebrow({ children }: EyebrowProps) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
      <span className="size-1.5 rounded-full bg-primary" />
      {children}
    </span>
  );
}
