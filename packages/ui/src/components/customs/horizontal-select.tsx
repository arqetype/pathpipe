'use client';

import * as React from 'react';
import { cn } from '@repo/ui/lib/utils';

type HorizontalSelectContextValue = {
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
};

const HorizontalSelectContext =
  React.createContext<HorizontalSelectContextValue>({
    onValueChange: () => {},
  });

function HorizontalSelect({
  value,
  onValueChange,
  disabled,
  className,
  children,
  ...props
}: {
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'>) {
  return (
    <HorizontalSelectContext.Provider
      value={{ value, onValueChange, disabled }}
    >
      <div
        data-slot="horizontal-select"
        className={cn(
          'inline-flex w-fit items-center justify-start gap-1 rounded-lg border border-input bg-input p-1 flex-wrap',
          'transition-colors outline-none',
          'aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20',
          'dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
          disabled && 'cursor-not-allowed opacity-50',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </HorizontalSelectContext.Provider>
  );
}

function HorizontalSelectGroup({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="horizontal-select-group"
      className={cn('inline-flex items-center gap-1', className)}
      {...props}
    />
  );
}

function HorizontalSelectLabel({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="horizontal-select-label"
      className={cn('px-2 text-xs text-muted-foreground', className)}
      {...props}
    />
  );
}

function HorizontalSelectItem({
  value: itemValue,
  disabled: itemDisabled,
  className,
  children,
  ...props
}: {
  value: string;
  disabled?: boolean;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value'>) {
  const { value, onValueChange, disabled } = React.useContext(
    HorizontalSelectContext,
  );
  const isSelected = value === itemValue;
  const isDisabled = disabled || itemDisabled;

  return (
    <button
      type="button"
      data-slot="horizontal-select-item"
      data-state={isSelected ? 'active' : 'inactive'}
      disabled={isDisabled}
      onClick={(e) => {
        e.preventDefault();
        if (!isDisabled && !isSelected) {
          onValueChange(itemValue);
        }
      }}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap',
        'transition-colors outline-none select-none cursor-pointer',
        'text-muted-foreground data-[state=active]:text-accent-foreground',
        'data-[state=active]:cursor-default data-[state=active]:bg-accent',
        'hover:data-[state=inactive]:bg-accent/50 hover:data-[state=inactive]:text-accent-foreground',
        'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function HorizontalSelectSeparator({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="horizontal-select-separator"
      className={cn(
        'pointer-events-none -mx-1 my-1 h-px w-px bg-border',
        className,
      )}
      {...props}
    />
  );
}

export {
  HorizontalSelect,
  HorizontalSelectGroup,
  HorizontalSelectItem,
  HorizontalSelectLabel,
  HorizontalSelectSeparator,
};
