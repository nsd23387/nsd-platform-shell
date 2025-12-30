/**
 * Design System: Color Tokens
 * 
 * Brand-aligned colors extracted from the NSD Platform Shell.
 * Aligned with neonsignsdepot.com visual identity.
 * 
 * Rules:
 * - Soft White for backgrounds
 * - Deep Indigo for primary text
 * - Violet for subtle emphasis
 * - Magenta reserved for rare CTAs only
 * - Border > fill (prefer outlines over solid fills)
 */

// ============================================
// Core Brand Colors
// ============================================

/**
 * Primary palette - Deep Indigo spectrum
 * Used for text, borders, and primary UI elements
 */
export const indigo = {
  50: '#f5f5ff',
  100: '#ededff',
  200: '#dcdcff',
  300: '#c4c4fc',
  400: '#a8a8f5',
  500: '#8b8beb',
  600: '#6b6bd4',
  700: '#5252b5',
  800: '#3d3d8f',
  900: '#2d2d6e',
  950: '#1e1e4a',
} as const;

/**
 * Accent palette - Violet for subtle emphasis
 * Used sparingly for highlights and interactive states
 */
export const violet = {
  50: '#f5f3ff',
  100: '#ede9fe',
  200: '#ddd6fe',
  300: '#c4b5fd',
  400: '#a78bfa',
  500: '#8b5cf6',
  600: '#7c3aed',
  700: '#6d28d9',
  800: '#5b21b6',
  900: '#4c1d95',
} as const;

/**
 * CTA color - Magenta (use extremely sparingly)
 * Reserved for primary call-to-action buttons only
 */
export const magenta = {
  50: '#fdf2f8',
  100: '#fce7f3',
  200: '#fbcfe8',
  300: '#f9a8d4',
  400: '#f472b6',
  500: '#ec4899',
  600: '#db2777',
  700: '#be185d',
  800: '#9d174d',
  900: '#831843',
} as const;

// ============================================
// Neutral Colors (Soft White Spectrum)
// ============================================

/**
 * Neutral palette - Soft white-gray spectrum
 * Used for backgrounds, borders, and secondary text
 */
export const neutral = {
  white: '#ffffff',
  50: '#fafafa',
  100: '#f5f5f5',
  150: '#f0f0f0',
  200: '#e5e5e5',
  300: '#d4d4d4',
  400: '#a3a3a3',
  500: '#737373',
  600: '#525252',
  700: '#404040',
  800: '#262626',
  900: '#171717',
  black: '#0a0a0a',
} as const;

// ============================================
// Semantic Colors
// ============================================

/**
 * Status colors for data visualization and feedback
 * Kept minimal and muted to maintain calm UI
 */
export const semantic = {
  success: {
    light: '#ecfdf5',
    base: '#10b981',
    dark: '#047857',
  },
  warning: {
    light: '#fefce8',
    base: '#eab308',
    dark: '#a16207',
  },
  danger: {
    light: '#fef2f2',
    base: '#ef4444',
    dark: '#b91c1c',
  },
  info: {
    light: '#f0f9ff',
    base: '#0ea5e9',
    dark: '#0369a1',
  },
} as const;

// ============================================
// Functional Color Tokens
// ============================================

/**
 * Background colors
 */
export const background = {
  /** Primary page background - soft white */
  page: '#fafafa',
  /** Card/surface background - pure white */
  surface: '#ffffff',
  /** Subtle emphasis background */
  muted: '#f5f5f5',
  /** Hover state for interactive elements */
  hover: '#f0f0f0',
  /** Active/pressed state */
  active: '#e5e5e5',
} as const;

/**
 * Text colors
 */
export const text = {
  /** Primary text - deep indigo tinted */
  primary: '#1e1e4a',
  /** Secondary text */
  secondary: '#525252',
  /** Muted/tertiary text */
  muted: '#737373',
  /** Placeholder text */
  placeholder: '#a3a3a3',
  /** Disabled text */
  disabled: '#d4d4d4',
  /** Inverted text (on dark backgrounds) */
  inverse: '#ffffff',
} as const;

/**
 * Border colors
 */
export const border = {
  /** Default border */
  default: '#e5e5e5',
  /** Subtle border for internal divisions */
  subtle: '#f0f0f0',
  /** Emphasized border */
  strong: '#d4d4d4',
  /** Focus ring color */
  focus: '#8b5cf6',
} as const;

// ============================================
// Component-Specific Colors
// ============================================

/**
 * Card variant colors (left border accents)
 */
export const cardVariants = {
  default: 'transparent',
  success: '#10b981',
  warning: '#eab308',
  danger: '#ef4444',
} as const;

/**
 * Status pill colors
 */
export const statusColors = {
  exceptional: {
    bg: '#ecfdf5',
    text: '#047857',
    border: '#10b981',
  },
  standard: {
    bg: '#fefce8',
    text: '#a16207',
    border: '#eab308',
  },
  breach: {
    bg: '#fef2f2',
    text: '#b91c1c',
    border: '#ef4444',
  },
  pending: {
    bg: '#f5f5f5',
    text: '#525252',
    border: '#d4d4d4',
  },
  active: {
    bg: '#f0f9ff',
    text: '#0369a1',
    border: '#0ea5e9',
  },
} as const;

/**
 * Trend indicator colors
 */
export const trendColors = {
  up: {
    bg: '#ecfdf5',
    text: '#047857',
  },
  down: {
    bg: '#fef2f2',
    text: '#b91c1c',
  },
  neutral: {
    bg: '#f5f5f5',
    text: '#525252',
  },
} as const;

/**
 * Chart/visualization colors
 * Ordered for optimal distinction
 */
export const chartColors = [
  '#8b5cf6', // violet
  '#10b981', // green
  '#0ea5e9', // sky
  '#f59e0b', // amber
  '#ef4444', // red
  '#06b6d4', // cyan
] as const;

// ============================================
// Export all color tokens
// ============================================

export const colors = {
  indigo,
  violet,
  magenta,
  neutral,
  semantic,
  background,
  text,
  border,
  cardVariants,
  statusColors,
  trendColors,
  chartColors,
} as const;

export type Colors = typeof colors;
