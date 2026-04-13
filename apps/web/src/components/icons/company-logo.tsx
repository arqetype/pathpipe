'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Building2 } from 'lucide-react';
import { useTheme } from 'next-themes';

type LogoType = 'icon' | 'logo' | 'symbol';

type CompanyLogoProps = {
  name: string;
  type?: LogoType;
  size?: number;
  className?: string;
};

export function CompanyLogo({
  name,
  type = 'icon',
  size = 12,
  className,
}: CompanyLogoProps) {
  const [brandId, setBrandId] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!name) return;

    let cancelled = false;

    fetch(`https://api.brandfetch.io/v2/search/${encodeURIComponent(name)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((results) => {
        if (cancelled || !results?.[0]?.brandId) return;
        setBrandId(results[0].brandId);
        setError(false);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [name]);

  if (error || !brandId) {
    return <Building2 className={className ?? 'size-3 shrink-0'} />;
  }

  const theme = resolvedTheme === 'dark' ? 'dark' : 'light';
  const src = `https://cdn.brandfetch.io/${brandId}/fallback/404/${type}.svg&theme=${theme}`;

  return (
    <Image
      src={src}
      alt=""
      className={className ?? 'size-3 shrink-0 rounded-sm object-contain'}
      width={size}
      height={size}
      onError={() => setError(true)}
      unoptimized
    />
  );
}
