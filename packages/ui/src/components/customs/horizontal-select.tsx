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
          'inline-flex w-fit items-center justify-start gap-1 rounded-4xl border border-input bg-input/30 p-1 flex-wrap',
          'transition-colors outline-none',
          'aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20',
          'dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
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
        'inline-flex items-center justify-center gap-1.5 rounded-4xl px-3 py-1 text-sm font-medium whitespace-nowrap',
        'transition-colors outline-none',
        'text-muted-foreground data-[state=active]:text-foreground',
        'data-[state=active]:cursor-default data-[state=active]:bg-background',
        'data-[state=active]:border data-[state=active]:border-input/50',
        'hover:data-[state=inactive]:bg-input/50 hover:data-[state=inactive]:text-foreground',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
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
      className={cn('mx-1 h-5 w-px bg-border/50', className)}
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
