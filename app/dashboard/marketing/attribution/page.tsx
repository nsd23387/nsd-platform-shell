'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied, DashboardCard } from '../../../../components/dashboard';
import { DashboardSection } from '../../../../components/dashboard/DashboardSection';
import { DrilldownBreadcrumb } from '../components/adminto/DrilldownBreadcrumb';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { indigo, violet } from '../../../../design/tokens/colors';

// ── Type shapes from attribution API responses ─────────────────────────────

interface SourceFunnelRow {
  source_group: string;
  submitted_quotes: number;
  paid_quotes: number;
  paid_conversion_rate: number | null;
  paid_revenue_cents: number;
  paid_revenue_usd: number;
  test_quotes: number;
  quotes_with_origin_page: number;
  avg_paid_value_usd: number;
}

interface ChannelRevenueRow {
  date: string;
  source_group: string;
  submitted_quotes: number;
  paid_quotes: number;
  paid_conversion_rate: number | null;
  paid_revenue_cents: number;
  paid_revenue_usd: number;
}

interface GoogleAdsRow {
  report_date: string | null;
  utm_campaign: string | null;
  google_campaign_id: string | null;
  google_campaign_name: string | null;
  ad_clicks: number;
  ad_cost_usd: number;
  submitted_quotes: number;
  paid_quotes: number;
  paid_revenue_usd: number;
  estimated_roas_qms: number | null;
  cost_per_paid_quote_usd: number | null;
  join_confidence: string;
}

interface QualityRow {
  join_confidence: string;
  row_count: number;
  total_submitted_quotes: number;
  total_revenue_usd: number;
  total_spend_usd: number;
  pct_of_quotes: number | null;
  pct_of_spend: number | null;
}

interface SeoPageRow {
  canonical_page_url: string;
  page_title: string | null;
  topic_cluster: string | null;
  search_console_clicks: number;
  submitted_quotes: number;
  paid_quotes: number;
  paid_revenue_usd: number;
}

interface SeoClusterRow {
  topic_cluster: string | null;
  mapped_pages: number;
  search_console_clicks: number;
  submitted_quotes: number;
  paid_quotes: number;
  paid_revenue_usd: number;
  top_revenue_page: string | null;
}

// ── Generic fetch hook ─────────────────────────────────────────────────────

