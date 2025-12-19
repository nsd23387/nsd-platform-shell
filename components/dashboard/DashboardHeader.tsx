/**
 * DashboardHeader Component
 * 
 * Header for dashboard pages with title and time period selector.
 * Read-only - no edit actions.
 */

import React from 'react';
import type { TimePeriod } from '../../types/activity-spine';

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
  marginBottom: '32px',
  paddingBottom: '24px',
  borderBottom: '1px solid #e5e7eb',
};

const titleStyles: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: 700,
  color: '#111827',
  marginBottom: '4px',
};

const descriptionStyles: React.CSSProperties = {
  fontSize: '14px',
  color: '#6b7280',
};

const controlsStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
};

const periodButtonStyles = (isActive: boolean): React.CSSProperties => ({
  padding: '8px 16px',
  fontSize: '14px',
  fontWeight: 500,
  backgroundColor: isActive ? '#111827' : '#ffffff',
  color: isActive ? '#ffffff' : '#374151',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  cursor: 'pointer',
  transition: 'all 0.2s',
});

const lastUpdatedStyles: React.CSSProperties = {
  fontSize: '12px',
  color: '#9ca3af',
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
        <div style={{ display: 'flex', gap: '8px' }}>
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
