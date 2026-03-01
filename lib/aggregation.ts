/**
 * Centralized Aggregation Utilities
 *
 * Shared numeric helpers for analytics endpoints.
 * No NaN, no undefined, no Infinity in outputs.
 */

/**
 * Coerce any database value to a finite number.
 * Returns 0 for null, undefined, NaN, and Infinity.
 */
export function toNumber(value: unknown): number {
  if (value == null) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Safe division that returns 0 when denominator is 0.
 * Result is rounded to `precision` decimal places (default 4).
 */
export function safeDivide(
  numerator: number,
  denominator: number,
  precision: number = 4
): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return 0;
  }
  const raw = numerator / denominator;
  const factor = Math.pow(10, precision);
  return Math.round(raw * factor) / factor;
}

/**
 * Weighted average: sum / weightSum.
 * Returns 0 when weightSum is 0.
 */
export function weightedAverage(sum: number, weightSum: number): number {
  return safeDivide(sum, weightSum);
}

/**
 * Clamp a number between min and max (inclusive).
 */
export function clamp(value: number, min: number, max: number): number {
  const v = toNumber(value);
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

/**
 * Ensure a number is non-negative. Returns 0 for negative values.
 */
export function nonNegative(value: number): number {
  const v = toNumber(value);
  return v < 0 ? 0 : v;
}
