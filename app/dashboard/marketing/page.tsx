'use client';

import React, { useContext, useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardGuard } from '../../../hooks/useRBAC';
import { DashboardCard, AccessDenied, MarketingPerformanceScore } from '../../../components/dashboard';
import { PageExportBar } from '../../../components/dashboard/PageExportBar';
import type { ExportSection } from '../../../lib/exportUtils';
import { MarketingKPIOverview } from './components/MarketingKPIOverview';
import { MarketingExecutiveKPIs } from './components/MarketingExecutiveKPIs';
import { MarketingChannelBreakdownPanel } from './components/MarketingChannelBreakdownPanel';
import { MarketingTimeseriesPanel } from './components/MarketingTimeseriesPanel';
import { MarketingFunnelPanel } from './components/MarketingFunnelPanel';
import { MarketingGA4FunnelPanel } from './components/MarketingGA4FunnelPanel';
import { MarketingAnomaliesPanel } from './components/MarketingAnomaliesPanel';
import { EngineCard } from './components/adminto/EngineCard';
import { Sparkline } from '../../../components/dashboard/charts/Sparkline';
import { ENGINE_COLORS } from './lib/engineColors';
import { space, radius } from '../../../design/tokens/spacing';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../design/tokens/typography';
import { indigo, violet, magenta } from '../../../design/tokens/colors';
import { MarketingContext } from './lib/MarketingContext';

const EMPTY_GA4_FUNNEL = { view_item: 0, add_to_cart: 0, begin_checkout: 0, purchase: 0, form_start: 0, form_submit: 0 };

