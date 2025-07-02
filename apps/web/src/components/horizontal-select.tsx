'use client';

import * as React from 'react';
import { cn } from '@repo/ui/lib/utils';

type HorizontalSelectOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

type HorizontalSelectProps = {
  options: HorizontalSelectOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
} & React.HTMLAttributes<HTMLDivElement>;

const HorizontalSelect = React.forwardRef<
  HTMLDivElement,
  HorizontalSelectProps
>(({ options, value, onChange, className, disabled, ...props }, ref) => {
  const handleSelection = (optionValue: string) => {
    if (value === optionValue) return; // Don't change if already selected
    onChange(optionValue);
  };

  return (
    <div
      ref={ref}
      data-slot="horizontal-select"
      className={cn(
        'bg-muted text-muted-foreground inline-flex w-fit items-center justify-start rounded-lg p-1.5 gap-1.5 flex-wrap',
        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
        disabled && 'opacity-50 pointer-events-none',
        className,
      )}
      {...props}
    >
      {options.map((option) => (
        <button
          key={option.value}
          onClick={(e) => {
            e.preventDefault();
            if (!option.disabled && !disabled) {
              handleSelection(option.value);
            }
          }}
          disabled={option.disabled || disabled}
          data-state={value === option.value ? 'active' : 'inactive'}
          className={cn(
            'px-3 py-1.5 data-[state=active]:cursor-default data-[state=active]:bg-background dark:data-[state=active]:text-foreground',
            'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30',
            'text-foreground dark:text-muted-foreground inline-flex items-center justify-center gap-1.5 rounded-md',
            'border border-transparent text-sm font-medium whitespace-nowrap transition-[color,box-shadow,background-color]',
            'focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50',
            'data-[state=active]:shadow-sm hover:data-[state=inactive]:bg-background/50 hover:data-[state=inactive]:text-foreground/80',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
});

HorizontalSelect.displayName = 'HorizontalSelect';

export default HorizontalSelect;
