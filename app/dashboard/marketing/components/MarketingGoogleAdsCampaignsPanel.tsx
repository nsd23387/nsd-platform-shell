'use client';

import React, { useState } from 'react';
import type { MarketingGoogleAdsCampaign } from '../../../../types/activity-spine';
import { DashboardSection, SkeletonCard } from '../../../../components/dashboard';
import { formatNumber, formatCurrency, formatPercent } from '../lib/format';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';

interface Props {
  campaigns: MarketingGoogleAdsCampaign[];
  loading: boolean;
  error: string | null;
}

type SortField = 'campaign_name' | 'spend' | 'impressions' | 'clicks' | 'conversions' | 'cpc' | 'roas';

const COLUMNS: { key: SortField; label: string; align: 'left' | 'right' }[] = [
  { key: 'campaign_name', label: 'Campaign', align: 'left' },
  { key: 'spend', label: 'Spend', align: 'right' },
  { key: 'impressions', label: 'Impressions', align: 'right' },
  { key: 'clicks', label: 'Clicks', align: 'right' },
  { key: 'conversions', label: 'Conv.', align: 'right' },
  { key: 'cpc', label: 'CPC', align: 'right' },
  { key: 'roas', label: 'ROAS', align: 'right' },
];

export function MarketingGoogleAdsCampaignsPanel({ campaigns, loading, error }: Props) {
  const tc = useThemeColors();
  const [sortField, setSortField] = useState<SortField>('spend');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  if (loading) {
    return (
      <DashboardSection title="Campaign Breakdown" description="Per-campaign Google Ads performance.">
        <SkeletonCard height={200} />
      </DashboardSection>
    );
  }
  if (error) return null;
  if (campaigns.length === 0) return null;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sorted = [...campaigns].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  const thStyle = (align: string): React.CSSProperties => ({
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
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

  const formatCell = (c: MarketingGoogleAdsCampaign, key: SortField): string => {
    switch (key) {
      case 'campaign_name': return c.campaign_name;
      case 'spend': return formatCurrency(c.spend);
      case 'impressions': return formatNumber(c.impressions);
      case 'clicks': return formatNumber(c.clicks);
      case 'conversions': return formatNumber(c.conversions);
      case 'cpc': return formatCurrency(c.cpc);
      case 'roas': return c.roas.toFixed(2) + 'x';
    }
  };

  return (
    <DashboardSection title="Campaign Breakdown" description="Per-campaign Google Ads performance.">
      <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.xl, padding: space['6'], overflow: 'auto' }} data-testid="panel-google-ads-campaigns">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  style={thStyle(col.align)}
                  data-testid={`gads-sort-${col.key}`}
                >
                  {col.label} {sortField === col.key ? (sortDir === 'asc' ? '\u2191' : '\u2193') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => (
              <tr key={c.campaign_id} data-testid={`gads-campaign-row-${c.campaign_id}`}>
                {COLUMNS.map((col) => (
                  <td key={col.key} style={tdStyle(col.align)}>
                    {formatCell(c, col.key)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardSection>
  );
}
