'use client';

import React from 'react';
import type { MarketingPage } from '../../../../types/activity-spine';
import { DashboardSection, EmptyStateCard } from '../../../../components/dashboard';
import { DataTable } from '../../../sales-engine/components/ui/DataTable';
import { formatNumber, formatCurrency, formatPercent, safeNumber, safeDivideUI } from '../lib/format';
import { text, semantic } from '../../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';

interface Props {
  pages: MarketingPage[];
  loading: boolean;
  error: string | null;
}

interface RevenueRow {
  page_url: string;
  clicks: number;
  submissions: number;
  pipeline_value_usd: number;
  revenue_per_click: number;
  submission_rate: number;
  stable: boolean;
}

const VOLATILITY_THRESHOLD = 5;

function shortenUrl(url: string): string {
  try {
    return new URL(url, 'https://p').pathname;
  } catch {
    return url;
  }
}

const COLUMNS = [
  { key: 'page_url', header: 'Page', width: '28%', render: (r: RevenueRow) => shortenUrl(r.page_url) },
  { key: 'clicks', header: 'Organic Clicks', width: '13%', align: 'right' as const, render: (r: RevenueRow) => formatNumber(r.clicks) },
  { key: 'submissions', header: 'Submissions', width: '13%', align: 'right' as const, render: (r: RevenueRow) => formatNumber(r.submissions) },
  { key: 'pipeline_value_usd', header: 'Pipeline ($)', width: '14%', align: 'right' as const, render: (r: RevenueRow) => formatCurrency(r.pipeline_value_usd) },
  { key: 'revenue_per_click', header: 'Rev/Click', width: '14%', align: 'right' as const, render: (r: RevenueRow) => r.stable ? formatCurrency(r.revenue_per_click) : '\u2014' },
  { key: 'submission_rate', header: 'Sub. Rate', width: '14%', align: 'right' as const, render: (r: RevenueRow) => r.stable ? formatPercent(r.submission_rate) : '\u2014' },
];

export function MarketingSeoRevenuePanel({ pages, loading, error }: Props) {
  if (loading || error) return null;

  const rows: RevenueRow[] = pages
    .filter((p) => safeNumber(p.clicks) > 0 || safeNumber(p.pipeline_value_usd) > 0)
    .map((p) => {
      const clicks = safeNumber(p.clicks);
      const submissions = safeNumber(p.submissions);
      const pipeline = safeNumber(p.pipeline_value_usd);
      return {
        page_url: p.page_url,
        clicks,
        submissions,
        pipeline_value_usd: pipeline,
        revenue_per_click: safeDivideUI(pipeline, clicks),
        submission_rate: safeDivideUI(submissions, clicks),
        stable: clicks >= VOLATILITY_THRESHOLD,
      };
    })
    .sort((a, b) => b.pipeline_value_usd - a.pipeline_value_usd)
    .slice(0, 10);

  const topPage = rows.length > 0 && rows[0].pipeline_value_usd > 0 ? rows[0] : null;

  return (
    <DashboardSection
      title="SEO Revenue Intelligence"
      description="Organic attribution based on page-level aggregation for selected period."
    >
      {/* Attribution caveat */}
      <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.muted, marginBottom: space['4'] }}>
        Revenue attribution reflects page-level pipeline for the selected period and may include mixed traffic sources.
      </p>

      {topPage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: space['4'],
            backgroundColor: semantic.success.light,
            border: `1px solid ${semantic.success.base}`,
            borderRadius: radius.xl,
            padding: `${space['4']} ${space['5']}`,
            marginBottom: space['4'],
          }}
        >
          <div style={{ width: space['3'], height: space['3'], borderRadius: radius.full, backgroundColor: semantic.success.base, flexShrink: 0 }} />
          <div>
            <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: semantic.success.dark }}>
              Top Organic Revenue Page
            </div>
            <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, fontWeight: fontWeight.medium, color: text.primary }}>
              {shortenUrl(topPage.page_url)} — {formatCurrency(topPage.pipeline_value_usd)}
            </div>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyStateCard message="No organic revenue data available for this period." />
      ) : (
        <DataTable<RevenueRow>
          columns={COLUMNS}
          data={rows}
          keyExtractor={(r) => r.page_url}
          emptyMessage="No organic revenue data."
        />
      )}
    </DashboardSection>
  );
}
