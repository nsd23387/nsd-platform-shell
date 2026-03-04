'use client';

import React, { useState } from 'react';
import type { MarketingChannelPerformance } from '../../../../types/activity-spine';
import { DashboardSection, EmptyStateCard, SkeletonCard } from '../../../../components/dashboard';
import { formatNumber, formatCurrency } from '../lib/format';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';

interface Props {
  channels: MarketingChannelPerformance[];
  loading: boolean;
  error: string | null;
}

type SortField = 'channel' | 'sessions' | 'page_views' | 'conversions' | 'revenue';

const COLUMNS: { key: SortField; label: string; align: 'left' | 'right' }[] = [
  { key: 'channel', label: 'Channel', align: 'left' },
  { key: 'sessions', label: 'Sessions', align: 'right' },
  { key: 'page_views', label: 'Page Views', align: 'right' },
  { key: 'conversions', label: 'Conversions', align: 'right' },
  { key: 'revenue', label: 'Revenue', align: 'right' },
];

export function MarketingChannelPerformancePanel({ channels, loading, error }: Props) {
  const tc = useThemeColors();
  const [sortField, setSortField] = useState<SortField>('sessions');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  if (loading) {
    return (
      <DashboardSection title="Channel Performance" description="Sessions and conversions by acquisition channel (GA4).">
        <SkeletonCard height={200} />
      </DashboardSection>
    );
  }
  if (error) return null;
  if (channels.length === 0) {
    return (
      <DashboardSection title="Channel Performance" description="Sessions and conversions by acquisition channel (GA4).">
        <EmptyStateCard message="No channel data available. Trigger a GA4 sync to populate." />
      </DashboardSection>
    );
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sorted = [...channels].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  const totalSessions = channels.reduce((s, c) => s + c.sessions, 0);

  const thStyle = (align: string): React.CSSProperties => ({
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: tc.text.muted,
    textAlign: align as 'left' | 'right',
    padding: `${space['2']} ${space['3']}`,
    borderBottom: `1px solid ${tc.border.default}`,
    cursor: 'pointer',
    userSelect: 'none' as const,
    whiteSpace: 'nowrap' as const,
  });

  const tdStyle = (align: string): React.CSSProperties => ({
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: tc.text.primary,
    textAlign: align as 'left' | 'right',
    padding: `${space['2.5']} ${space['3']}`,
    borderBottom: `1px solid ${tc.border.default}`,
  });

  const formatCell = (ch: MarketingChannelPerformance, key: SortField): string => {
    switch (key) {
      case 'channel': return ch.channel;
      case 'sessions': return formatNumber(ch.sessions);
      case 'page_views': return formatNumber(ch.page_views);
      case 'conversions': return formatNumber(ch.conversions);
      case 'revenue': return formatCurrency(ch.revenue);
    }
  };

  return (
    <DashboardSection title="Channel Performance" description="Sessions and conversions by acquisition channel (GA4).">
      <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.xl, padding: space['6'], overflow: 'auto' }} data-testid="panel-channel-performance">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  style={thStyle(col.align)}
                  data-testid={`sort-${col.key}`}
                >
                  {col.label} {sortField === col.key ? (sortDir === 'asc' ? '\u2191' : '\u2193') : ''}
                </th>
              ))}
              <th style={{ ...thStyle('right'), cursor: 'default' }}>Share</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((ch) => {
              const share = totalSessions > 0 ? (ch.sessions / totalSessions * 100) : 0;
              return (
                <tr key={ch.channel} data-testid={`channel-row-${ch.channel.toLowerCase().replace(/\s+/g, '-')}`}>
                  {COLUMNS.map((col) => (
                    <td key={col.key} style={tdStyle(col.align)}>
                      {formatCell(ch, col.key)}
                    </td>
                  ))}
                  <td style={tdStyle('right')}>
                    {share.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </DashboardSection>
  );
}
