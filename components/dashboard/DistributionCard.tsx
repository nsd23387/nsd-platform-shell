/**
 * DistributionCard Component
 * 
 * Card for displaying distribution data (e.g., stage distribution).
 * Read-only bar visualization.
 */

import React from 'react';
import { DashboardCard, DashboardCardProps } from './DashboardCard';

export interface DistributionItem {
  label: string;
  value: number;
  color?: string;
}

export interface DistributionCardProps extends Omit<DashboardCardProps, 'value' | 'children'> {
  items: DistributionItem[];
  showPercentages?: boolean;
}

const defaultColors = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
];

export function DistributionCard({
  items,
  showPercentages = true,
  ...props
}: DistributionCardProps) {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <DashboardCard {...props}>
      <div style={{ marginTop: '8px' }}>
        {items.map((item, index) => {
          const percentage = total > 0 ? (item.value / total) * 100 : 0;
          const color = item.color || defaultColors[index % defaultColors.length];

          return (
            <div key={item.label} style={{ marginBottom: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '4px',
                  fontSize: '13px',
                }}
              >
                <span style={{ color: '#374151' }}>{item.label}</span>
                <span style={{ color: '#6b7280' }}>
                  {item.value}
                  {showPercentages && ` (${percentage.toFixed(1)}%)`}
                </span>
              </div>
              <div
                style={{
                  height: '8px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${percentage}%`,
                    backgroundColor: color,
                    borderRadius: '4px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </DashboardCard>
  );
}
