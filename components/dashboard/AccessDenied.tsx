/**
 * AccessDenied Component
 * 
 * Displayed when a user lacks permission to view a dashboard.
 * Uses M12 design tokens for consistent styling.
 * 
 * Read-only component - no action affordances.
 */

import React from 'react';
import { text, background } from '../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../design/tokens/typography';
import { space } from '../../design/tokens/spacing';

export interface AccessDeniedProps {
  /** Optional custom message */
  message?: string;
}

export function AccessDenied({ 
  message = 'You do not have permission to view this dashboard.' 
}: AccessDeniedProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        fontFamily: fontFamily.body,
        color: text.muted,
      }}
    >
      <span 
        style={{ 
          fontSize: '48px', 
          marginBottom: space['4'],
          // Reduce visual weight of emoji
          opacity: 0.8,
        }}
        role="img"
        aria-label="Locked"
      >
        🔒
      </span>
      <h2
        style={{
          fontFamily: fontFamily.display,
          fontSize: fontSize['2xl'],
          fontWeight: fontWeight.semibold,
          color: text.secondary,
          marginBottom: space['2'],
          lineHeight: lineHeight.snug,
        }}
      >
        Access Denied
      </h2>
      <p
        style={{
          fontSize: fontSize.base,
          color: text.muted,
          lineHeight: lineHeight.normal,
          textAlign: 'center',
          maxWidth: '400px',
        }}
      >
        {message}
      </p>
    </div>
  );
}

export default AccessDenied;
