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

// Module-level cache: name → brandId (null means "not found")
const brandIdCache = new Map<string, string | null>();

export function CompanyLogo({
  name,
  type = 'icon',
  size = 12,
  className,
}: CompanyLogoProps) {
  const [brandId, setBrandId] = useState<string | null>(
    () => brandIdCache.get(name) ?? null,
  );
  const [error, setError] = useState(
    () => brandIdCache.has(name) && !brandIdCache.get(name),
  );
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!name || brandIdCache.has(name)) return;

    let cancelled = false;

    fetch(`https://api.brandfetch.io/v2/search/${encodeURIComponent(name)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((results) => {
        if (cancelled) return;
        const id = results?.[0]?.brandId ?? null;
        brandIdCache.set(name, id);
        if (id) {
          setBrandId(id);
        } else {
          setError(true);
        }
      })
      .catch(() => {
        brandIdCache.set(name, null);
        if (!cancelled) setError(true);
      });

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
