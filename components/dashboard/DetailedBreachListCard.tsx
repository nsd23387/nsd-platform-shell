/**
 * DetailedBreachListCard Component
 * 
 * Displays detailed SLA breach items for mockups.
 * Only shows items where sla_status === 'breach' (> 24h).
 * 
 * Read-only display - data comes from Activity Spine.
 * Does NOT include 'standard' or 'pending' items.
 * 
 * Updated to use design system tokens.
 */

import React from 'react';
import { DashboardCard, DashboardCardProps } from './DashboardCard';
import type { MockupBreachItem } from '../../types/activity-spine';
import { text, border, semantic, background } from '../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../design/tokens/typography';
import { space, radius } from '../../design/tokens/spacing';

export interface DetailedBreachListCardProps extends Omit<DashboardCardProps, 'value' | 'children'> {
  /** Only items with sla_status === 'breach' should be passed */
  breachItems: MockupBreachItem[] | null | undefined;
  /** Fallback to aggregate breaches by type if detailed items not available */
  breachesByQuoteType?: Record<string, number>;
  emptyMessage?: string;
  maxItems?: number;
}

/**
 * Format minutes into human-readable duration
 */
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMins = Math.round(minutes % 60);
  if (hours < 24) {
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

export function DetailedBreachListCard({
  breachItems,
  breachesByQuoteType,
  emptyMessage = 'No breaches (> 24h) recorded',
  maxItems = 10,
  loading,
  error,
  ...props
}: DetailedBreachListCardProps) {
  // Filter to only breach items (sla_status === 'breach')
  const filteredItems = breachItems?.filter((item) => item.slaStatus === 'breach') ?? [];
  
  // Sort by turnaround time descending (worst first)
  const sortedItems = [...filteredItems].sort(
    (a, b) => b.turnaroundMinutes - a.turnaroundMinutes
  );
  
  const displayItems = sortedItems.slice(0, maxItems);
  const hasMore = sortedItems.length > maxItems;

  // Fallback to aggregate view if no detailed items
  const hasDetailedItems = filteredItems.length > 0;
  const aggregateEntries = breachesByQuoteType
    ? Object.entries(breachesByQuoteType).sort((a, b) => b[1] - a[1])
    : [];
  const aggregateTotal = aggregateEntries.reduce((sum, [, count]) => sum + count, 0);
  
  const isEmpty = !hasDetailedItems && aggregateTotal === 0;

  return (
    <DashboardCard
      {...props}
      loading={loading}
      error={error}
      empty={isEmpty && !loading && !error}
      emptyMessage={emptyMessage}
    >
      {!isEmpty && (
        <div style={{ marginTop: space['2'] }}>
          {/* Detailed Items View */}
          {hasDetailedItems ? (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto',
                  gap: `${space['2']} ${space['4']}`,
                  fontFamily: fontFamily.body,
                  fontSize: fontSize.sm,
                  color: text.muted,
                  paddingBottom: space['2'],
                  borderBottom: `1px solid ${border.subtle}`,
                  marginBottom: space['2'],
                }}
              >
                <span>Quote</span>
                <span>Turnaround</span>
                <span>Elapsed</span>
              </div>

              {displayItems.map((item) => (
                <div
                  key={item.quoteId}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto',
                    gap: `${space['2']} ${space['4']}`,
                    padding: `${space['2']} 0`,
                    borderBottom: `1px solid ${border.subtle}`,
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: fontFamily.body,
                        fontSize: fontSize.md,
                        fontWeight: fontWeight.medium,
                        color: text.secondary,
                      }}
                    >
                      {item.quoteId}
                    </div>
                    <div
                      style={{
                        fontFamily: fontFamily.body,
                        fontSize: fontSize.sm,
                        color: text.muted,
                      }}
                    >
                      {item.quoteType}
                    </div>
                  </div>
                  <span
                    style={{
                      fontFamily: fontFamily.body,
                      fontSize: fontSize.md,
                      fontWeight: fontWeight.semibold,
                      color: semantic.danger.dark,
                      backgroundColor: semantic.danger.light,
                      padding: `${space['0.5']} ${space['2']}`,
                      borderRadius: radius.DEFAULT,
                    }}
                  >
                    {formatDuration(item.turnaroundMinutes)}
                  </span>
                  <span
                    style={{
                      fontFamily: fontFamily.body,
                      fontSize: fontSize.sm,
                      color: text.muted,
                    }}
                  >
                    {formatDuration(item.elapsedSinceInquiryMinutes)}
                  </span>
                </div>
              ))}

              {hasMore && (
                <div
                  style={{
                    padding: `${space['3']} 0 0`,
                    fontFamily: fontFamily.body,
                    fontSize: fontSize.sm,
                    color: text.muted,
                    textAlign: 'center',
                  }}
                >
                  + {sortedItems.length - maxItems} more breaches
                </div>
              )}

              <div
                style={{
                  marginTop: space['3'],
                  paddingTop: space['3'],
                  borderTop: `1px solid ${border.default}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontFamily: fontFamily.body,
                  fontSize: fontSize.md,
                }}
              >
                <span style={{ color: text.muted }}>Total Breaches</span>
                <span style={{ fontWeight: fontWeight.semibold, color: semantic.danger.base }}>
                  {filteredItems.length}
                </span>
              </div>
            </>
          ) : (
            /* Aggregate Fallback View */
            <>
              {aggregateEntries.map(([type, count]) => (
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
                    color: semantic.danger.base,
                  }}
                >
                  {aggregateTotal}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </DashboardCard>
  );
}
