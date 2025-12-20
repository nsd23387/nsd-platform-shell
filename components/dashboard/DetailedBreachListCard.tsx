/**
 * DetailedBreachListCard Component
 * 
 * Displays detailed SLA breach items for mockups.
 * Only shows items where sla_status === 'breach' (> 24h).
 * 
 * Read-only display - data comes from Activity Spine.
 * Does NOT include 'standard' or 'pending' items.
 */

import React from 'react';
import { DashboardCard, DashboardCardProps } from './DashboardCard';
import type { MockupBreachItem } from '../../types/activity-spine';

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
        <div style={{ marginTop: '8px' }}>
          {/* Detailed Items View */}
          {hasDetailedItems ? (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto',
                  gap: '8px 16px',
                  fontSize: '12px',
                  color: '#6b7280',
                  paddingBottom: '8px',
                  borderBottom: '1px solid #f3f4f6',
                  marginBottom: '8px',
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
                    gap: '8px 16px',
                    padding: '8px 0',
                    borderBottom: '1px solid #f3f4f6',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#374151',
                      }}
                    >
                      {item.quoteId}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#6b7280',
                      }}
                    >
                      {item.quoteType}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#ef4444',
                      backgroundColor: '#fef2f2',
                      padding: '2px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    {formatDuration(item.turnaroundMinutes)}
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      color: '#6b7280',
                    }}
                  >
                    {formatDuration(item.elapsedSinceInquiryMinutes)}
                  </span>
                </div>
              ))}

              {hasMore && (
                <div
                  style={{
                    padding: '12px 0 0',
                    fontSize: '12px',
                    color: '#6b7280',
                    textAlign: 'center',
                  }}
                >
                  + {sortedItems.length - maxItems} more breaches
                </div>
              )}

              <div
                style={{
                  marginTop: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '13px',
                }}
              >
                <span style={{ color: '#6b7280' }}>Total Breaches</span>
                <span style={{ fontWeight: 600, color: '#ef4444' }}>
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
                <span style={{ fontSize: '14px', color: '#ef4444' }}>{aggregateTotal}</span>
              </div>
            </>
          )}
        </div>
      )}
    </DashboardCard>
  );
}
