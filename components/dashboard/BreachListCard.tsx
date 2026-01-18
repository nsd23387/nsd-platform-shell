/**
 * BreachListCard Component
 * 
 * Card for displaying SLA breach breakdown by category.
 * Read-only list display.
 * 
 * Updated to use design system tokens.
 * 
 * GOVERNANCE NOTE:
 * This component displays pre-computed breach counts.
 * The `.reduce()` operation (line 27) sums already-computed breach counts
 * for display total only - it does NOT compute new metrics.
 * The input `breaches` object contains values already computed upstream.
 * 
 * This is an ALLOWED transformation per governance audit.
 * See: docs/seo/METRICS_AUDIT.md
 */

import React from 'react';
import { DashboardCard, DashboardCardProps } from './DashboardCard';
import { text, border, semantic, background } from '../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../design/tokens/typography';
import { space, radius } from '../../design/tokens/spacing';

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
        <div style={{ marginTop: space['2'] }}>
          {entries.map(([type, count]) => (
            <div
              key={type}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: `${space['2']} 0`,
                borderBottom: `1px solid ${border.subtle}`,
              }}
            >
              <span
                style={{
                  fontFamily: fontFamily.body,
                  fontSize: fontSize.base,
                  color: text.secondary,
                }}
              >
                {type}
              </span>
              <span
                style={{
                  fontFamily: fontFamily.body,
                  fontSize: fontSize.base,
                  fontWeight: fontWeight.semibold,
                  color: count > 0 ? semantic.danger.dark : text.muted,
                  backgroundColor: count > 0 ? semantic.danger.light : background.muted,
                  padding: `${space['0.5']} ${space['2.5']}`,
                  borderRadius: radius.full,
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
              padding: `${space['3']} 0 0`,
              fontWeight: fontWeight.semibold,
            }}
          >
            <span
              style={{
                fontFamily: fontFamily.body,
                fontSize: fontSize.base,
                color: text.secondary,
              }}
            >
              Total
            </span>
            <span
              style={{
                fontFamily: fontFamily.body,
                fontSize: fontSize.base,
                color: text.primary,
              }}
            >
              {total}
            </span>
          </div>
        </div>
      )}
    </DashboardCard>
  );
}
