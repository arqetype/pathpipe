'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Building2 } from 'lucide-react';

type CompanyLogoProps = {
  name: string;
  size?: number;
  className?: string;
};

export function CompanyLogo({ name, size = 12, className }: CompanyLogoProps) {
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!name) return;

    let cancelled = false;

    fetch(`https://api.brandfetch.io/v2/search/${encodeURIComponent(name)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((results) => {
        if (cancelled || !results?.[0]?.brandId) return;
        const { brandId } = results[0] as { brandId: string };
        setIconUrl(
          `https://cdn.brandfetch.io/${brandId}/fallback/404/icon.svg`,
        );
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [name]);

  if (error || !iconUrl) {
    return <Building2 className={className ?? 'size-3 shrink-0'} />;
  }

  return (
    <Image
      src={iconUrl}
      alt=""
      className={className ?? 'size-3 shrink-0 rounded-sm object-contain'}
      width={size}
      height={size}
      onError={() => setError(true)}
      unoptimized
    />
  );
}
