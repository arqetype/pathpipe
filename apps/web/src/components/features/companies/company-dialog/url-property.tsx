'use client';

import type { ReactNode } from 'react';
import { RiLink } from '@remixicon/react';
import Property from '@repo/ui/components/customs/property';
import InlineInput from '@repo/ui/components/inline-inputs/inline-input';

interface CompanyUrlPropertyProps {
  icon: ReactNode;
  label: string;
  value: string;
  onSave: (value: string | undefined) => void;
}

export function CompanyUrlProperty({
  icon,
  label,
  value,
  onSave,
}: CompanyUrlPropertyProps) {
  return (
    <Property icon={icon} label={label}>
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <InlineInput value={value} placeholder="https://…" onSave={onSave} />
        {value && (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <RiLink className="size-3.5" />
          </a>
        )}
      </div>
    </Property>
  );
}
