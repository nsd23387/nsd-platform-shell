'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied, DashboardCard } from '../../../../components/dashboard';
import { PageExportBar } from '../../../../components/dashboard/PageExportBar';
import { DashboardSection } from '../../../../components/dashboard/DashboardSection';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { indigo, violet, magenta } from '../../../../design/tokens/colors';
import { AreaLineChart } from '../../../../components/dashboard/charts/AreaLineChart';
import { DrilldownBreadcrumb } from '../components/adminto/DrilldownBreadcrumb';
import type { ExportSection, ExportColumn } from '../../../../lib/exportUtils';

interface FunnelSummary {
  total_quotes: number;
  won_orders: number;
  open_quotes: number;
  lost_quotes: number;
  quote_to_close_rate: number;
  won_revenue: number;
  total_pipeline: number;
  revenue_per_quote: number;
  avg_quote_value: number;
  avg_won_value: number;
  avg_sales_cycle_days: number;
}

interface AgingBand {
  band: string;
  count: number;
  pipeline_value: number;
}

interface AgingData {
  bands: AgingBand[];
  total_open: number;
  aged_30_plus: number;
  aged_rate: number;
}

interface WinRateRow {
  type: string;
  total: number;
  won: number;
  win_rate: number;
  won_revenue: number;
  avg_won_value: number;
}

interface WinRateData {
  by_quote_type: WinRateRow[];
  by_sign_type: WinRateRow[];
}

interface StageRow {
  stage: string;
  active: boolean;
  count: number;
  pipeline_value: number;
  avg_age_days: number;
}

interface TrendRow {
  week: string;
  submissions: number;
  won: number;
  pipeline_value: number;
  won_revenue: number;
}

interface AttributionRow {
  source: string;
  medium: string;
  total: number;
  won: number;
  win_rate: number;
  won_revenue: number;
}

interface AttributionData {
  by_source: AttributionRow[];
  attribution_rate: number;
  total_with_attribution: number;
  total_quotes: number;
}

interface CostPerQuoteData {
  google_ads_spend: number;
  web_quote_submissions: number;
  cost_per_quote: number;
  spend_period: { start: string; end: string; days: number };
  caveat: string;
}

function useQuoteFunnel<T>(view: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/activity-spine/marketing/quote-funnel?view=${view}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json.data as T);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

function LoadingState() {
  const tc = useThemeColors();
  return (
    <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body, fontSize: fontSize.sm }} data-testid="loading-state">
      Loading...
    </div>
  );
}

function KpiCard({ label, value, subtitle, testId }: { label: string; value: string; subtitle?: string; testId: string }) {
  const tc = useThemeColors();
  return (
    <div style={{
      padding: space['4'],
      backgroundColor: tc.background.surface,
      border: `1px solid ${tc.border.default}`,
      borderRadius: radius.lg,
    }} data-testid={testId}>
      <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, marginBottom: space['1'] }}>{label}</div>
      <div style={{ fontFamily: fontFamily.display, fontSize: fontSize['2xl'], fontWeight: fontWeight.semibold, color: tc.text.primary }}>{value}</div>
      {subtitle && (
        <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, color: tc.text.placeholder, marginTop: space['1'] }}>{subtitle}</div>
      )}
    </div>
  );
}

