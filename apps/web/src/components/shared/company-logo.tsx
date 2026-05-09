'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { RiBuildingLine } from '@remixicon/react';
import { cn } from '@repo/ui/lib/utils';
import { Skeleton } from '@repo/ui/components/skeleton';
import { fetchCompanyLogo } from '@/actions/company/fetch-company-logo';

const logoCache = new Map<string, string>();

type CompanyLogoProps = {
  name: string;
  companyId?: string;
  cacheKey?: string | number;
  size?: number;
  className?: string;
};

export function CompanyLogo({
  name,
  companyId,
  cacheKey,
  size = 12,
  className,
}: CompanyLogoProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    const mapKey = `${companyId}:${cacheKey ?? ''}`;
    const cached = logoCache.get(mapKey);
    if (cached) {
      setSrc(cached);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchCompanyLogo(companyId)
      .then((url) => {
        if (!cancelled) {
          if (url) logoCache.set(mapKey, url);
          setSrc(url ?? null);
        }
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, cacheKey]);

  if (loading) {
    return <Skeleton className={cn('size-5 shrink-0 rounded-sm', className)} />;
  }

  if (!src) {
    return <RiBuildingLine className={cn('size-5 shrink-0', className)} />;
  }

  return (
    <Image
      src={src}
      alt={name}
      className={cn('size-5 shrink-0 rounded-sm object-cover', className)}
      width={size}
      height={size}
    />
  );
}
