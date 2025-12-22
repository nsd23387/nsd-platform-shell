/**
 * Design System: Token Index
 * 
 * Central export for all design tokens.
 * Import from here for consistent access to the design system.
 */

export * from './colors';
export * from './typography';
export * from './spacing';

// Re-export main objects for convenient imports
export { colors } from './colors';
export { typography } from './typography';
export { spacing } from './spacing';

/**
 * Combined tokens export for full design system access
 */
import { colors } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';

export const tokens = {
  colors,
  typography,
  spacing,
} as const;

export type Tokens = typeof tokens;
