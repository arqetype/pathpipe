'use client';

import { SelectItem } from '@repo/ui/components/select';
import { APPLICATION_TIER_OPTIONS, TIER_CONFIG } from '../constants/tier';
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
            {cfg.label}
          </SelectItem>
        );
      })}
    </>
  );
}
