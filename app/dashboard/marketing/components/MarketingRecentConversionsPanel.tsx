'use client';

import React from 'react';
import type { MarketingConversionEvent } from '../../../../types/activity-spine';
import { DashboardSection, EmptyStateCard } from '../../../../components/dashboard';
import { formatCurrency } from '../lib/format';
import { text, border, background, semantic } from '../../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';

interface Props {
  conversions: MarketingConversionEvent[];
  loading: boolean;
  error: string | null;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function MarketingRecentConversionsPanel({ conversions, loading, error }: Props) {
  if (loading || error) return null;

  if (conversions.length === 0) {
    return (
      <DashboardSection title="Recent Conversions" description="Latest quote submissions from all sources.">
        <EmptyStateCard message="No conversion events recorded yet." />
      </DashboardSection>
    );
  }

  return (
    <DashboardSection title="Recent Conversions" description="Latest quote submissions from all sources.">
      <div style={{ backgroundColor: background.surface, border: `1px solid ${border.default}`, borderRadius: radius.xl, overflow: 'hidden' }} data-testid="card-recent-conversions">
        {conversions.map((c, i) => (
          <div
            key={`${c.created_at}-${i}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: `${space['3']} ${space['5']}`,
              borderBottom: i < conversions.length - 1 ? `1px solid ${border.subtle}` : 'none',
            }}
            data-testid={`row-conversion-${i}`}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: space['3'] }}>
              <div style={{
                width: '8px', height: '8px', borderRadius: radius.full,
                backgroundColor: semantic.info.base, flexShrink: 0,
              }} />
              <div>
                <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: text.primary }}>
                  {c.product_category}
                </div>
                <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, color: text.muted }}>
                  {c.submission_source}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: text.primary }}>
                {formatCurrency(c.preliminary_price_usd)}
              </div>
              <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, color: text.muted }}>
                {timeAgo(c.created_at)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </DashboardSection>
  );
}
