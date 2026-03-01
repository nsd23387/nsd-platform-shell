/**
 * Display formatting utilities for marketing metrics.
 * Pure render helpers — no computation.
 */

export function safeNumber(v: unknown): number {
  if (v == null) return 0;
  const n = Number(v);
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
}

export function formatCurrency(value: number): string {
  return `$${safeNumber(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatNumber(value: number): string {
  return safeNumber(value).toLocaleString('en-US');
}

export function formatPercent(ratio: number, decimals: number = 1): string {
  return `${(safeNumber(ratio) * 100).toFixed(decimals)}%`;
}

export function formatDuration(seconds: number): string {
  const s = safeNumber(seconds);
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

export function formatPosition(value: number): string {
  return safeNumber(value).toFixed(1);
}

export function safeDivideUI(numerator: number, denominator: number): number {
  const n = safeNumber(numerator);
  const d = safeNumber(denominator);
  if (d === 0) return 0;
  return n / d;
}
