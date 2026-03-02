'use client';

import React from 'react';
import type { MarketingConversionEvent } from '../../../../types/activity-spine';
import { DashboardSection, EmptyStateCard } from '../../../../components/dashboard';
import { SkeletonCard } from '../../../../components/dashboard';
import { formatCurrency } from '../lib/format';
import { text, border, background, violet, chartColors } from '../../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';

interface Props {
  conversions: MarketingConversionEvent[];
  loading: boolean;
  error: string | null;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (isNaN(diff) || diff < 0) return 'recently';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Logo/Image': violet[500],
  'Text Only': chartColors[2],
  'Channel Letters': chartColors[1],
  'Custom': chartColors[3],
};

export function MarketingRecentConversionsPanel({ conversions, loading, error }: Props) {
  if (loading) {
    return (
      <DashboardSection title="Recent Conversions" description="Latest quote submissions from all sources.">
        <SkeletonCard height={200} lines={4} />
      </DashboardSection>
    );
  }
  if (error) return null;

  if (conversions.length === 0) {
    return (
      <DashboardSection title="Recent Conversions" description="Latest quote submissions from all sources.">
        <EmptyStateCard message="No conversion events recorded yet." />
      </DashboardSection>
    );
  }

  return (
    <DashboardSection title="Recent Conversions" description="Latest quote submissions from all sources.">
      <div style={{ backgroundColor: background.surface, border: `1px solid ${border.default}`, borderRadius: radius.xl, padding: space['5'] }} data-testid="card-recent-conversions">
        <div style={{ position: 'relative', paddingLeft: space['6'] }}>
          <div style={{
            position: 'absolute',
            left: 7,
            top: 4,
            bottom: 4,
            width: 2,
            backgroundColor: border.default,
            borderRadius: radius.full,
          }} />

          {conversions.map((c, i) => {
            const catColor = CATEGORY_COLORS[c.product_category] ?? violet[400];
            return (
              <div
                key={`${c.created_at}-${i}`}
                style={{
                  position: 'relative',
                  paddingBottom: i < conversions.length - 1 ? space['5'] : 0,
                  opacity: 0,
                  animation: `fadeIn 0.3s ease-out ${i * 0.08}s forwards`,
                }}
                data-testid={`row-conversion-${i}`}
              >
                <div style={{
                  position: 'absolute',
                  left: `-${space['6']}`,
                  top: 4,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  backgroundColor: background.surface,
                  border: `2px solid ${catColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: catColor }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: space['2'] }}>
                  <div>
                    <span style={{
                      display: 'inline-block',
                      fontFamily: fontFamily.body,
                      fontSize: fontSize.xs,
                      fontWeight: fontWeight.medium,
                      color: catColor,
                      backgroundColor: `${catColor}12`,
                      padding: `${space['0.5']} ${space['2']}`,
                      borderRadius: radius.full,
                      marginBottom: space['1'],
                    }}>
                      {c.product_category}
                    </span>
                    <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.muted }}>
                      {c.submission_source ?? 'Direct'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: text.primary }}>
                      {formatCurrency(c.preliminary_price_usd)}
                    </div>
                    <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, color: text.muted }}>
                      {timeAgo(c.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      </div>
    </DashboardSection>
  );
}
