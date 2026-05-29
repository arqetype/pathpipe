'use client';

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from 'react';
import { usePathname } from 'next/navigation';
import { routes } from '@/route';

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbContextType = {
  breadcrumbs: BreadcrumbItem[];
  setBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void;
};

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(
  undefined,
);

export function BreadcrumbProvider({
  children,
  defaultLabels = {},
}: {
  children: ReactNode;
  defaultLabels?: Record<string, string>; // Map route segments to labels
}) {
  const pathname = usePathname();
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);

  // Automatically infer breadcrumbs from the current route
  useEffect(() => {
    if (!pathname) return;

    const segments = pathname.split('/').filter(Boolean); // Split and remove empty segments
    const inferredBreadcrumbs = segments.map((segment, index) => {
      const fullPath = '/' + segments.slice(0, index + 1).join('/');
      const href = index === segments.length - 1 ? undefined : fullPath; // No href for the current segment
      const label =
        defaultLabels[segment] ||
        routes[fullPath] ||
        segment.charAt(0).toUpperCase() + segment.slice(1);
      return {
        label,
        href,
      };
    });

    setBreadcrumbs(inferredBreadcrumbs);
  }, [pathname, defaultLabels]);

  return (
    <BreadcrumbContext.Provider value={{ breadcrumbs, setBreadcrumbs }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbs() {
  const context = useContext(BreadcrumbContext);
  if (!context) {
    throw new Error('useBreadcrumbs must be used within a BreadcrumbProvider');
  }
  return context;
}
