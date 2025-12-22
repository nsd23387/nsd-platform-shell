/**
 * Design System: Spacing Tokens
 * 
 * Spacing system for consistent layout and white space.
 * White-space-forward design - generous spacing throughout.
 * 
 * Base unit: 4px
 * Scale: 0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24
 */

// ============================================
// Base Spacing Scale
// ============================================

/**
 * Spacing scale based on 4px grid
 * Names follow t-shirt sizing for readability
 */
export const space = {
  /** 0px */
  none: '0',
  /** 2px - Hairline spacing */
  px: '1px',
  /** 2px - Minimal spacing */
  '0.5': '0.125rem',
  /** 4px - Tight spacing */
  '1': '0.25rem',
  /** 6px */
  '1.5': '0.375rem',
  /** 8px - Compact spacing */
  '2': '0.5rem',
  /** 10px */
  '2.5': '0.625rem',
  /** 12px - Default small spacing */
  '3': '0.75rem',
  /** 14px */
  '3.5': '0.875rem',
  /** 16px - Default spacing */
  '4': '1rem',
  /** 20px */
  '5': '1.25rem',
  /** 24px - Comfortable spacing */
  '6': '1.5rem',
  /** 28px */
  '7': '1.75rem',
  /** 32px - Section spacing */
  '8': '2rem',
  /** 36px */
  '9': '2.25rem',
  /** 40px */
  '10': '2.5rem',
  /** 48px - Large section spacing */
  '12': '3rem',
  /** 56px */
  '14': '3.5rem',
  /** 64px - Page-level spacing */
  '16': '4rem',
  /** 80px */
  '20': '5rem',
  /** 96px */
  '24': '6rem',
} as const;

// ============================================
// Semantic Spacing
// ============================================

/**
 * Component-level spacing tokens
 */
export const componentSpacing = {
  /** Inline spacing between icon and text */
  inlineIcon: space['2'],
  /** Spacing between form elements */
  formGap: space['4'],
  /** Card internal padding */
  cardPadding: space['6'],
  /** Card internal padding (compact) */
  cardPaddingCompact: space['4'],
  /** Section header margin bottom */
  sectionHeaderMargin: space['4'],
  /** Grid gap between cards */
  gridGap: space['6'],
  /** Page padding (sides) */
  pageInlinePadding: space['8'],
  /** Page padding (top/bottom) */
  pageBlockPadding: space['8'],
} as const;

/**
 * Layout spacing tokens
 */
export const layoutSpacing = {
  /** Sidebar width */
  sidebarWidth: '240px',
  /** Narrow content max-width */
  contentNarrow: '640px',
  /** Default content max-width */
  contentDefault: '960px',
  /** Wide content max-width */
  contentWide: '1200px',
  /** Full-width with gutters */
  contentFull: '1440px',
} as const;

// ============================================
// Border Radius
// ============================================

/**
 * Border radius scale
 */
export const radius = {
  /** No radius */
  none: '0',
  /** 2px - Subtle rounding */
  sm: '0.125rem',
  /** 4px - Default rounding */
  DEFAULT: '0.25rem',
  /** 6px - Medium rounding */
  md: '0.375rem',
  /** 8px - Large rounding */
  lg: '0.5rem',
  /** 12px - Extra large rounding */
  xl: '0.75rem',
  /** 16px - 2XL rounding */
  '2xl': '1rem',
  /** Full rounding (pills) */
  full: '9999px',
} as const;

// ============================================
// Shadows
// ============================================

/**
 * Box shadow scale
 * Minimal shadows - prefer borders over shadows
 * Only use for elevated elements (modals, dropdowns)
 */
export const shadow = {
  /** No shadow */
  none: 'none',
  /** Subtle shadow - barely visible */
  xs: '0 1px 2px rgba(0, 0, 0, 0.03)',
  /** Small shadow - for cards (use sparingly) */
  sm: '0 1px 3px rgba(0, 0, 0, 0.05)',
  /** Medium shadow - for dropdowns */
  md: '0 4px 6px rgba(0, 0, 0, 0.05)',
  /** Large shadow - for modals */
  lg: '0 10px 15px rgba(0, 0, 0, 0.05)',
} as const;

// ============================================
// Z-Index Scale
// ============================================

/**
 * Z-index scale for layering
 */
export const zIndex = {
  /** Below normal (background elements) */
  behind: -1,
  /** Default layer */
  base: 0,
  /** Raised elements */
  raised: 10,
  /** Sticky elements */
  sticky: 100,
  /** Dropdowns and popovers */
  dropdown: 200,
  /** Fixed elements (nav) */
  fixed: 300,
  /** Modals and dialogs */
  modal: 400,
  /** Toasts and notifications */
  toast: 500,
  /** Tooltips */
  tooltip: 600,
} as const;

// ============================================
// Transitions
// ============================================

/**
 * Transition duration scale
 */
export const duration = {
  /** Instant - no transition */
  instant: '0ms',
  /** Fast - micro-interactions */
  fast: '100ms',
  /** Normal - standard transitions */
  normal: '200ms',
  /** Slow - emphasis transitions */
  slow: '300ms',
  /** Slower - complex animations */
  slower: '500ms',
} as const;

/**
 * Transition timing functions
 */
export const easing = {
  /** Default ease */
  DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
  /** Ease in */
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  /** Ease out */
  out: 'cubic-bezier(0, 0, 0.2, 1)',
  /** Linear */
  linear: 'linear',
} as const;

// ============================================
// Export all spacing tokens
// ============================================

export const spacing = {
  space,
  componentSpacing,
  layoutSpacing,
  radius,
  shadow,
  zIndex,
  duration,
  easing,
} as const;

export type Spacing = typeof spacing;
