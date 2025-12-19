/**
 * MetricCard Component
 * 
 * Specialized card for displaying single metric values.
 * Read-only display with optional comparison data.
 */

import React from 'react';
import { DashboardCard, DashboardCardProps } from './DashboardCard';

export interface MetricCardProps extends Omit<DashboardCardProps, 'children'> {
  unit?: string;
  comparison?: {
    label: string;
    value: string | number;
  };
}

export function MetricCard({
  value,
  unit,
  comparison,
  ...props
}: MetricCardProps) {
  const displayValue = unit ? `${value}${unit}` : value;

  return (
    <DashboardCard {...props} value={displayValue}>
      {comparison && (
        <div
          style={{
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid #f3f4f6',
            fontSize: '13px',
            color: '#6b7280',
          }}
        >
          <span>{comparison.label}: </span>
          <span style={{ fontWeight: 500, color: '#374151' }}>
            {comparison.value}
          </span>
        </div>
      )}
    </DashboardCard>
  );
}
