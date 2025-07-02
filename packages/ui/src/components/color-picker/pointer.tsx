'use client';

import { cn } from '@repo/ui/lib/utils';
import { type JSX } from 'react';

interface Props {
  className?: string;
  top?: number;
  left: number;
  color: string;
}

export const Pointer = ({
  className,
  color,
  left,
  top = 0.5,
}: Props): JSX.Element => {
  const style = {
    top: `${top * 100}%`,
    left: `${left * 100}%`,
  };

  return (
    <div
      className={cn(
        '-translate-y-1/2 -translate-x-1/2 z-5 absolute size-4 border-white border-2 rounded-full overflow-hidden',
        className,
      )}
      style={style}
    >
      <div
        style={{ backgroundColor: color }}
        className="absolute inset-0 pointer-events-none"
      />
    </div>
  );
};
