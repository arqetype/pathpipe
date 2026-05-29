'use client';

type SelectedColorProps = {
  color: string;
};

export function SelectedColor({ color }: SelectedColorProps) {
  return (
    <div className="flex items-center gap-3 py-2 px-3 bg-card rounded-lg border">
      <div
        className="size-10 rounded-full border-2 border-muted-foreground/20"
        style={{ backgroundColor: color }}
        aria-label="Selected skin color"
        suppressHydrationWarning
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">Selected Color</p>
        <p
          className="text-xs text-muted-foreground font-mono uppercase"
          suppressHydrationWarning
        >
          {color}
        </p>
      </div>
    </div>
  );
}
