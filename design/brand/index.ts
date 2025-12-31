/**
 * Design System: Brand Index
 * 
 * Brand-related exports and utilities.
 * The main brand documentation lives in markdown files:
 * - usage-rules.md
 * - anti-patterns.md
 */

/**
 * Brand metadata
 */
export const brand = {
  name: 'Neon Signs Depot',
  shortName: 'NSD',
  product: 'Platform Shell',
  tagline: 'Unified internal platform',
} as const;

/**
 * Design principles for reference
 */
export const designPrinciples = [
  {
    name: 'Calm',
    description: 'No visual noise, no urgency-inducing elements',
  },
  {
    name: 'Editorial',
    description: 'Typography-forward with generous white space',
  },
  {
    name: 'Trustworthy',
    description: 'Clear, honest presentation of data',
  },
  {
    name: 'Minimal',
    description: 'Border over fill, function over decoration',
  },
  {
    name: 'Accessible',
    description: 'Readable by all, keyboard navigable',
  },
] as const;

/**
 * Quick reference for font usage
 */
export const fontUsage = {
  headers: 'Poppins',
  body: 'Inter',
  code: 'JetBrains Mono',
} as const;

/**
 * Quick reference for max font weights
 */
export const maxFontWeight = 600;

export type Brand = typeof brand;
export type DesignPrinciples = typeof designPrinciples;
