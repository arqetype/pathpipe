'use client';

import Image from 'next/image';
import { Building2 } from 'lucide-react';

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
    return <Building2 className={className ?? 'size-3 shrink-0'} />;
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
