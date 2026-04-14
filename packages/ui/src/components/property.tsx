import { ReactNode } from 'react';

export default function Property({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center min-h-9 gap-4 rounded-md hover:bg-muted/50 -mx-3 px-3 transition-colors">
      <div className="flex items-center gap-2.5 w-32 shrink-0 text-muted-foreground">
        <span className="size-4 shrink-0">{icon}</span>
        <span className="text-xs font-medium uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="flex-1 min-w-0 text-sm font-medium text-foreground">
        {children}
      </div>
    </div>
  );
}
