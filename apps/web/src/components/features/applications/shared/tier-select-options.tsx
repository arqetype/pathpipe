'use client';

import { SelectItem } from '@repo/ui/components/select';
import { APPLICATION_TIER_OPTIONS, TIER_CONFIG } from '../constants/tier';
import { cn } from '@repo/ui/lib/utils';
import { ApplicationTier } from '@repo/db/types/application/tier';

interface TierSelectOptionsProps {
  className?: string;
}

export function TierSelectOptions({ className }: TierSelectOptionsProps) {
  return (
    <>
      {APPLICATION_TIER_OPTIONS.map((opt) => {
        const cfg = TIER_CONFIG[opt.value as ApplicationTier];
        return (
          <SelectItem key={opt.value} value={opt.value} className={className}>
            <span className={cn('px-1.5 py-0.5 rounded border', cfg.className)}>
              {cfg.label}
            </span>
          </SelectItem>
        );
      })}
    </>
  );
}
