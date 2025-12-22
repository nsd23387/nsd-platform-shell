/**
 * DashboardHeader Component
 * 
 * Header for dashboard pages with title and time period selector.
 * Read-only - no edit actions.
 * 
 * Updated to use design system tokens.
 */

import React from 'react';
import type { TimePeriod } from '../../types/activity-spine';
import {
  background,
  text,
  border,
} from '../../design/tokens/colors';
import {
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
} from '../../design/tokens/typography';
import { space, radius, duration, easing } from '../../design/tokens/spacing';

export interface DashboardHeaderProps {
  title: string;
  description?: string;
  period: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
  lastUpdated?: string;
}

const headerStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: space['8'],
  paddingBottom: space['6'],
  borderBottom: `1px solid ${border.default}`,
};

const titleStyles: React.CSSProperties = {
  fontFamily: fontFamily.display,
  fontSize: fontSize['4xl'],
  fontWeight: fontWeight.semibold,
  color: text.primary,
  marginBottom: space['1'],
  lineHeight: lineHeight.snug,
};

const descriptionStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.base,
  color: text.muted,
  lineHeight: lineHeight.normal,
};

const controlsStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: space['4'],
};

const periodButtonStyles = (isActive: boolean): React.CSSProperties => ({
  padding: `${space['2']} ${space['4']}`,
  fontFamily: fontFamily.body,
  fontSize: fontSize.base,
  fontWeight: fontWeight.medium,
  backgroundColor: isActive ? text.primary : background.surface,
  color: isActive ? text.inverse : text.secondary,
  border: `1px solid ${border.default}`,
  borderRadius: radius.md,
  cursor: 'pointer',
  transition: `all ${duration.normal} ${easing.DEFAULT}`,
});

const lastUpdatedStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  color: text.muted,
};

export function DashboardHeader({
  title,
  description,
  period,
  onPeriodChange,
  lastUpdated,
}: DashboardHeaderProps) {
  return (
    <div style={headerStyles}>
      <div>
        <h1 style={titleStyles}>{title}</h1>
        {description && <p style={descriptionStyles}>{description}</p>}
      </div>
      <div style={controlsStyles}>
        {lastUpdated && (
          <span style={lastUpdatedStyles}>
            Last updated: {lastUpdated}
          </span>
        )}
        <div style={{ display: 'flex', gap: space['2'] }}>
          <button
            style={periodButtonStyles(period === '7d')}
            onClick={() => onPeriodChange('7d')}
          >
            7 Days
          </button>
          <button
            style={periodButtonStyles(period === '30d')}
            onClick={() => onPeriodChange('30d')}
          >
            30 Days
          </button>
        </div>
      </div>
    </div>
  );
}