function useAttributionData<T>(path: string, params: Record<string, string> = {}) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const paramKey = JSON.stringify({ path, ...params });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sp = new URLSearchParams(params);
      const res = await fetch(`/api/activity-spine/${path}?${sp}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json.data as T[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [paramKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error };
}

// ── Shared UI atoms ────────────────────────────────────────────────────────

function LoadingState() {
  const tc = useThemeColors();
  return (
    <div
      style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body, fontSize: fontSize.sm }}
      data-testid="loading-state"
    >
      Loading…
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  const tc = useThemeColors();
  return (
    <div
      style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body, fontSize: fontSize.sm, border: `1px dashed ${tc.border.default}`, borderRadius: radius.lg, backgroundColor: tc.background.muted }}
      data-testid="empty-state"
    >
      {message}
    </div>
  );
}

function useTableStyles() {
  const tc = useThemeColors();
  const th = (align: 'left' | 'right' = 'right'): React.CSSProperties => ({
    padding: `${space['2']} ${space['3']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: tc.text.muted,
    textAlign: align,
    borderBottom: `1px solid ${tc.border.default}`,
    whiteSpace: 'nowrap',
    backgroundColor: tc.background.muted,
  });
  const td = (align: 'left' | 'right' = 'right'): React.CSSProperties => ({
    padding: `${space['2']} ${space['3']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: tc.text.primary,
    textAlign: align,
    borderBottom: `1px solid ${tc.border.subtle}`,
    whiteSpace: 'nowrap',
  });
  return { th, td };
}

function fmtUsd(v: number) {
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(v: number | null) {
  if (v === null) return '—';
  return `${v.toFixed(1)}%`;
}

// ── Confidence tier badge ─────────────────────────────────────────────────

const CONFIDENCE_COLORS: Record<string, string> = {
  exact_campaign_adgroup_id: '#16a34a',
  exact_campaign_id: indigo[600],
  name_match: violet[500],
  source_group_only: '#9ca3af',
  unavailable: '#f59e0b',
  ads_only: '#ef4444',
};

function ConfidenceBadge({ tier }: { tier: string }) {
  const color = CONFIDENCE_COLORS[tier] ?? '#9ca3af';
  return (
    <span
      style={{
        display: 'inline-block',
        padding: `${space['0.5']} ${space['2']}`,
        backgroundColor: `${color}20`,
        color,
        border: `1px solid ${color}40`,
        borderRadius: radius.sm,
        fontSize: fontSize.xs,
        fontFamily: fontFamily.body,
        whiteSpace: 'nowrap',
      }}
    >
      {tier.replace(/_/g, ' ')}
    </span>
  );
}

// ── Section 1: Source-to-Paid Funnel ─────────────────────────────────────

function SourceFunnelSection() {
  const { data, loading, error } = useAttributionData<SourceFunnelRow>('marketing/attribution', { view: 'source-funnel' });
  const { th, td } = useTableStyles();

  if (loading) return <LoadingState />;
  if (error) return <DashboardCard title="Error" error={error} />;
  if (!data?.length) return <EmptyState message="No source funnel data available." />;

  const totalRevenue = data.reduce((s, r) => s + r.paid_revenue_usd, 0);

  return (
    <div style={{ overflowX: 'auto' }} data-testid="table-source-funnel">
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th('left')}>Source Group</th>
            <th style={th()}>Submitted</th>
            <th style={th()}>Paid</th>
            <th style={th()}>Conv %</th>
            <th style={th()}>Revenue</th>
            <th style={th()}>% of Total</th>
            <th style={th()}>Avg Order</th>
          </tr>
        </thead>
        <tbody>
          {data.map(r => (
            <tr key={r.source_group ?? 'unknown'}>
              <td style={td('left')}>{r.source_group ?? '(unknown)'}</td>
              <td style={td()}>{r.submitted_quotes.toLocaleString()}</td>
              <td style={td()}>{r.paid_quotes.toLocaleString()}</td>
              <td style={td()}>{fmtPct(r.paid_conversion_rate)}</td>
              <td style={td()}>{fmtUsd(r.paid_revenue_usd)}</td>
              <td style={td()}>{totalRevenue > 0 ? fmtPct((r.paid_revenue_usd / totalRevenue) * 100) : '—'}</td>
              <td style={td()}>{r.paid_quotes > 0 ? fmtUsd(r.avg_paid_value_usd) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Section 2: Channel Revenue Daily ────────────────────────────────────

function ChannelRevenueSection() {
  const { data, loading, error } = useAttributionData<ChannelRevenueRow>('marketing/attribution', { view: 'channel-revenue', limit: '500' });
  const { th, td } = useTableStyles();

  if (loading) return <LoadingState />;
  if (error) return <DashboardCard title="Error" error={error} />;
  if (!data?.length) return <EmptyState message="No channel revenue data available for the last 30 days." />;

  return (
    <div style={{ overflowX: 'auto' }} data-testid="table-channel-revenue">
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th('left')}>Date</th>
            <th style={th('left')}>Source Group</th>
            <th style={th()}>Submitted</th>
            <th style={th()}>Paid</th>
            <th style={th()}>Conv %</th>
            <th style={th()}>Revenue</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={`${r.date}-${r.source_group}-${i}`}>
              <td style={td('left')}>{r.date}</td>
              <td style={td('left')}>{r.source_group ?? '(unknown)'}</td>
              <td style={td()}>{r.submitted_quotes.toLocaleString()}</td>
              <td style={td()}>{r.paid_quotes.toLocaleString()}</td>
              <td style={td()}>{fmtPct(r.paid_conversion_rate)}</td>
              <td style={td()}>{fmtUsd(r.paid_revenue_usd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Section 3: Google Ads Performance ────────────────────────────────────

function GoogleAdsPerformanceSection() {
  const [confidenceFilter, setConfidenceFilter] = useState('');
  const params: Record<string, string> = { view: 'google-ads-performance', limit: '200' };
  if (confidenceFilter) params.join_confidence = confidenceFilter;

  const { data, loading, error } = useAttributionData<GoogleAdsRow>('marketing/attribution', params);
  const { th, td } = useTableStyles();
  const tc = useThemeColors();

  const TIERS = ['exact_campaign_adgroup_id', 'exact_campaign_id', 'name_match', 'source_group_only', 'unavailable', 'ads_only'];

  if (loading) return <LoadingState />;
  if (error) return <DashboardCard title="Error" error={error} />;
  if (!data?.length) return <EmptyState message="No Google Ads performance data for the last 30 days." />;

  return (
    <div>
      <div style={{ marginBottom: space['4'], display: 'flex', alignItems: 'center', gap: space['3'], flexWrap: 'wrap' }}>
        <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>Filter by confidence:</span>
        <select
          value={confidenceFilter}
          onChange={e => setConfidenceFilter(e.target.value)}
          style={{ padding: `${space['1.5']} ${space['3']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, backgroundColor: tc.background.surface, color: tc.text.primary, border: `1px solid ${tc.border.default}`, borderRadius: radius.md, cursor: 'pointer' }}
          data-testid="select-confidence-filter"
        >
          <option value="">All tiers</option>
          {TIERS.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
      </div>
      <div style={{ overflowX: 'auto' }} data-testid="table-google-ads-performance">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th('left')}>Date</th>
              <th style={th('left')}>Campaign</th>
              <th style={th()}>Clicks</th>
              <th style={th()}>Ad Cost</th>
              <th style={th()}>Submitted</th>
              <th style={th()}>Paid</th>
              <th style={th()}>Revenue</th>
              <th style={th()}>ROAS</th>
              <th style={th()}>Cost/Paid</th>
              <th style={th('left')}>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={`${r.report_date}-${r.utm_campaign}-${i}`}>
                <td style={td('left')}>{r.report_date ?? '—'}</td>
                <td style={td('left')} title={r.google_campaign_id ?? undefined}>
                  {r.google_campaign_name ?? r.utm_campaign ?? '(no campaign)'}
                </td>
                <td style={td()}>{r.ad_clicks.toLocaleString()}</td>
                <td style={td()}>{fmtUsd(r.ad_cost_usd)}</td>
                <td style={td()}>{r.submitted_quotes.toLocaleString()}</td>
                <td style={td()}>{r.paid_quotes.toLocaleString()}</td>
                <td style={td()}>{fmtUsd(r.paid_revenue_usd)}</td>
                <td style={td()}>{r.estimated_roas_qms !== null ? `${r.estimated_roas_qms.toFixed(2)}x` : '—'}</td>
                <td style={td()}>{r.cost_per_paid_quote_usd !== null ? fmtUsd(r.cost_per_paid_quote_usd) : '—'}</td>
                <td style={td('left')}><ConfidenceBadge tier={r.join_confidence} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Section 4: Google Ads Attribution Quality ─────────────────────────────

function GoogleAdsQualitySection() {
  const { data, loading, error } = useAttributionData<QualityRow>('marketing/attribution', { view: 'google-ads-quality' });
  const { th, td } = useTableStyles();

  if (loading) return <LoadingState />;
  if (error) return <DashboardCard title="Error" error={error} />;
  if (!data?.length) return <EmptyState message="No attribution quality data available." />;

  const totalQuotes = data.reduce((s, r) => s + r.total_submitted_quotes, 0);
  const exactQuotes = data.filter(r => r.join_confidence === 'exact_campaign_id' || r.join_confidence === 'exact_campaign_adgroup_id').reduce((s, r) => s + r.total_submitted_quotes, 0);
  const exactPct = totalQuotes > 0 ? ((exactQuotes / totalQuotes) * 100).toFixed(1) : '0.0';
  const tc = useThemeColors();

  return (
    <div>
      <div
        style={{
          marginBottom: space['4'],
          padding: space['4'],
          backgroundColor: tc.background.muted,
          borderRadius: radius.lg,
          fontFamily: fontFamily.body,
          fontSize: fontSize.sm,
          color: tc.text.muted,
          border: `1px solid ${tc.border.subtle}`,
        }}
        data-testid="quality-summary"
      >
        <strong style={{ color: tc.text.primary }}>{exactPct}%</strong> of google_ads quotes attributed at ID-level precision (exact_campaign_id or exact_campaign_adgroup_id).
        Target after UTM template rollout: ≥ 90%.
      </div>
      <div style={{ overflowX: 'auto' }} data-testid="table-attribution-quality">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th('left')}>Confidence Tier</th>
              <th style={th()}>Rows</th>
              <th style={th()}>Submitted Quotes</th>
              <th style={th()}>Paid Revenue</th>
              <th style={th()}>Ad Spend</th>
              <th style={th()}>% of Quotes</th>
              <th style={th()}>% of Spend</th>
            </tr>
          </thead>
          <tbody>
            {data.map(r => (
              <tr key={r.join_confidence}>
                <td style={td('left')}><ConfidenceBadge tier={r.join_confidence} /></td>
                <td style={td()}>{r.row_count.toLocaleString()}</td>
                <td style={td()}>{r.total_submitted_quotes.toLocaleString()}</td>
                <td style={td()}>{fmtUsd(r.total_revenue_usd)}</td>
                <td style={td()}>{fmtUsd(r.total_spend_usd)}</td>
                <td style={td()}>{fmtPct(r.pct_of_quotes)}</td>
                <td style={td()}>{fmtPct(r.pct_of_spend)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Section 5: SEO Page Performance ──────────────────────────────────────

function SeoPagePerformanceSection() {
  const { data, loading, error } = useAttributionData<SeoPageRow>('seo/attribution', { view: 'page-performance', limit: '200' });
  const { th, td } = useTableStyles();

  if (loading) return <LoadingState />;
  if (error) return <DashboardCard title="Error" error={error} />;
  if (!data?.length) return <EmptyState message="No SEO page performance data available." />;

  return (
    <div style={{ overflowX: 'auto' }} data-testid="table-seo-page-performance">
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th('left')}>Page</th>
            <th style={th('left')}>Cluster</th>
            <th style={th()}>GSC Clicks</th>
            <th style={th()}>Submitted</th>
            <th style={th()}>Paid</th>
            <th style={th()}>Revenue</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={`${r.canonical_page_url}-${i}`}>
              <td style={{ ...td('left'), maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <a href={r.canonical_page_url} target="_blank" rel="noopener noreferrer" style={{ color: indigo[600], textDecoration: 'none', fontFamily: fontFamily.body, fontSize: fontSize.sm }}>
                  {r.page_title || r.canonical_page_url}
                </a>
              </td>
              <td style={td('left')}>{r.topic_cluster ?? '—'}</td>
              <td style={td()}>{r.search_console_clicks.toLocaleString()}</td>
              <td style={td()}>{r.submitted_quotes.toLocaleString()}</td>
              <td style={td()}>{r.paid_quotes.toLocaleString()}</td>
              <td style={td()}>{fmtUsd(r.paid_revenue_usd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Section 6: SEO Cluster Performance ───────────────────────────────────

function SeoClusterPerformanceSection() {
  const { data, loading, error } = useAttributionData<SeoClusterRow>('seo/attribution', { view: 'cluster-performance' });
  const { th, td } = useTableStyles();

  if (loading) return <LoadingState />;
  if (error) return <DashboardCard title="Error" error={error} />;
  if (!data?.length) return <EmptyState message="No SEO cluster performance data available." />;

  return (
    <div style={{ overflowX: 'auto' }} data-testid="table-seo-cluster-performance">
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th('left')}>Topic Cluster</th>
            <th style={th()}>Pages</th>
            <th style={th()}>GSC Clicks</th>
            <th style={th()}>Submitted</th>
            <th style={th()}>Paid</th>
            <th style={th()}>Revenue</th>
            <th style={th('left')}>Top Revenue Page</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={`${r.topic_cluster}-${i}`}>
              <td style={td('left')}>{r.topic_cluster ?? '(unclustered)'}</td>
              <td style={td()}>{r.mapped_pages.toLocaleString()}</td>
              <td style={td()}>{r.search_console_clicks.toLocaleString()}</td>
              <td style={td()}>{r.submitted_quotes.toLocaleString()}</td>
              <td style={td()}>{r.paid_quotes.toLocaleString()}</td>
              <td style={td()}>{fmtUsd(r.paid_revenue_usd)}</td>
              <td style={{ ...td('left'), maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {r.top_revenue_page ? (
                  <a href={r.top_revenue_page} target="_blank" rel="noopener noreferrer" style={{ color: indigo[600], textDecoration: 'none', fontFamily: fontFamily.body, fontSize: fontSize.sm }}>
                    {r.top_revenue_page}
                  </a>
                ) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function AttributionDashboardPage() {
  const tc = useThemeColors();

  return (
    <DashboardGuard dashboard="marketing" fallback={<AccessDenied />}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: `${space['6']} ${space['4']}` }}>
        <DrilldownBreadcrumb
          items={[
            { label: 'Marketing', href: '/dashboard/marketing' },
            { label: 'Attribution' },
          ]}
        />

        <div style={{ marginBottom: space['6'] }}>
          <h1
            style={{ fontFamily: fontFamily.display, fontSize: fontSize['3xl'], fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['1'], lineHeight: lineHeight.snug }}
            data-testid="text-page-title"
          >
            Attribution Intelligence
          </h1>
          <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, color: tc.text.muted }}>
            Source-to-paid funnel, channel revenue, Google Ads join precision, and SEO page outcomes — all from the Supabase attribution views.
          </p>
        </div>

        <DashboardSection
          title="Source-to-Paid Funnel"
          description="All-time quote and revenue breakdown by acquisition source. No date filter — aggregates all history."
          index={0}
        >
          <SourceFunnelSection />
        </DashboardSection>

        <DashboardSection
          title="Channel Revenue (Last 30 Days)"
          description="Daily paid revenue by source group for the last 30 days. Backed by metrics.channel_revenue_daily."
          index={1}
        >
          <ChannelRevenueSection />
        </DashboardSection>

        <DashboardSection
          title="Google Ads × QMS Performance (Last 30 Days)"
          description="Campaign-level ad spend joined to QMS quote outcomes. Use the confidence filter to isolate high-precision rows."
          index={2}
        >
          <GoogleAdsPerformanceSection />
        </DashboardSection>

        <DashboardSection
          title="Google Ads Attribution Quality"
          description="Attribution precision breakdown by join_confidence tier. Target: ≥ 90% at exact_campaign_id after UTM template rollout."
          index={3}
        >
          <GoogleAdsQualitySection />
        </DashboardSection>

        <DashboardSection
          title="SEO Page Performance"
          description="Search Console clicks + QMS quote outcomes by canonical page URL. Ordered by revenue descending."
          index={4}
        >
          <SeoPagePerformanceSection />
        </DashboardSection>

        <DashboardSection
          title="SEO Cluster Performance"
          description="Topic cluster rollup: aggregated GSC and QMS metrics per cluster with top revenue page link."
          index={5}
        >
          <SeoClusterPerformanceSection />
        </DashboardSection>
      </div>
    </DashboardGuard>
  );
}
