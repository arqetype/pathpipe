import * as React from 'react';

import { cn } from '@repo/ui/lib/utils';

interface AuthVerificationErrorProps extends React.ComponentProps<'div'> {
  success?: boolean;
  message?: string;
}

function AuthVerificationError({
  className,
  success = false,
  message,
  ...props
}: AuthVerificationErrorProps) {
  if (!message) return null;

  return (
    <div
      className={cn(
        'p-3 rounded-md text-sm',
        success
          ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
          : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        className,
      )}
      {...props}
    >
      {message}
    </div>
  );
}

export { AuthVerificationError };
