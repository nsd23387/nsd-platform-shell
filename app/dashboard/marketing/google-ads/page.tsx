'use client';

import React, { useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied, DashboardCard } from '../../../../components/dashboard';
import { PageExportBar } from '../../../../components/dashboard/PageExportBar';
import { DashboardSection } from '../../../../components/dashboard/DashboardSection';
import { MarketingGoogleAdsCampaignsPanel } from '../components/MarketingGoogleAdsCampaignsPanel';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { MarketingContext } from '../lib/MarketingContext';
import { DrilldownBreadcrumb } from '../components/adminto/DrilldownBreadcrumb';
import { AreaLineChart } from '../../../../components/dashboard/charts/AreaLineChart';
import { indigo, violet, magenta } from '../../../../design/tokens/colors';
import type { ExportSection } from '../../../../lib/exportUtils';

interface CampaignDailyRow {
  date: string;
  campaign_id: string;
  campaign_name: string;
  clicks: number;
  impressions: number;
  cost: number;
  conversions: number;
}

interface SummaryTotals {
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
  conversion_value: number;
  cpc: number;
  cpl: number;
  ctr: number;
  roas: number;
}

interface KeywordRow {
  keyword_text: string;
  keyword_match_type: string;
  campaign_id: string;
  clicks: number;
  impressions: number;
  cost: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cost_per_conversion: number;
}

interface SearchTermRow {
  campaign_id: string;
  campaign_name: string;
  ad_group_id: string;
  ad_group_name: string;
  clicks: number;
  impressions: number;
  cost: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cost_per_conversion: number;
}

interface ConversionRow {
  conversion_action_name: string;
  conversion_action_category: string;
  conversions: number;
  conversion_value: number;
  value_per_conversion: number;
}

interface CampaignOption {
  campaign_id: string;
  campaign_name: string;
}

function useGoogleAdsDetail<T>(view: string, extraParams?: Record<string, string>) {
  const { queryParams } = useContext(MarketingContext);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const paramKey = JSON.stringify({ ...queryParams, ...extraParams, view });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('view', view);
      if (queryParams.start) params.set('start', queryParams.start);
      if (queryParams.end) params.set('end', queryParams.end);
      if (queryParams.preset) params.set('preset', queryParams.preset);
      if (extraParams) {
        Object.entries(extraParams).forEach(([k, v]) => { if (v) params.set(k, v); });
      }
      const res = await fetch(`/api/activity-spine/marketing/google-ads-detail?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json.data as T);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [paramKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error };
}

function LoadingState() {
  const tc = useThemeColors();
  return (
    <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body, fontSize: fontSize.sm }} data-testid="loading-state">
      Loading data...
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  const tc = useThemeColors();
  return (
    <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body, fontSize: fontSize.sm, border: `1px dashed ${tc.border.default}`, borderRadius: radius.lg, backgroundColor: tc.background.muted }} data-testid="empty-state">
      {message}
    </div>
  );
}

function KpiCard({ label, value, format }: { label: string; value: number; format: 'currency' | 'number' | 'percent' | 'multiplier' }) {
  const tc = useThemeColors();
  let display: string;
  if (format === 'currency') display = `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  else if (format === 'percent') display = `${(value * 100).toFixed(1)}%`;
  else if (format === 'multiplier') display = `${value.toFixed(2)}x`;
  else display = value.toLocaleString('en-US');

  return (
    <div style={{ padding: space['4'], backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg }} data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, marginBottom: space['1'] }}>{label}</div>
      <div style={{ fontFamily: fontFamily.display, fontSize: fontSize['2xl'], fontWeight: fontWeight.semibold, color: tc.text.primary }}>{display}</div>
    </div>
  );
}

function CampaignFilter({ campaigns, value, onChange }: { campaigns: CampaignOption[]; value: string; onChange: (v: string) => void }) {
  const tc = useThemeColors();
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: `${space['1.5']} ${space['3']}`,
        fontFamily: fontFamily.body,
        fontSize: fontSize.sm,
        backgroundColor: tc.background.surface,
        color: tc.text.primary,
        border: `1px solid ${tc.border.default}`,
        borderRadius: radius.md,
        cursor: 'pointer',
      }}
      data-testid="select-campaign-filter"
    >
      <option value="">All Campaigns</option>
      {campaigns.map(c => (
        <option key={c.campaign_id} value={c.campaign_id}>
          {c.campaign_name !== c.campaign_id ? c.campaign_name : `Campaign ${c.campaign_id}`}
        </option>
      ))}
    </select>
  );
}

