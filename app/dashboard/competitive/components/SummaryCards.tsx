'use client';

import React from 'react';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';

export interface CompetitiveSummary {
  competitors_tracked: number;
  pages_tracked: number;
  last_crawl_date: string | null;
  this_week_new: number;
  this_week_changed: number;
  competitors_with_changes?: number;
}

interface SummaryCardsProps {
  data: CompetitiveSummary | null;
  loading: boolean;
  error?: string;
}

interface CardSpec {
  testId: string;
  label: string;
  value: number | string;
  sublabel?: string;
}

function formatNumber(n: number | undefined | null): string {
  if (n == null) return '—';
  return n.toLocaleString();
}

export function SummaryCards({ data, loading, error }: SummaryCardsProps) {
  const tc = useThemeColors();

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: space['4'] }} data-testid="summary-cards-loading">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} style={{ height: '112px', backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg }} />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: space['4'], backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }} data-testid="summary-cards-error">
        {error ? `Failed to load summary: ${error}` : 'No summary data available.'}
      </div>
    );
  }

  const cards: CardSpec[] = [
    { testId: 'card-competitors-tracked', label: 'Tracked Competitors', value: formatNumber(data.competitors_tracked) },
    { testId: 'card-pages-tracked', label: 'Pages Indexed', value: formatNumber(data.pages_tracked) },
    { testId: 'card-new-this-week', label: 'New (7 days)', value: formatNumber(data.this_week_new) },
    { testId: 'card-changed-this-week', label: 'Changed (7 days)', value: formatNumber(data.this_week_changed) },
    { testId: 'card-active-competitors', label: 'Active Competitors', value: formatNumber(data.competitors_with_changes), sublabel: 'with changes this week' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: space['4'] }} data-testid="summary-cards">
      {cards.map((card) => (
        <div
          key={card.testId}
          style={{
            padding: space['5'],
            backgroundColor: tc.background.surface,
            border: `1px solid ${tc.border.default}`,
            borderRadius: radius.lg,
            display: 'flex',
            flexDirection: 'column',
            gap: space['2'],
          }}
          data-testid={card.testId}
        >
          <div style={{ fontFamily: fontFamily.display, fontSize: fontSize['2xl'], fontWeight: fontWeight.semibold, color: tc.text.primary, lineHeight: 1 }}>
            {card.value}
          </div>
          <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: tc.text.secondary }}>
            {card.label}
          </div>
          {card.sublabel && (
            <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted }}>
              {card.sublabel}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
