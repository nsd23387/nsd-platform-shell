'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied, DashboardCard } from '../../../../components/dashboard';
import { PageExportBar } from '../../../../components/dashboard/PageExportBar';
import { DashboardSection } from '../../../../components/dashboard/DashboardSection';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { DrilldownBreadcrumb } from '../components/adminto/DrilldownBreadcrumb';
import type { ExportSection } from '../../../../lib/exportUtils';

interface KeywordGapRow {
  keyword: string;
  search_volume: number;
  keyword_difficulty: number;
  cpc: number;
  best_position: number;
  best_position_url: string;
  target_domain: string;
  competitor_domain: string;
  topic_cluster: string;
  sum_traffic: number;
}

interface BacklinkGapRow {
  referring_domain: string;
  domain_rating: number;
  dofollow_links: number;
  links_to_target: number;
  traffic_domain: number;
  target_domain: string;
  competitor_domain: string;
  first_seen: string;
}

interface TopPageRow {
  url: string;
  traffic: number;
  traffic_value: number;
  top_keyword: string;
  top_keyword_volume: number;
  top_keyword_position: number;
  keywords: number;
  referring_domains: number;
  competitor_domain: string;
  topic_cluster: string;
}

function useAhrefsData<T>(view: string, competitor?: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ view });
      if (competitor) params.set('competitor', competitor);
      const res = await fetch(`/api/activity-spine/marketing/ahrefs?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json.data as T);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [view, competitor]);

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

function CompetitorFilter({ competitors, value, onChange }: { competitors: string[]; value: string; onChange: (v: string) => void }) {
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
      data-testid="select-competitor-filter"
    >
      <option value="">All Competitors</option>
      {competitors.map(c => (
        <option key={c} value={c}>{c}</option>
      ))}
    </select>
  );
}

function DifficultyBadge({ value }: { value: number }) {
  const tc = useThemeColors();
  let color = '#22c55e';
  if (value > 60) color = '#ef4444';
  else if (value > 30) color = '#f59e0b';
  return (
    <span style={{
      display: 'inline-block',
      padding: `${space['0.5']} ${space['2']}`,
      borderRadius: radius.sm,
      backgroundColor: tc.background.muted,
      fontFamily: fontFamily.body,
      fontSize: fontSize.xs,
      fontWeight: fontWeight.medium,
      color,
    }}>
      {value}
    </span>
  );
}

function KeywordGapPanel({ competitor }: { competitor: string }) {
  const tc = useThemeColors();
  const { data, loading, error } = useAhrefsData<KeywordGapRow[]>('keyword-gap', competitor || undefined);
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'search_volume', dir: 'desc' });

  const sorted = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sort.key];
      const bv = (b as Record<string, unknown>)[sort.key];
      if (typeof av === 'string' && typeof bv === 'string') {
        return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sort.dir === 'asc' ? (Number(av) - Number(bv)) : (Number(bv) - Number(av));
    });
  }, [data, sort]);

  const handleSort = (key: string) => {
    setSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' });
  };

  if (loading) return <LoadingState />;
  if (error) return <DashboardCard title="Error" error={error} />;
  if (!sorted.length) return <EmptyState message="No keyword gap data available." />;

  const thStyle = (align: 'left' | 'right' = 'right'): React.CSSProperties => ({
    padding: `${space['2']} ${space['3']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: tc.text.muted,
    textAlign: align,
    borderBottom: `1px solid ${tc.border.default}`,
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    userSelect: 'none',
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

  const sortIndicator = (key: string) => sort.key === key ? (sort.dir === 'asc' ? ' \u25B2' : ' \u25BC') : '';

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }} data-testid="table-keyword-gap">
        <thead>
          <tr>
            <th style={thStyle('left')} onClick={() => handleSort('keyword')}>Keyword{sortIndicator('keyword')}</th>
            <th style={thStyle()} onClick={() => handleSort('search_volume')}>Volume{sortIndicator('search_volume')}</th>
            <th style={thStyle()} onClick={() => handleSort('keyword_difficulty')}>KD{sortIndicator('keyword_difficulty')}</th>
            <th style={thStyle()} onClick={() => handleSort('cpc')}>CPC{sortIndicator('cpc')}</th>
            <th style={thStyle()} onClick={() => handleSort('best_position')}>Position{sortIndicator('best_position')}</th>
            <th style={thStyle('left')}>Competitor</th>
            <th style={thStyle('left')}>Cluster</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr key={`${r.keyword}-${r.competitor_domain}-${i}`}>
              <td style={tdStyle('left')}>{r.keyword}</td>
              <td style={tdStyle()}>{r.search_volume.toLocaleString()}</td>
              <td style={tdStyle()}><DifficultyBadge value={r.keyword_difficulty} /></td>
              <td style={tdStyle()}>${r.cpc.toFixed(2)}</td>
              <td style={tdStyle()}>{r.best_position > 0 ? `#${r.best_position}` : '--'}</td>
              <td style={tdStyle('left')}>{r.competitor_domain}</td>
              <td style={tdStyle('left')}>{r.topic_cluster || '--'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BacklinkGapPanel({ competitor }: { competitor: string }) {
  const tc = useThemeColors();
  const { data, loading, error } = useAhrefsData<BacklinkGapRow[]>('backlink-gap', competitor || undefined);

  if (loading) return <LoadingState />;
  if (error) return <DashboardCard title="Error" error={error} />;
  if (!data?.length) return <EmptyState message="No backlink gap data available." />;

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
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }} data-testid="table-backlink-gap">
        <thead>
          <tr>
            <th style={thStyle('left')}>Referring Domain</th>
            <th style={thStyle()}>DR</th>
            <th style={thStyle()}>Dofollow Links</th>
            <th style={thStyle()}>Links to Target</th>
            <th style={thStyle()}>Domain Traffic</th>
            <th style={thStyle('left')}>Competitor</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={`${r.referring_domain}-${r.competitor_domain}-${i}`}>
              <td style={tdStyle('left')}>{r.referring_domain}</td>
              <td style={tdStyle()}>{r.domain_rating}</td>
              <td style={tdStyle()}>{r.dofollow_links.toLocaleString()}</td>
              <td style={tdStyle()}>{r.links_to_target.toLocaleString()}</td>
              <td style={tdStyle()}>{r.traffic_domain.toLocaleString()}</td>
              <td style={tdStyle('left')}>{r.competitor_domain}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TopPagesPanel({ competitor }: { competitor: string }) {
  const tc = useThemeColors();
  const { data, loading, error } = useAhrefsData<TopPageRow[]>('top-pages', competitor || undefined);

  if (loading) return <LoadingState />;
  if (error) return <DashboardCard title="Error" error={error} />;
  if (!data?.length) return <EmptyState message="No top pages data available." />;

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
      <table style={{ width: '100%', borderCollapse: 'collapse' }} data-testid="table-top-pages">
        <thead>
          <tr>
            <th style={thStyle('left')}>URL</th>
            <th style={thStyle()}>Traffic</th>
            <th style={thStyle()}>Traffic Value</th>
            <th style={thStyle('left')}>Top Keyword</th>
            <th style={thStyle()}>Volume</th>
            <th style={thStyle()}>Ref. Domains</th>
            <th style={thStyle('left')}>Domain</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={`${r.url}-${i}`}>
              <td style={{ ...tdStyle('left'), maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.url}>
                {r.url}
              </td>
              <td style={tdStyle()}>{r.traffic.toLocaleString()}</td>
              <td style={tdStyle()}>${r.traffic_value.toFixed(0)}</td>
              <td style={{ ...tdStyle('left'), maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.top_keyword}>
                {r.top_keyword || '--'}
              </td>
              <td style={tdStyle()}>{r.top_keyword_volume.toLocaleString()}</td>
              <td style={tdStyle()}>{r.referring_domains.toLocaleString()}</td>
              <td style={tdStyle('left')}>{r.competitor_domain}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AhrefsIntelligencePage() {
  const tc = useThemeColors();
  const [competitor, setCompetitor] = useState('');
  const { data: competitors } = useAhrefsData<string[]>('competitors');

  const exportSections = useMemo<ExportSection[]>(() => [], []);

  return (
    <DashboardGuard dashboard="marketing" fallback={<AccessDenied />}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: `${space['6']} ${space['4']}` }}>
        <DrilldownBreadcrumb items={[{label:'Marketing', href:'/dashboard/marketing'}, {label:'Deep Dives'}, {label:'Ahrefs Intelligence'}]} />
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
              Ahrefs Intelligence
            </h1>
            <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, color: tc.text.muted }}>
              Keyword gap analysis, backlink opportunities, and competitor top pages.
            </p>
            <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.placeholder, marginTop: space['1'] }}>
              Target: neonsignsdepot.com. Data refreshes weekly from Ahrefs via nsd-integrations.
            </p>
          </div>
          <PageExportBar
            filename="ahrefs-intelligence"
            pdfTitle="Ahrefs Intelligence"
            sections={exportSections}
            loading={false}
          />
        </div>

        <div style={{ marginBottom: space['6'] }}>
          <CompetitorFilter competitors={competitors ?? []} value={competitor} onChange={setCompetitor} />
        </div>

        <DashboardSection title="Keyword Gap" description="Keywords where competitors rank but neonsignsdepot.com does not (or ranks lower). Identify content and paid search opportunities." index={0}>
          <KeywordGapPanel competitor={competitor} />
        </DashboardSection>

        <DashboardSection title="Backlink Gap" description="Referring domains that link to competitors but not to neonsignsdepot.com. Sorted by domain rating." index={1}>
          <BacklinkGapPanel competitor={competitor} />
        </DashboardSection>

        <DashboardSection title="Top Pages" description="Top-performing competitor pages by organic traffic. Refreshes weekly." index={2}>
          <TopPagesPanel competitor={competitor} />
        </DashboardSection>
      </div>
    </DashboardGuard>
  );
}