function formatCurrency(v: number): string {
  return v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`;
}

function formatNumber(v: number): string {
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0);
}

function generateNarrative(
  kpis: any,
  comparisons: any,
  channelPerformance: any[],
  comparisonMode: string
): string | null {
  if (!kpis || !comparisons) return null;

  const periodLabel =
    comparisonMode === 'wow' ? 'last week' :
    comparisonMode === 'mom' ? 'last month' : 'previous period';

  const pipelineDelta = comparisons.pipeline_value_usd_delta ?? 0;
  const sessionsDelta = comparisons.sessions_delta ?? 0;
  const direction = pipelineDelta >= 0 ? 'up' : 'down';

  let topChannel = '';
  if (channelPerformance?.length > 0) {
    const sorted = [...channelPerformance].sort((a, b) => (b.sessions ?? 0) - (a.sessions ?? 0));
    topChannel = sorted[0]?.channel ?? '';
  }

  const parts: string[] = [];
  parts.push(`Pipeline is ${direction} ${Math.abs(pipelineDelta).toFixed(1)}% vs. ${periodLabel}.`);
  if (sessionsDelta !== 0) {
    parts.push(`Sessions ${sessionsDelta >= 0 ? 'grew' : 'declined'} ${Math.abs(sessionsDelta).toFixed(1)}%${topChannel ? `, led by ${topChannel}` : ''}.`);
  }

  return parts.join(' ');
}

function ColdOutreachEngineCard() {
  const [outreach, setOutreach] = useState<{ emailsSent: number; replyRate: number; leadsPushed: number } | null>(null);
  useEffect(() => {
    fetch('/api/proxy/cold-outreach-summary?window=30d')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) setOutreach({ emailsSent: d.emailsSent ?? 0, replyRate: d.replyRate ?? 0, leadsPushed: d.leadsPushed ?? 0 });
      })
      .catch(() => {});
  }, []);

  return (
    <EngineCard
      title={ENGINE_COLORS.cold_outreach.label}
      accentColor={ENGINE_COLORS.cold_outreach.accent}
      metrics={[
        { label: 'Emails Sent', value: formatNumber(outreach?.emailsSent ?? 0) },
        { label: 'Reply Rate', value: `${((outreach?.replyRate ?? 0) * 100).toFixed(1)}%` },
        { label: 'Leads Pushed', value: formatNumber(outreach?.leadsPushed ?? 0) },
      ]}
    />
  );
}

export default function MarketingExecutiveOverview() {
  const tc = useThemeColors();
  const { periodState, comparisonMode, data, loading, error, refetch } = useContext(MarketingContext);

  const narrative = useMemo(() => {
    if (!data) return null;
    return generateNarrative(data.kpis, data.comparisons, data.channel_performance ?? [], comparisonMode);
  }, [data, comparisonMode]);

  const core4 = data?.core4_summary;

  const daysInPeriod = useMemo(() => {
    const ts = data?.timeseries?.sessions;
    return ts?.length ?? 30;
  }, [data]);

  const exportSections = useMemo<ExportSection[]>(() => {
    if (!data) return [];
    const sections: ExportSection[] = [];

    if (data.kpis) {
      const k = data.kpis;
      const comp = data.comparisons;
      sections.push({
        type: 'kpis',
        title: 'Executive KPIs',
        items: [
          { label: 'Sessions', value: k.sessions ?? 0 },
          { label: 'Sessions Delta %', value: comp?.sessions?.delta_pct != null ? `${comp.sessions.delta_pct.toFixed(1)}%` : '—' },
          { label: 'Organic Clicks', value: k.organic_clicks ?? 0 },
          { label: 'Total Submissions', value: k.total_submissions ?? 0 },
          { label: 'Pipeline Value (USD)', value: k.total_pipeline_value_usd != null ? `$${Number(k.total_pipeline_value_usd).toLocaleString()}` : '—' },
          { label: 'Pipeline Delta %', value: comp?.total_pipeline_value_usd?.delta_pct != null ? `${comp.total_pipeline_value_usd.delta_pct.toFixed(1)}%` : '—' },
          { label: 'Impressions', value: k.impressions ?? 0 },
          { label: 'Avg Position', value: k.avg_position != null ? k.avg_position.toFixed(1) : '—' },
          { label: 'Revenue per Session', value: k.revenue_per_session != null ? `$${k.revenue_per_session.toFixed(2)}` : '—' },
        ],
      });
    }

    if (core4) {
      const engines = ['warm_outreach', 'cold_outreach', 'post_free_content', 'run_paid_ads'] as const;
      const engineLabels: Record<string, string> = {
        warm_outreach: 'Warm Outreach',
        cold_outreach: 'Cold Outreach',
        post_free_content: 'Post Free Content',
        run_paid_ads: 'Run Paid Ads',
      };
      sections.push({
        type: 'table',
        title: 'Core 4 Growth Engines',
        columns: [
          { key: 'engine', label: 'Engine' },
          { key: 'sessions', label: 'Sessions', format: 'number' },
          { key: 'quotes', label: 'Quotes', format: 'number' },
          { key: 'pipeline', label: 'Pipeline (USD)', format: 'currency' },
          { key: 'spend', label: 'Spend (USD)', format: 'currency' },
          { key: 'roas', label: 'ROAS' },
          { key: 'sessions_delta', label: 'Sessions Delta %', format: 'percent' },
        ],
        rows: engines.map(e => {
          const cur = (core4 as any)[e]?.current ?? {};
          const deltas = (core4 as any)[e]?.deltas ?? {};
          return {
            engine: engineLabels[e],
            sessions: cur.sessions ?? 0,
            quotes: cur.quotes ?? 0,
            pipeline: cur.pipeline_value_usd ?? 0,
            spend: cur.spend ?? 0,
            roas: cur.roas != null ? `${cur.roas.toFixed(1)}x` : '—',
            sessions_delta: deltas.sessions_pct ?? 0,
          };
        }),
      });
    }

    if (data.channel_performance?.length) {
      sections.push({
        type: 'table',
        title: 'Channel Breakdown',
        columns: [
          { key: 'channel', label: 'Channel' },
          { key: 'sessions', label: 'Sessions', format: 'number' },
          { key: 'clicks', label: 'Clicks', format: 'number' },
          { key: 'quotes', label: 'Quotes', format: 'number' },
          { key: 'pipeline_value_usd', label: 'Pipeline (USD)', format: 'currency' },
        ],
        rows: data.channel_performance.map((ch: any) => ({
          channel: ch.channel ?? '',
          sessions: ch.sessions ?? 0,
          clicks: ch.clicks ?? 0,
          quotes: ch.quotes ?? 0,
          pipeline_value_usd: ch.pipeline_value_usd ?? 0,
        })),
      });
    }

    if (data.funnel?.length) {
      sections.push({
        type: 'table',
        title: 'Marketing Funnel',
        columns: [
          { key: 'stage', label: 'Stage' },
          { key: 'count', label: 'Count', format: 'number' },
        ],
        rows: data.funnel.map((f: any) => ({
          stage: f.stage ?? f.label ?? '',
          count: f.count ?? f.value ?? 0,
        })),
      });
    }

    const ga4 = data.ga4_funnel;
    if (ga4) {
      sections.push({
        type: 'kpis',
        title: 'GA4 Funnel',
        items: [
          { label: 'View Item', value: ga4.view_item ?? 0 },
          { label: 'Add to Cart', value: ga4.add_to_cart ?? 0 },
          { label: 'Begin Checkout', value: ga4.begin_checkout ?? 0 },
          { label: 'Purchase', value: ga4.purchase ?? 0 },
          { label: 'Form Start', value: ga4.form_start ?? 0 },
          { label: 'Form Submit', value: ga4.form_submit ?? 0 },
        ],
      });
    }

    return sections;
  }, [data, core4]);

  return (
    <DashboardGuard dashboard="marketing" fallback={<AccessDenied />}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: `${space['6']} ${space['4']}` }}>
        <div style={{ marginBottom: space['6'] }}>
          <h1
            style={{
              fontFamily: fontFamily.display,
              fontSize: fontSize['3xl'],
              fontWeight: fontWeight.semibold,
              color: tc.text.primary,
              marginBottom: space['1'],
              lineHeight: lineHeight.snug,
            }}
            data-testid="text-page-title"
          >
            Executive Overview
          </h1>
          <p
            style={{
              fontFamily: fontFamily.body,
              fontSize: fontSize.base,
              color: tc.text.muted,
              lineHeight: lineHeight.normal,
            }}
          >
            Strategic marketing performance summary with Core 4 engine insights.
          </p>
          <div style={{ marginTop: space['3'] }}>
            <PageExportBar
              filename="executive-overview"
              pdfTitle="Executive Overview"
              sections={exportSections}
              loading={loading}
            />
          </div>
        </div>

        {error && !loading && (
          <DashboardCard title="Error" error={error} onRetry={refetch} />
        )}

        <MarketingPerformanceScore
          kpis={data?.kpis}
          comparisons={data?.comparisons}
          loading={loading}
        />

        {narrative && (
          <div
            style={{
              padding: `${space['4']} ${space['5']}`,
              backgroundColor: indigo[50],
              borderLeft: `4px solid ${violet[500]}`,
              borderRadius: radius.md,
              marginBottom: space['6'],
              fontFamily: fontFamily.body,
              fontSize: fontSize.base,
              color: indigo[950],
              lineHeight: lineHeight.relaxed,
            }}
            data-testid="text-performance-narrative"
          >
            {narrative}
          </div>
        )}

        <MarketingExecutiveKPIs
          kpis={data?.kpis}
          comparisons={data?.comparisons}
          googleAdsOverview={data?.google_ads_overview}
          loading={loading}
          timeseries={data?.timeseries}
        />

        {core4 && (
          <div style={{ marginBottom: space['6'] }}>
            <h2
              style={{
                fontFamily: fontFamily.display,
                fontSize: fontSize.xl,
                fontWeight: fontWeight.semibold,
                color: tc.text.primary,
                marginBottom: space['4'],
              }}
              data-testid="text-core4-heading"
            >
              Core 4 Growth Engines
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: space['4'] }}>
              <Link href={ENGINE_COLORS.warm_outreach.href} style={{ textDecoration: 'none' }}>
                <EngineCard
                  title={ENGINE_COLORS.warm_outreach.label}
                  accentColor={ENGINE_COLORS.warm_outreach.accent}
                  metrics={[
                    { label: 'Sessions', value: formatNumber(core4.warm_outreach?.current?.sessions ?? 0) },
                    { label: 'Quotes', value: formatNumber(core4.warm_outreach?.current?.quotes ?? 0) },
                    { label: 'Pipeline', value: formatCurrency(core4.warm_outreach?.current?.pipeline_value_usd ?? 0) },
                  ]}
                  deltaPercent={core4.warm_outreach?.deltas?.sessions_pct}
                />
              </Link>
              <Link href={ENGINE_COLORS.cold_outreach.href} style={{ textDecoration: 'none' }}>
                <ColdOutreachEngineCard />
              </Link>
              <Link href={ENGINE_COLORS.post_free_content.href} style={{ textDecoration: 'none' }}>
                <EngineCard
                  title={ENGINE_COLORS.post_free_content.label}
                  accentColor={ENGINE_COLORS.post_free_content.accent}
                  metrics={[
                    { label: 'Sessions', value: formatNumber(core4.post_free_content?.current?.sessions ?? 0) },
                    { label: 'Quotes', value: formatNumber(core4.post_free_content?.current?.quotes ?? 0) },
                    { label: 'Pipeline', value: formatCurrency(core4.post_free_content?.current?.pipeline_value_usd ?? 0) },
                  ]}
                  deltaPercent={core4.post_free_content?.deltas?.sessions_pct}
                />
              </Link>
              <Link href={ENGINE_COLORS.run_paid_ads.href} style={{ textDecoration: 'none' }}>
                <EngineCard
                  title={ENGINE_COLORS.run_paid_ads.label}
                  accentColor={ENGINE_COLORS.run_paid_ads.accent}
                  metrics={[
                    { label: 'Spend', value: formatCurrency(core4.run_paid_ads?.current?.spend ?? 0) },
                    { label: 'ROAS', value: `${(core4.run_paid_ads?.current?.roas ?? 0).toFixed(1)}x` },
                    { label: 'Pipeline', value: formatCurrency(core4.run_paid_ads?.current?.pipeline_value_usd ?? 0) },
                  ]}
                  deltaPercent={core4.run_paid_ads?.deltas?.sessions_pct}
                />
              </Link>
            </div>
          </div>
        )}

        <MarketingChannelBreakdownPanel
          channels={data?.channel_performance ?? []}
          loading={loading}
          error={error}
        />

        <MarketingTimeseriesPanel
          timeseries={data?.timeseries}
          enabled={true}
          loading={loading}
          error={error}
          daysInPeriod={daysInPeriod}
        />

        <MarketingFunnelPanel
          funnel={data?.funnel ?? []}
          loading={loading}
          error={error}
        />

        <MarketingGA4FunnelPanel
          funnel={data?.ga4_funnel ?? EMPTY_GA4_FUNNEL}
          loading={loading}
          error={error}
        />

        <MarketingAnomaliesPanel
          anomalies={data?.anomalies}
          loading={loading}
          error={error}
        />
      </div>
    </DashboardGuard>
  );
}
