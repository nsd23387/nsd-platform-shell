/**
 * Design System: Typography Tokens
 * 
 * Typography system aligned with neonsignsdepot.com brand.
 * 
 * Rules:
 * - Poppins for headers (display, h1-h4)
 * - Inter for body/UI text
 * - Font weights 400-600 only (no 700+ for calm hierarchy)
 * - Generous line heights for readability
 */

// ============================================
// Font Families
// ============================================

/**
 * Font stack definitions
 * Poppins = headers, Inter = body
 */
export const fontFamily = {
  /** Display and header font */
  display: "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  /** Body and UI font */
  body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  /** Monospace for code/data */
  mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace",
} as const;

// ============================================
// Font Sizes
// ============================================

/**
 * Font size scale
 * Based on a minor third (1.2) ratio for harmonious scaling
 */
export const fontSize = {
  /** 11px - Fine print, timestamps */
  xs: '0.6875rem',
  /** 12px - Captions, labels */
  sm: '0.75rem',
  /** 13px - Small body, table cells */
  md: '0.8125rem',
  /** 14px - Default body text */
  base: '0.875rem',
  /** 16px - Large body, emphasis */
  lg: '1rem',
  /** 18px - Section headers, h4 */
  xl: '1.125rem',
  /** 20px - h3 */
  '2xl': '1.25rem',
  /** 24px - h2 */
  '3xl': '1.5rem',
  /** 28px - h1 */
  '4xl': '1.75rem',
  /** 32px - Page titles */
  '5xl': '2rem',
  /** 36px - Display text */
  '6xl': '2.25rem',
} as const;

// ============================================
// Font Weights
// ============================================

/**
 * Font weight scale
 * Restricted to 400-600 for calm, editorial feel
 * NO 700+ weights - this is intentional
 */
export const fontWeight = {
  /** Normal text */
  normal: 400,
  /** Medium emphasis */
  medium: 500,
  /** Strong emphasis (max weight for calm UI) */
  semibold: 600,
} as const;

// ============================================
// Line Heights
// ============================================

/**
 * Line height scale
 * Generous values for improved readability
 */
export const lineHeight = {
  /** Tight - for large display text */
  tight: 1.2,
  /** Snug - for headings */
  snug: 1.3,
  /** Normal - for body text */
  normal: 1.5,
  /** Relaxed - for small text */
  relaxed: 1.625,
  /** Loose - for captions */
  loose: 1.75,
} as const;

// ============================================
// Letter Spacing
// ============================================

/**
 * Letter spacing scale
 */
export const letterSpacing = {
  /** Tight - for large headings */
  tight: '-0.025em',
  /** Normal - default */
  normal: '0',
  /** Wide - for small caps, labels */
  wide: '0.025em',
  /** Wider - for all-caps text */
  wider: '0.05em',
} as const;

// ============================================
// Text Styles (Composite Tokens)
// ============================================

/**
 * Pre-composed text styles for common use cases
 * These combine font-family, size, weight, and line-height
 */
export const textStyles = {
  /** Large display text - page hero */
  display: {
    fontFamily: fontFamily.display,
    fontSize: fontSize['6xl'],
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.tight,
    letterSpacing: letterSpacing.tight,
  },
  
  /** Page title - h1 */
  h1: {
    fontFamily: fontFamily.display,
    fontSize: fontSize['4xl'],
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.snug,
    letterSpacing: letterSpacing.tight,
  },
  
  /** Section title - h2 */
  h2: {
    fontFamily: fontFamily.display,
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.snug,
  },
  
  /** Subsection title - h3 */
  h3: {
    fontFamily: fontFamily.display,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.snug,
  },
  
  /** Card/component title - h4 */
  h4: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.snug,
  },
  
  /** Default body text */
  body: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.normal,
  },
  
  /** Small body text */
  bodySmall: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.md,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.normal,
  },
  
  /** UI labels, form labels */
  label: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.normal,
  },
  
  /** Caption text, timestamps */
  caption: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.relaxed,
  },
  
  /** Metric/data values */
  metric: {
    fontFamily: fontFamily.body,
    fontSize: fontSize['5xl'],
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.tight,
  },
  
  /** Metric labels */
  metricLabel: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.normal,
  },
  
  /** Button text */
  button: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.tight,
  },
  
  /** Small button text */
  buttonSmall: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.tight,
  },
} as const;

// ============================================
// Export all typography tokens
// ============================================

export const typography = {
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  textStyles,
} as const;

export type Typography = typeof typography;
