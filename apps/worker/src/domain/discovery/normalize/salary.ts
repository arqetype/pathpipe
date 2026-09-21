import type { DiscoveredJob } from '../types';

const CURRENCY_SYMBOLS: Record<string, string> = {
  '€': 'EUR',
  $: 'USD',
  '£': 'GBP',
  '¥': 'JPY',
  CHF: 'CHF',
};

// Excludes hourly rates.
export const asSalary = (value: number | undefined): number | undefined =>
  value !== undefined &&
  Number.isFinite(value) &&
  value >= 1000 &&
  value <= 10_000_000
    ? Math.round(value)
    : undefined;

export const parseSalary = (
  text: string | undefined,
): Pick<DiscoveredJob, 'salaryMin' | 'salaryMax' | 'salaryCurrency'> => {
  if (!text) return {};
  const match =
    /([€$£¥]|CHF)?\s*(\d{1,3}(?:[.,\s]\d{3})+|\d{2,3})\s*(k)?\s*(?:-|–|—|to|à|bis)\s*([€$£¥]|CHF)?\s*(\d{1,3}(?:[.,\s]\d{3})+|\d{2,3})\s*(k)?/i.exec(
      text,
    );
  if (!match) return {};

  const toNumber = (value: string, thousands: boolean): number | undefined => {
    const digits = Number.parseInt(value.replace(/[.,\s]/g, ''), 10);
    return asSalary(thousands ? digits * 1000 : digits);
  };

  const min = toNumber(match[2] ?? '', Boolean(match[3]));
  const max = toNumber(match[5] ?? '', Boolean(match[6]));
  if (min === undefined || max === undefined || max < min) return {};

  const symbol = match[1] ?? match[4];
  return {
    salaryMin: min,
    salaryMax: max,
    salaryCurrency: symbol ? CURRENCY_SYMBOLS[symbol] : undefined,
  };
};
