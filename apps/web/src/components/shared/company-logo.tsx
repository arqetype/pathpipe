'use client';

import Image from 'next/image';
import { RiBuildingLine } from '@remixicon/react';

type CompanyLogoProps = {
  name: string;
  logoUrl?: string;
  size?: number;
  className?: string;
};

export function CompanyLogo({
  name,
  logoUrl,
  size = 12,
  className,
}: CompanyLogoProps) {
  if (!logoUrl) {
    return <RiBuildingLine className={className ?? 'size-3 shrink-0'} />;
  }

  return (
    <Image
      src={logoUrl}
      alt={name}
      className={className ?? 'size-3 shrink-0 rounded-sm object-contain'}
      width={size}
      height={size}
      unoptimized
    />
  );
}
