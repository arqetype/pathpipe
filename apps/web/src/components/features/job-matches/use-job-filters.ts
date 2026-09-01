'use client';

import { useCallback, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * Filters live in the URL.
 *
 * That keeps the whole board server-rendered — a filtered view is a plain
 * navigation — and makes any state of the board a link the user can keep.
 */
export function useJobFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const commit = useCallback(
    (params: URLSearchParams) => {
      // Any change to what is being filtered invalidates the page number.
      params.delete('page');
      const qs = params.toString();
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [pathname, router],
  );

  const values = useCallback(
    (key: string) => searchParams.getAll(key),
    [searchParams],
  );

  const value = useCallback(
    (key: string) => searchParams.get(key) ?? '',
    [searchParams],
  );

  const set = useCallback(
    (key: string, next: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next) params.set(key, next);
      else params.delete(key);
      commit(params);
    },
    [commit, searchParams],
  );

  /** Several keys in one navigation, so two ends of a range cannot race. */
  const setMany = useCallback(
    (entries: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, next] of Object.entries(entries)) {
        if (next) params.set(key, next);
        else params.delete(key);
      }
      commit(params);
    },
    [commit, searchParams],
  );

  const toggle = useCallback(
    (key: string, entry: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const current = params.getAll(key);
      params.delete(key);
      const next = current.includes(entry)
        ? current.filter((item) => item !== entry)
        : [...current, entry];
      for (const item of next) params.append(key, item);
      commit(params);
    },
    [commit, searchParams],
  );

  /** Keeps the selected offer — only the filtering is cleared. */
  const clear = useCallback(() => {
    const params = new URLSearchParams();
    const selected = searchParams.get('job');
    if (selected) params.set('job', selected);
    commit(params);
  }, [commit, searchParams]);

  const goToPage = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (page > 1) params.set('page', String(page));
      else params.delete('page');
      const qs = params.toString();
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: true });
      });
    },
    [pathname, router, searchParams],
  );

  const select = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('job', id);
      const qs = params.toString();
      startTransition(() => {
        router.push(`${pathname}?${qs}`, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  /** How many filters are active, for the "clear" affordance. */
  const activeCount = Array.from(searchParams.entries()).filter(
    ([key]) => key !== 'job' && key !== 'page' && key !== 'sortBy',
  ).length;

  return {
    isPending,
    values,
    value,
    set,
    setMany,
    toggle,
    clear,
    select,
    goToPage,
    activeCount,
  };
}
