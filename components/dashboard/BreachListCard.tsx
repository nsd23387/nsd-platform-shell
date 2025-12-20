/**
 * BreachListCard Component
 * 
 * Card for displaying SLA breach breakdown by category.
 * Read-only list display.
 */

import React from 'react';
import { DashboardCard, DashboardCardProps } from './DashboardCard';

export interface BreachListCardProps extends Omit<DashboardCardProps, 'value' | 'children'> {
  breaches: Record<string, number>;
  emptyMessage?: string;
}

export function BreachListCard({
  breaches,
  emptyMessage = 'No breaches recorded',
  ...props
}: BreachListCardProps) {
  const entries = Object.entries(breaches).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  const isEmpty = entries.length === 0 || total === 0;

  return (
    <DashboardCard {...props} empty={isEmpty} emptyMessage={emptyMessage}>
      {!isEmpty && (
        <div style={{ marginTop: '8px' }}>
          {entries.map(([type, count]) => (
            <div
              key={type}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
                borderBottom: '1px solid #f3f4f6',
              }}
            >
              <span style={{ fontSize: '14px', color: '#374151' }}>{type}</span>
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: count > 0 ? '#ef4444' : '#6b7280',
                  backgroundColor: count > 0 ? '#fef2f2' : '#f3f4f6',
                  padding: '2px 10px',
                  borderRadius: '12px',
                }}
              >
                {count}
              </span>
            </div>
          ))}
          
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 0 0',
              fontWeight: 600,
            }}
          >
            <span style={{ fontSize: '14px', color: '#374151' }}>Total</span>
            <span style={{ fontSize: '14px', color: '#111827' }}>{total}</span>
          </div>
        </div>
      )}
    </DashboardCard>
  );
}
