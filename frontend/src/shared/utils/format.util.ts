/**
 * Safe formatting utilities for Qynova ERP
 * Handles null, undefined, NaN, and strings safely without runtime crashes.
 * Preserves legitimate zero amounts (₹0).
 */

export const formatCurrency = (
  amt: number | string | null | undefined,
  options?: { maximumFractionDigits?: number; minimumFractionDigits?: number }
): string => {
  if (amt === null || amt === undefined || amt === '') return '—';
  const num = typeof amt === 'number' ? amt : Number(amt);
  if (isNaN(num)) return '—';
  return `₹${new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: options?.maximumFractionDigits ?? 0,
    minimumFractionDigits: options?.minimumFractionDigits,
  }).format(num)}`;
};

export const formatNumber = (
  num: number | string | null | undefined,
  decimals: number = 0
): string => {
  if (num === null || num === undefined || num === '') return '—';
  const val = typeof num === 'number' ? num : Number(num);
  if (isNaN(val)) return '—';
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(val);
};

export const formatDate = (
  date: string | Date | null | undefined,
  fallback: string = '—'
): string => {
  if (!date) return fallback;
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return fallback;
    return d.toISOString().split('T')[0];
  } catch {
    return fallback;
  }
};
