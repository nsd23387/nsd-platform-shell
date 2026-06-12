'use client';

import React from 'react';
import Link from 'next/link';
import { NO_LANDING_PAGE_SENTINEL } from '../../../../types/activity-spine';
import type { MarketingPage } from '../../../../types/activity-spine';
import { DashboardSection, EmptyStateCard } from '../../../../components/dashboard';
import { DataTable } from '../../../sales-engine/components/ui/DataTable';
import { formatNumber, formatCurrency, formatPercent, safeNumber, safeDivideUI } from '../lib/format';
import { useThemeColors } from '../../../../hooks/useThemeColors';
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

function isSentinelPath(url: string): boolean {
  return url === NO_LANDING_PAGE_SENTINEL;
}

function shortenUrl(url: string): string {
  if (isSentinelPath(url)) return url;
  try {
    return new URL(url, 'https://p').pathname;
  } catch {
    return url;
  }
}

const COLUMNS = [
  {
    key: 'page_url',
    header: 'Page',
    width: '28%',
    render: (r: RevenueRow) => isSentinelPath(r.page_url) ? (
      <span
        title="Quote submissions whose session did not record an entry page (e.g. direct visits to the quote form). They cannot be credited to a landing page."
        style={{ fontStyle: 'italic', cursor: 'help' }}
      >
        {r.page_url}
      </span>
    ) : (
      <Link href={`/dashboard/seo?url=${encodeURIComponent(r.page_url)}`} style={{ color: 'inherit', fontWeight: 500, textDecoration: 'none' }}>
        {shortenUrl(r.page_url)}
      </Link>
    ),
  },
  { key: 'clicks', header: 'Organic Clicks', width: '13%', align: 'right' as const, render: (r: RevenueRow) => formatNumber(r.clicks) },
  { key: 'submissions', header: 'Submissions', width: '13%', align: 'right' as const, render: (r: RevenueRow) => formatNumber(r.submissions) },
  { key: 'pipeline_value_usd', header: 'Pipeline ($)', width: '14%', align: 'right' as const, render: (r: RevenueRow) => formatCurrency(r.pipeline_value_usd) },
  // D-18: compute ratios whenever the denominator exists; "\u2014" only when truly
  // undefined (0 clicks). Low-volume rows (< VOLATILITY_THRESHOLD clicks) are
  // flagged with "~" instead of being blanked out.
  { key: 'revenue_per_click', header: 'Rev/Click', width: '14%', align: 'right' as const, render: (r: RevenueRow) => r.clicks > 0 ? `${r.stable ? '' : '~'}${formatCurrency(r.revenue_per_click)}` : '\u2014' },
  { key: 'submission_rate', header: 'Sub. Rate', width: '14%', align: 'right' as const, render: (r: RevenueRow) => r.clicks > 0 ? `${r.stable ? '' : '~'}${formatPercent(r.submission_rate)}` : '\u2014' },
];

export function MarketingSeoRevenuePanel({ pages, loading, error }: Props) {
  const tc = useThemeColors();

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
    .sort((a, b) => b.pipeline_value_usd - a.pipeline_value_usd);

  // Top-page callout: only real landing pages qualify, not the sentinel bucket.
  const topPage = rows.find((r) => !isSentinelPath(r.page_url) && r.pipeline_value_usd > 0) ?? null;

  return (
    <DashboardSection
      title="SEO Revenue Intelligence"
      description="Entry-page attribution, aggregated by canonical path for the selected period."
    >
      <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, marginBottom: space['4'] }}>
        Submissions are credited to the page the visitor first landed on (entry-page attribution),
        windowed to the selected period. Traffic on a landing page may include non-organic sources.
        Quote submissions with no recorded entry page are grouped under &ldquo;{NO_LANDING_PAGE_SENTINEL}&rdquo;
        rather than attributed to a page. &ldquo;~&rdquo; marks ratios computed on fewer than {VOLATILITY_THRESHOLD} clicks.
      </p>

      {topPage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: space['4'],
            backgroundColor: tc.semantic.success.light,
            border: `1px solid ${tc.semantic.success.base}`,
            borderRadius: radius.xl,
            padding: `${space['4']} ${space['5']}`,
            marginBottom: space['4'],
          }}
        >
          <div style={{ width: space['3'], height: space['3'], borderRadius: radius.full, backgroundColor: tc.semantic.success.base, flexShrink: 0 }} />
          <div>
            <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.semantic.success.dark }}>
              Top Organic Revenue Page
            </div>
            <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, fontWeight: fontWeight.medium, color: tc.text.primary }}>
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
          pageSize={10}
          defaultSortKey="pipeline_value_usd"
          defaultSortDir="desc"
        />
      )}
    </DashboardSection>
  );
}
