import * as React from 'react';
import { LucideIcon } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

interface AuthVerificationAlertProps extends React.ComponentProps<'div'> {
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
}

function AuthVerificationAlert({
  className,
  icon,
  title,
  description,
  ...props
}: AuthVerificationAlertProps) {
  return (
    <div
      className={cn('rounded-lg border p-4 mb-4 bg-muted/50', className)}
      {...props}
    >
      <div className="flex items-start gap-4">
        <div className="rounded-full bg-primary/10 p-2">
          {React.createElement(icon, { className: 'h-4 w-4 text-primary' })}
        </div>
        <div>
          <h3 className="text-sm font-medium">{title}</h3>
          <div className="text-sm text-muted-foreground mt-1">
            {description}
          </div>
        </div>
      </div>
    </div>
  );
}

export { AuthVerificationAlert };
