import * as React from 'react';

import { cn } from '@repo/ui/lib/utils';

export interface InputProps extends React.ComponentProps<'input'> {
  variant?: 'default' | 'ghost';
}

function Input({ className, type, variant = 'default', ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
        variant === 'default' && 'border-input shadow-xs',
        variant === 'ghost' && 'border-transparent shadow-none hover:bg-accent',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
