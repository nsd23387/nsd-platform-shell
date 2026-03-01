/**
 * Display formatting utilities for marketing metrics.
 * Pure render helpers — no computation.
 */

export function formatCurrency(value: number): string {
  return `$${(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatNumber(value: number): string {
  return (value ?? 0).toLocaleString('en-US');
}

export function formatPercent(ratio: number, decimals: number = 1): string {
  return `${((ratio ?? 0) * 100).toFixed(decimals)}%`;
}

export function formatDuration(seconds: number): string {
  const s = seconds ?? 0;
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

export function formatPosition(value: number): string {
  return (value ?? 0).toFixed(1);
}