function SummaryKPIs({ data }: { data: FunnelSummary }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: space['4'], marginBottom: space['6'] }}>
      <KpiCard
        label="Quote-to-Close Rate"
        value={`${(data.quote_to_close_rate * 100).toFixed(1)}%`}
        subtitle={`${data.won_orders} won / ${data.total_quotes} total`}
        testId="kpi-close-rate"
      />
      <KpiCard
        label="Won Revenue"
        value={`$${data.won_revenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
        subtitle={`${data.won_orders} orders`}
        testId="kpi-won-revenue"
      />
      <KpiCard
        label="Revenue per Quote"
        value={`$${data.revenue_per_quote.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
        subtitle="Won revenue / all quotes"
        testId="kpi-revenue-per-quote"
      />
      <KpiCard
        label="Avg Won Order"
        value={`$${data.avg_won_value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
        subtitle="Avg value of won orders"
        testId="kpi-avg-won"
      />
      <KpiCard
        label="Open Quotes"
        value={data.open_quotes.toLocaleString()}
        subtitle={`${data.lost_quotes} lost`}
        testId="kpi-open-quotes"
      />
      <KpiCard
        label="Avg Sales Cycle"
        value={`${data.avg_sales_cycle_days} days`}
        subtitle="Created to paid"
        testId="kpi-sales-cycle"
      />
    </div>
  );
}

function AgingSection({ data }: { data: AgingData }) {
  const tc = useThemeColors();
  const maxCount = Math.max(...data.bands.map(b => b.count), 1);

  const bandColors: Record<string, string> = {
    '0-3 days': indigo[400],
    '3-7 days': indigo[500],
    '7-14 days': violet[400],
    '14-30 days': violet[500],
    '30-60 days': magenta[400],
    '60+ days': magenta[600],
  };

  return (
    <div>
      <div style={{
        display: 'flex',
        gap: space['4'],
        marginBottom: space['4'],
        flexWrap: 'wrap',
      }}>
        <div style={{
          padding: `${space['2']} ${space['3']}`,
          backgroundColor: tc.background.muted,
          borderRadius: radius.md,
          fontFamily: fontFamily.body,
          fontSize: fontSize.sm,
        }}>
          <span style={{ color: tc.text.muted }}>Open quotes: </span>
          <span style={{ color: tc.text.primary, fontWeight: fontWeight.semibold }} data-testid="text-total-open">{data.total_open}</span>
        </div>
        <div style={{
          padding: `${space['2']} ${space['3']}`,
          backgroundColor: data.aged_rate > 0.3 ? 'rgba(220,38,38,0.08)' : tc.background.muted,
          borderRadius: radius.md,
          fontFamily: fontFamily.body,
          fontSize: fontSize.sm,
        }}>
          <span style={{ color: tc.text.muted }}>Aged 30+ days: </span>
          <span style={{ color: data.aged_rate > 0.3 ? '#dc2626' : tc.text.primary, fontWeight: fontWeight.semibold }} data-testid="text-aged-rate">
            {data.aged_30_plus} ({(data.aged_rate * 100).toFixed(0)}%)
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: space['2'] }}>
        {data.bands.map(band => (
          <div key={band.band} style={{ display: 'flex', alignItems: 'center', gap: space['3'] }} data-testid={`aging-band-${band.band.replace(/\s+/g, '-')}`}>
            <div style={{ width: '90px', fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, flexShrink: 0, textAlign: 'right' }}>
              {band.band}
            </div>
            <div style={{ flex: 1, height: '28px', backgroundColor: tc.background.muted, borderRadius: radius.sm, overflow: 'hidden', position: 'relative' }}>
              <div style={{
                width: `${(band.count / maxCount) * 100}%`,
                height: '100%',
                backgroundColor: bandColors[band.band] || indigo[400],
                borderRadius: radius.sm,
                minWidth: band.count > 0 ? '4px' : '0',
                transition: 'width 0.3s ease',
              }} />
              <span style={{
                position: 'absolute',
                left: space['2'],
                top: '50%',
                transform: 'translateY(-50%)',
                fontFamily: fontFamily.body,
                fontSize: fontSize.xs,
                fontWeight: fontWeight.medium,
                color: tc.text.primary,
              }}>
                {band.count} ({`$${band.pipeline_value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`})
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WinRateTable({ rows, typeLabel }: { rows: WinRateRow[]; typeLabel: string }) {
  const tc = useThemeColors();

  const thStyle: React.CSSProperties = {
    padding: `${space['2']} ${space['3']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: tc.text.muted,
    textAlign: 'right',
    borderBottom: `1px solid ${tc.border.default}`,
    whiteSpace: 'nowrap',
  };

  const tdStyle = (align: 'left' | 'right' = 'right'): React.CSSProperties => ({
    padding: `${space['2']} ${space['3']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: tc.text.primary,
    textAlign: align,
    borderBottom: `1px solid ${tc.border.subtle}`,
    whiteSpace: 'nowrap',
  });

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }} data-testid={`table-win-rate-${typeLabel.toLowerCase().replace(/\s+/g, '-')}`}>
        <thead>
          <tr>
            <th style={{ ...thStyle, textAlign: 'left' }}>{typeLabel}</th>
            <th style={thStyle}>Quotes</th>
            <th style={thStyle}>Won</th>
            <th style={thStyle}>Win Rate</th>
            <th style={thStyle}>Won Revenue</th>
            <th style={thStyle}>Avg Won Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.type}>
              <td style={tdStyle('left')}>
                <span style={{
                  padding: `${space['0.5']} ${space['2']}`,
                  backgroundColor: tc.background.muted,
                  borderRadius: radius.sm,
                  fontSize: fontSize.xs,
                  textTransform: 'capitalize' as const,
                }}>
                  {row.type}
                </span>
              </td>
              <td style={tdStyle()}>{row.total}</td>
              <td style={tdStyle()}>{row.won}</td>
              <td style={tdStyle()}>
                <span style={{ color: row.win_rate > 0.2 ? '#16a34a' : row.win_rate > 0.1 ? tc.text.primary : '#dc2626' }}>
                  {(row.win_rate * 100).toFixed(1)}%
                </span>
              </td>
              <td style={tdStyle()}>${row.won_revenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
              <td style={tdStyle()}>{row.won > 0 ? `$${row.avg_won_value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '--'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StageBreakdownTable({ data }: { data: StageRow[] }) {
  const tc = useThemeColors();

  const tdStyle = (align: 'left' | 'right' = 'right'): React.CSSProperties => ({
    padding: `${space['2']} ${space['3']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: tc.text.primary,
    textAlign: align,
    borderBottom: `1px solid ${tc.border.subtle}`,
    whiteSpace: 'nowrap',
  });

  const thStyle: React.CSSProperties = {
    padding: `${space['2']} ${space['3']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: tc.text.muted,
    textAlign: 'right',
    borderBottom: `1px solid ${tc.border.default}`,
    whiteSpace: 'nowrap',
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }} data-testid="table-stage-breakdown">
        <thead>
          <tr>
            <th style={{ ...thStyle, textAlign: 'left' }}>Stage</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Count</th>
            <th style={thStyle}>Pipeline Value</th>
            <th style={thStyle}>Avg Age (days)</th>
          </tr>
        </thead>
        <tbody>
          {data.map(row => (
            <tr key={`${row.stage}-${row.active}`}>
              <td style={tdStyle('left')}>{row.stage}</td>
              <td style={tdStyle()}>
                <span style={{
                  padding: `${space['0.5']} ${space['2']}`,
                  backgroundColor: row.active ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)',
                  color: row.active ? '#16a34a' : '#dc2626',
                  borderRadius: radius.sm,
                  fontSize: fontSize.xs,
                  fontWeight: fontWeight.medium,
                }}>
                  {row.active ? 'Active' : 'Closed'}
                </span>
              </td>
              <td style={tdStyle()}>{row.count}</td>
              <td style={tdStyle()}>${row.pipeline_value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
              <td style={tdStyle()}>{row.avg_age_days}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AttributionSection({ data }: { data: AttributionData }) {
  const tc = useThemeColors();

  const tdStyle = (align: 'left' | 'right' = 'right'): React.CSSProperties => ({
    padding: `${space['2']} ${space['3']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: tc.text.primary,
    textAlign: align,
    borderBottom: `1px solid ${tc.border.subtle}`,
    whiteSpace: 'nowrap',
  });

  const thStyle: React.CSSProperties = {
    padding: `${space['2']} ${space['3']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: tc.text.muted,
    textAlign: 'right',
    borderBottom: `1px solid ${tc.border.default}`,
    whiteSpace: 'nowrap',
  };

  return (
    <div>
      <div style={{
        padding: `${space['2']} ${space['3']}`,
        backgroundColor: data.attribution_rate < 0.5 ? 'rgba(220,38,38,0.06)' : tc.background.muted,
        borderRadius: radius.md,
        marginBottom: space['4'],
        fontFamily: fontFamily.body,
        fontSize: fontSize.sm,
        color: tc.text.muted,
      }}>
        Attribution coverage: {data.total_with_attribution} of {data.total_quotes} quotes ({(data.attribution_rate * 100).toFixed(0)}%) have UTM source data.
        {data.attribution_rate < 0.5 && ' Low coverage — numbers below represent only attributed quotes.'}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }} data-testid="table-attribution">
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: 'left' }}>Source</th>
              <th style={{ ...thStyle, textAlign: 'left' }}>Medium</th>
              <th style={thStyle}>Quotes</th>
              <th style={thStyle}>Won</th>
              <th style={thStyle}>Win Rate</th>
              <th style={thStyle}>Won Revenue</th>
            </tr>
          </thead>
          <tbody>
            {data.by_source.map((row, i) => (
              <tr key={`${row.source}-${row.medium}-${i}`}>
                <td style={tdStyle('left')}>{row.source}</td>
                <td style={tdStyle('left')}>{row.medium}</td>
                <td style={tdStyle()}>{row.total}</td>
                <td style={tdStyle()}>{row.won}</td>
                <td style={tdStyle()}>{(row.win_rate * 100).toFixed(1)}%</td>
                <td style={tdStyle()}>${row.won_revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CostPerQuoteSection({ data }: { data: CostPerQuoteData }) {
  const tc = useThemeColors();
  return (
    <div>
      <div style={{
        padding: `${space['2']} ${space['3']}`,
        backgroundColor: tc.background.muted,
        borderRadius: radius.md,
        marginBottom: space['4'],
        fontFamily: fontFamily.body,
        fontSize: fontSize.sm,
        color: tc.text.muted,
      }}>
        Google Ads spend period: {data.spend_period.start} to {data.spend_period.end} ({data.spend_period.days} days).
        Quote submissions measured from all web conversion events across the same system.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: space['4'] }}>
        <KpiCard
          label="Google Ads Spend"
          value={`$${data.google_ads_spend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle={`${data.spend_period.days} days tracked`}
          testId="kpi-ads-spend"
        />
        <KpiCard
          label="Quote Submissions"
          value={data.web_quote_submissions.toLocaleString()}
          subtitle="From web events"
          testId="kpi-quote-submissions"
        />
        <KpiCard
          label="Cost per Quote"
          value={`$${data.cost_per_quote.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle="Google Ads only"
          testId="kpi-cost-per-quote"
        />
      </div>
    </div>
  );
}

function PipelineTrendChart({ data }: { data: TrendRow[] }) {
  const tc = useThemeColors();

  if (!data.length) {
    return (
      <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body, fontSize: fontSize.sm }}>
        No trend data available.
      </div>
    );
  }

  const chartData = data.map(d => ({
    week: d.week,
    submissions: d.submissions,
    won: d.won,
  }));

  return (
    <div style={{ height: '240px' }}>
      <AreaLineChart
        data={chartData}
        xDataKey="week"
        series={[
          { dataKey: 'submissions', label: 'Submissions', color: indigo[500] },
          { dataKey: 'won', label: 'Won', color: violet[500], type: 'line' },
        ]}
        height={240}
        formatValue={(v: number) => v.toString()}
        showLegend
      />
    </div>
  );
}

function QuoteFunnelContent() {
  const tc = useThemeColors();
  const { data: summary, loading: summaryLoading } = useQuoteFunnel<FunnelSummary>('summary');
  const { data: aging, loading: agingLoading } = useQuoteFunnel<AgingData>('aging');
  const { data: winRate, loading: winRateLoading } = useQuoteFunnel<WinRateData>('win-rate-by-type');
  const { data: stages, loading: stagesLoading } = useQuoteFunnel<StageRow[]>('stage-breakdown');
  const { data: trend, loading: trendLoading } = useQuoteFunnel<TrendRow[]>('pipeline-trend');
  const { data: attribution, loading: attrLoading } = useQuoteFunnel<AttributionData>('attribution');
  const { data: costPerQuote, loading: costLoading } = useQuoteFunnel<CostPerQuoteData>('cost-per-quote');

  const exportSections = useMemo((): ExportSection[] => {
    const sections: ExportSection[] = [];
    if (summary) {
      sections.push({
        type: 'kpis',
        title: 'Quote Funnel Summary',
        items: [
          { label: 'Total Quotes', value: summary.total_quotes },
          { label: 'Won Orders', value: summary.won_orders },
          { label: 'Quote-to-Close Rate', value: `${(summary.quote_to_close_rate * 100).toFixed(1)}%` },
          { label: 'Won Revenue', value: `$${summary.won_revenue.toFixed(0)}` },
          { label: 'Revenue per Quote', value: `$${summary.revenue_per_quote.toFixed(0)}` },
          { label: 'Avg Sales Cycle', value: `${summary.avg_sales_cycle_days} days` },
        ],
      });
    }
    if (winRate) {
      const cols: ExportColumn[] = [
        { key: 'type', label: 'Type' },
        { key: 'total', label: 'Total', format: 'number' },
        { key: 'won', label: 'Won', format: 'number' },
        { key: 'win_rate', label: 'Win Rate', format: 'percent' },
        { key: 'won_revenue', label: 'Revenue', format: 'currency' },
      ];
      sections.push({
        type: 'table',
        title: 'Win Rate by Quote Type',
        columns: cols,
        rows: winRate.by_quote_type.map(r => ({
          type: r.type,
          total: r.total,
          won: r.won,
          win_rate: r.win_rate * 100,
          won_revenue: r.won_revenue,
        })),
      });
    }
    return sections;
  }, [summary, winRate]);

  return (
    <div style={{ padding: space['6'], maxWidth: '1200px' }}>
      <DrilldownBreadcrumb items={[
        { label: 'Marketing', href: '/dashboard/marketing' },
        { label: 'Quote Pipeline' },
      ]} />

      <h1 style={{
        fontFamily: fontFamily.display,
        fontSize: fontSize['2xl'],
        fontWeight: fontWeight.semibold,
        color: tc.text.primary,
        marginBottom: space['1'],
      }} data-testid="heading-quote-funnel">
        Quote Pipeline
      </h1>
      <p style={{
        fontFamily: fontFamily.body,
        fontSize: fontSize.sm,
        color: tc.text.muted,
        marginBottom: space['6'],
        lineHeight: lineHeight.relaxed,
      }}>
        Quote-to-close metrics, aging analysis, and win rate breakdowns from QMS production data.
      </p>

      <PageExportBar
        filename="quote-pipeline"
        pdfTitle="Quote Pipeline Report"
        sections={exportSections}
      />

      {summaryLoading || !summary ? <LoadingState /> : <SummaryKPIs data={summary} />}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: space['6'], marginBottom: space['6'] }}>
        <DashboardSection title="Aging Quotes" description="Open quotes by age band with pipeline value">
          {agingLoading || !aging ? <LoadingState /> : <AgingSection data={aging} />}
        </DashboardSection>

        <DashboardSection title="Cost per Quote" description="Google Ads spend efficiency">
          {costLoading || !costPerQuote ? <LoadingState /> : <CostPerQuoteSection data={costPerQuote} />}
        </DashboardSection>
      </div>

      <div style={{ marginBottom: space['6'] }}>
        <DashboardSection title="Win Rate by Quote Type" description="Close rates segmented by quote and sign type">
          {winRateLoading || !winRate ? <LoadingState /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: space['6'] }}>
              <WinRateTable rows={winRate.by_quote_type} typeLabel="Quote Type" />
              <WinRateTable rows={winRate.by_sign_type} typeLabel="Sign Type" />
            </div>
          )}
        </DashboardSection>
      </div>

      <div style={{ marginBottom: space['6'] }}>
        <DashboardSection title="Pipeline Stage Breakdown" description="Current distribution across lifecycle stages">
          {stagesLoading || !stages ? <LoadingState /> : <StageBreakdownTable data={stages} />}
        </DashboardSection>
      </div>

      <div style={{ marginBottom: space['6'] }}>
        <DashboardSection title="Weekly Submission Trend" description="Quote submissions per week">
          {trendLoading || !trend ? <LoadingState /> : <PipelineTrendChart data={trend} />}
        </DashboardSection>
      </div>

      <div style={{ marginBottom: space['6'] }}>
        <DashboardSection title="Source Attribution" description="Win rates by UTM source/medium (limited by current data capture)">
          {attrLoading || !attribution ? <LoadingState /> : <AttributionSection data={attribution} />}
        </DashboardSection>
      </div>
    </div>
  );
}

export default function QuoteFunnelPage() {
  return (
    <DashboardGuard dashboard="marketing" fallback={<AccessDenied />}>
      <QuoteFunnelContent />
    </DashboardGuard>
  );
}