function SortableHeader({ label, sortKey, currentSort, onSort }: { label: string; sortKey: string; currentSort: { key: string; dir: 'asc' | 'desc' }; onSort: (key: string) => void }) {
  const tc = useThemeColors();
  const isActive = currentSort.key === sortKey;
  return (
    <th
      onClick={() => onSort(sortKey)}
      style={{
        padding: `${space['2']} ${space['3']}`,
        fontFamily: fontFamily.body,
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
        color: isActive ? tc.text.primary : tc.text.muted,
        textAlign: 'right',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        borderBottom: `1px solid ${tc.border.default}`,
        userSelect: 'none',
      }}
    >
      {label} {isActive ? (currentSort.dir === 'asc' ? '\u25B2' : '\u25BC') : ''}
    </th>
  );
}

function KeywordPerformanceSection() {
  const tc = useThemeColors();
  const [campaignFilter, setCampaignFilter] = useState('');
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'cost', dir: 'desc' });

  const extraParams = campaignFilter ? { campaign_id: campaignFilter } : undefined;
  const { data: keywords, loading, error } = useGoogleAdsDetail<KeywordRow[]>('keywords', extraParams);
  const { data: campaigns } = useGoogleAdsDetail<CampaignOption[]>('campaigns-list');

  const sorted = useMemo(() => {
    if (!keywords) return [];
    return [...keywords].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sort.key];
      const bv = (b as unknown as Record<string, unknown>)[sort.key];
      if (typeof av === 'string' && typeof bv === 'string') {
        return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sort.dir === 'asc' ? (Number(av) - Number(bv)) : (Number(bv) - Number(av));
    });
  }, [keywords, sort]);

  const handleSort = (key: string) => {
    setSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' });
  };

  if (loading) return <LoadingState />;
  if (error) return <DashboardCard title="Error" error={error} />;
  if (!sorted.length) return <EmptyState message="No keyword data available for the selected period." />;

  const thStyle = (align: 'left' | 'right' = 'right'): React.CSSProperties => ({
    padding: `${space['2']} ${space['3']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: tc.text.muted,
    textAlign: align,
    borderBottom: `1px solid ${tc.border.default}`,
    whiteSpace: 'nowrap',
  });

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
    <div>
      <div style={{ marginBottom: space['4'] }}>
        <CampaignFilter campaigns={campaigns ?? []} value={campaignFilter} onChange={setCampaignFilter} />
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }} data-testid="table-keywords">
          <thead>
            <tr>
              <th style={thStyle('left')}>Keyword</th>
              <th style={thStyle()}>Match Type</th>
              <SortableHeader label="Clicks" sortKey="clicks" currentSort={sort} onSort={handleSort} />
              <SortableHeader label="Impressions" sortKey="impressions" currentSort={sort} onSort={handleSort} />
              <SortableHeader label="CTR" sortKey="ctr" currentSort={sort} onSort={handleSort} />
              <SortableHeader label="Avg CPC" sortKey="cpc" currentSort={sort} onSort={handleSort} />
              <SortableHeader label="Cost" sortKey="cost" currentSort={sort} onSort={handleSort} />
              <SortableHeader label="Conversions" sortKey="conversions" currentSort={sort} onSort={handleSort} />
              <SortableHeader label="Cost/Conv" sortKey="cost_per_conversion" currentSort={sort} onSort={handleSort} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((kw, i) => (
              <tr key={`${kw.keyword_text}-${kw.campaign_id}-${i}`}>
                <td style={tdStyle('left')}>{kw.keyword_text || '(not set)'}</td>
                <td style={tdStyle()}>
                  <span style={{
                    padding: `${space['0.5']} ${space['2']}`,
                    backgroundColor: tc.background.muted,
                    borderRadius: radius.sm,
                    fontSize: fontSize.xs,
                  }}>
                    {kw.keyword_match_type?.replace('KEYWORD_MATCH_', '').replace('KEYWORD', '') || 'N/A'}
                  </span>
                </td>
                <td style={tdStyle()}>{kw.clicks.toLocaleString()}</td>
                <td style={tdStyle()}>{kw.impressions.toLocaleString()}</td>
                <td style={tdStyle()}>{(kw.ctr * 100).toFixed(1)}%</td>
                <td style={tdStyle()}>${kw.cpc.toFixed(2)}</td>
                <td style={tdStyle()}>${kw.cost.toFixed(2)}</td>
                <td style={tdStyle()}>{kw.conversions.toFixed(0)}</td>
                <td style={tdStyle()}>{kw.conversions > 0 ? `$${kw.cost_per_conversion.toFixed(2)}` : '--'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SearchTermsSection() {
  const tc = useThemeColors();
  const [campaignFilter, setCampaignFilter] = useState('');
  const [sortBy, setSortBy] = useState<'cost' | 'clicks'>('cost');

  const extraParams: Record<string, string> = { sort_by: sortBy };
  if (campaignFilter) extraParams.campaign_id = campaignFilter;

  const { data: terms, loading, error } = useGoogleAdsDetail<SearchTermRow[]>('search-terms', extraParams);
  const { data: campaigns } = useGoogleAdsDetail<CampaignOption[]>('campaigns-list');

  if (loading) return <LoadingState />;
  if (error) return <DashboardCard title="Error" error={error} />;
  if (!terms?.length) return <EmptyState message="No search term data available for the selected period." />;

  const tdStyle = (align: 'left' | 'right' = 'right'): React.CSSProperties => ({
    padding: `${space['2']} ${space['3']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: tc.text.primary,
    textAlign: align,
    borderBottom: `1px solid ${tc.border.subtle}`,
    whiteSpace: 'nowrap',
  });

  const thStyle = (align: 'left' | 'right' = 'right'): React.CSSProperties => ({
    padding: `${space['2']} ${space['3']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: tc.text.muted,
    textAlign: align,
    borderBottom: `1px solid ${tc.border.default}`,
    whiteSpace: 'nowrap',
  });

  return (
    <div>
      <div style={{ marginBottom: space['3'], padding: `${space['2']} ${space['3']}`, backgroundColor: tc.background.muted, borderRadius: radius.md, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>
        Search term text is not yet available in the data pipeline. Showing aggregated metrics by ad group.
      </div>
      <div style={{ marginBottom: space['4'], display: 'flex', gap: space['3'], alignItems: 'center', flexWrap: 'wrap' }}>
        <CampaignFilter campaigns={campaigns ?? []} value={campaignFilter} onChange={setCampaignFilter} />
        <div style={{ display: 'flex', gap: space['2'] }}>
          {(['cost', 'clicks'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              style={{
                padding: `${space['1']} ${space['3']}`,
                fontFamily: fontFamily.body,
                fontSize: fontSize.sm,
                backgroundColor: sortBy === s ? tc.text.primary : tc.background.surface,
                color: sortBy === s ? tc.background.surface : tc.text.muted,
                border: `1px solid ${tc.border.default}`,
                borderRadius: radius.md,
                cursor: 'pointer',
              }}
              data-testid={`button-sort-${s}`}
            >
              Sort by {s === 'cost' ? 'Cost' : 'Clicks'}
            </button>
          ))}
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }} data-testid="table-search-terms">
          <thead>
            <tr>
              <th style={thStyle('left')}>Ad Group</th>
              <th style={thStyle('left')}>Campaign</th>
              <th style={thStyle()}>Clicks</th>
              <th style={thStyle()}>Impressions</th>
              <th style={thStyle()}>CTR</th>
              <th style={thStyle()}>Avg CPC</th>
              <th style={thStyle()}>Cost</th>
              <th style={thStyle()}>Conversions</th>
              <th style={thStyle()}>Cost/Conv</th>
            </tr>
          </thead>
          <tbody>
            {terms.map((t, i) => (
              <tr key={`${t.ad_group_id}-${i}`}>
                <td style={tdStyle('left')}>{t.ad_group_name || t.ad_group_id}</td>
                <td style={tdStyle('left')}>{t.campaign_name || t.campaign_id}</td>
                <td style={tdStyle()}>{t.clicks.toLocaleString()}</td>
                <td style={tdStyle()}>{t.impressions.toLocaleString()}</td>
                <td style={tdStyle()}>{(t.ctr * 100).toFixed(1)}%</td>
                <td style={tdStyle()}>${t.cpc.toFixed(2)}</td>
                <td style={tdStyle()}>${t.cost.toFixed(2)}</td>
                <td style={tdStyle()}>{t.conversions.toFixed(0)}</td>
                <td style={tdStyle()}>{t.conversions > 0 ? `$${t.cost_per_conversion.toFixed(2)}` : '--'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ConversionActionsSection() {
  const tc = useThemeColors();
  const { data: conversions, loading, error } = useGoogleAdsDetail<ConversionRow[]>('conversions');

  if (loading) return <LoadingState />;
  if (error) return <DashboardCard title="Error" error={error} />;
  if (!conversions?.length) {
    return (
      <EmptyState message="Conversion action data is not yet available. The raw_google_ads_campaign_conversions table is pending Supabase migration." />
    );
  }

  const thStyle = (align: 'left' | 'right' = 'right'): React.CSSProperties => ({
    padding: `${space['2']} ${space['3']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: tc.text.muted,
    textAlign: align,
    borderBottom: `1px solid ${tc.border.default}`,
    whiteSpace: 'nowrap',
  });

  const tdStyle = (align: 'left' | 'right' = 'right'): React.CSSProperties => ({
    padding: `${space['2']} ${space['3']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: tc.text.primary,
    textAlign: align,
    borderBottom: `1px solid ${tc.border.subtle}`,
  });

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }} data-testid="table-conversion-actions">
        <thead>
          <tr>
            <th style={thStyle('left')}>Conversion Action</th>
            <th style={thStyle('left')}>Category</th>
            <th style={thStyle()}>Conversions</th>
            <th style={thStyle()}>Value</th>
            <th style={thStyle()}>Value/Conv</th>
          </tr>
        </thead>
        <tbody>
          {conversions.map((c, i) => (
            <tr key={`${c.conversion_action_name}-${i}`}>
              <td style={tdStyle('left')}>{c.conversion_action_name}</td>
              <td style={tdStyle('left')}>{c.conversion_action_category}</td>
              <td style={tdStyle()}>{c.conversions.toFixed(0)}</td>
              <td style={tdStyle()}>${c.conversion_value.toFixed(2)}</td>
              <td style={tdStyle()}>${c.value_per_conversion.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CampaignTrendSection() {
  const { data: daily, loading, error } = useGoogleAdsDetail<CampaignDailyRow[]>('daily');
  const [metric, setMetric] = useState<'clicks' | 'impressions' | 'cost' | 'conversions'>('clicks');
  const tc = useThemeColors();

  const chartData = useMemo(() => {
    if (!daily?.length) return [];
    const grouped: Record<string, Record<string, number>> = {};
    for (const r of daily) {
      if (!grouped[r.date]) grouped[r.date] = {};
      grouped[r.date][r.campaign_id] = (grouped[r.date][r.campaign_id] || 0) + Number(r[metric]);
    }
    const campaigns = Array.from(new Set(daily.map(r => r.campaign_id)));
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => {
        const entry: Record<string, unknown> = { date };
        let total = 0;
        for (const cid of campaigns) {
          total += vals[cid] || 0;
        }
        entry.total = total;
        return entry;
      });
  }, [daily, metric]);

  if (loading) return <LoadingState />;
  if (error) return <DashboardCard title="Error" error={error} />;
  if (!chartData.length) return <EmptyState message="No campaign daily data available for the selected period." />;

  const metricColors: Record<string, string> = { clicks: indigo[600], impressions: violet[500], cost: magenta[500], conversions: indigo[400] };

  return (
    <div>
      <div style={{ marginBottom: space['3'], display: 'flex', gap: space['2'] }}>
        {(['clicks', 'impressions', 'cost', 'conversions'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            style={{
              padding: `${space['1']} ${space['3']}`,
              fontFamily: fontFamily.body,
              fontSize: fontSize.sm,
              backgroundColor: metric === m ? tc.text.primary : tc.background.surface,
              color: metric === m ? tc.background.surface : tc.text.muted,
              border: `1px solid ${tc.border.default}`,
              borderRadius: radius.md,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
            data-testid={`button-metric-${m}`}
          >
            {m}
          </button>
        ))}
      </div>
      <AreaLineChart
        data={chartData}
        series={[{ dataKey: 'total', label: metric.charAt(0).toUpperCase() + metric.slice(1), color: metricColors[metric] }]}
        height={260}
        formatXAxis={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      />
    </div>
  );
}

function KeyMetricsSummary() {
  const { data: summary, loading, error } = useGoogleAdsDetail<{ totals: SummaryTotals }>('summary');

  if (loading) return <LoadingState />;
  if (error) return <DashboardCard title="Error" error={error} />;
  if (!summary?.totals) return <EmptyState message="No summary data available." />;

  const t = summary.totals;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: space['4'] }} data-testid="grid-key-metrics">
      <KpiCard label="Total Spend" value={t.spend} format="currency" />
      <KpiCard label="Total Clicks" value={t.clicks} format="number" />
      <KpiCard label="Total Conversions" value={t.conversions} format="number" />
      <KpiCard label="Blended CPC" value={t.cpc} format="currency" />
      <KpiCard label="Cost per Conversion" value={t.cpl} format="currency" />
      <KpiCard label="Conversion Value" value={t.conversion_value} format="currency" />
      <KpiCard label="ROAS" value={t.roas} format="multiplier" />
    </div>
  );
}

export default function GoogleAdsWarRoomPage() {
  const tc = useThemeColors();
  const { data, loading, error } = useContext(MarketingContext);

  const exportSections = useMemo<ExportSection[]>(() => {
    if (!data) return [];
    const sections: ExportSection[] = [];

    if (data.google_ads_campaigns?.length) {
      sections.push({
        type: 'table',
        title: 'Google Ads Campaigns',
        columns: [
          { key: 'campaign_name', label: 'Campaign' },
          { key: 'impressions', label: 'Impressions', format: 'number' },
          { key: 'clicks', label: 'Clicks', format: 'number' },
          { key: 'ctr', label: 'CTR', format: 'percent' },
          { key: 'cpc', label: 'CPC', format: 'currency' },
          { key: 'spend', label: 'Spend', format: 'currency' },
          { key: 'conversions', label: 'Conversions', format: 'number' },
          { key: 'roas', label: 'ROAS', format: 'number' },
        ],
        rows: data.google_ads_campaigns.map((r) => ({ ...r } as Record<string, unknown>)),
      });
    }

    return sections;
  }, [data]);

  return (
    <DashboardGuard dashboard="marketing" fallback={<AccessDenied />}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: `${space['6']} ${space['4']}` }}>
        <DrilldownBreadcrumb items={[{label:'Marketing', href:'/dashboard/marketing'}, {label:'Deep Dives'}, {label:'Google Ads War Room'}]} />
        <div style={{ marginBottom: space['6'], display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: space['4'], flexWrap: 'wrap' }}>
          <div>
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
              Google Ads War Room
            </h1>
            <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, color: tc.text.muted }}>
              Campaign-level detail, keyword performance, and search term triage.
            </p>
            <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.placeholder, marginTop: space['1'] }}>
              Note: Campaign names display as IDs until name mapping is available.
            </p>
          </div>
          <PageExportBar
            filename="google-ads-war-room"
            pdfTitle="Google Ads War Room"
            sections={exportSections}
            loading={loading}
          />
        </div>

        {error && !loading && (
          <DashboardCard title="Error" error={error} />
        )}

        <DashboardSection title="Key Metrics" description="Aggregated Google Ads performance for the selected period." index={0}>
          <KeyMetricsSummary />
        </DashboardSection>

        <DashboardSection title="Campaign Performance Trend" description="Daily metrics across all campaigns." index={1}>
          <CampaignTrendSection />
        </DashboardSection>

        <MarketingGoogleAdsCampaignsPanel
          campaigns={data?.google_ads_campaigns ?? []}
          loading={loading}
          error={error}
        />

        <DashboardSection title="Conversion Actions" description="Conversion action breakdown by type. Sourced from raw_google_ads_campaign_conversions." index={3}>
          <ConversionActionsSection />
        </DashboardSection>

        <DashboardSection title="Keyword Performance" description="Keyword-level metrics with match type. Sortable by any column." index={4}>
          <KeywordPerformanceSection />
        </DashboardSection>

        <DashboardSection title="Search Terms" description="Search term metrics aggregated by ad group. Useful for identifying keyword opportunities." index={5}>
          <SearchTermsSection />
        </DashboardSection>
      </div>
    </DashboardGuard>
  );
}
