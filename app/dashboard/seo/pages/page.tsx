'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { violet } from '../../../../design/tokens/colors';
import { getPagePerformance } from '../../../../lib/seoApi';
import type { PageQueryPerformance } from '../../../../lib/seoApi';

type SortKey = 'impressions' | 'clicks' | 'ctr' | 'position';

function PagePerformanceContent() {
  const tc = useThemeColors();
  const [data, setData] = useState<PageQueryPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('impressions');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [urlFilter, setUrlFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await getPagePerformance('impressions', 200);
        if (!cancelled) { setData(result); setLoading(false); }
      } catch (err: unknown) {
        if (!cancelled) { setError(err instanceof Error ? err.message : 'Unknown error'); setLoading(false); }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }
    else { setSortKey(key); setSortDir(key === 'position' ? 'asc' : 'desc'); }
  };

  const sorted = useMemo(() => {
    let filtered = data;
    if (urlFilter) {
      filtered = data.filter(r => r.url.toLowerCase().includes(urlFilter.toLowerCase()) || r.query.toLowerCase().includes(urlFilter.toLowerCase()));
    }
    return [...filtered].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [data, sortKey, sortDir, urlFilter]);

  const headerStyle = (key: SortKey) => ({
    padding: `${space['3']} ${space['4']}`,
    textAlign: 'left' as const,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: sortKey === key ? tc.text.primary : tc.text.muted,
    cursor: 'pointer' as const,
    userSelect: 'none' as const,
    whiteSpace: 'nowrap' as const,
  });

  const cellStyle = {
    padding: `${space['3']} ${space['4']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: tc.text.secondary,
  };

  if (loading) return <div style={{ padding: space['8'], color: tc.text.muted, fontFamily: fontFamily.body }}>Loading page performance data...</div>;
  if (error) return <div style={{ padding: space['8'], color: tc.semantic.danger.dark, fontFamily: fontFamily.body }}>Error: {error}</div>;

  return (
    <div>
      <div style={{ marginBottom: space['6'] }}>
        <h1 style={{ fontFamily: fontFamily.display, fontSize: fontSize['2xl'], fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['1'], lineHeight: lineHeight.snug }} data-testid="text-page-performance-title">
          Page Performance
        </h1>
        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.lg, color: tc.text.muted, lineHeight: lineHeight.normal }}>
          Live page-query performance from Search Console. {data.length.toLocaleString()} query-page pairs tracked.
        </p>
      </div>

      <div style={{ marginBottom: space['4'] }}>
        <input
          type="text"
          placeholder="Filter by URL or query..."
          value={urlFilter}
          onChange={(e) => setUrlFilter(e.target.value)}
          style={{
            padding: `${space['2']} ${space['3']}`,
            fontFamily: fontFamily.body,
            fontSize: fontSize.sm,
            color: tc.text.primary,
            backgroundColor: tc.background.surface,
            border: `1px solid ${tc.border.default}`,
            borderRadius: radius.md,
            width: '320px',
            outline: 'none',
          }}
          data-testid="input-page-filter"
        />
      </div>

      <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${tc.border.default}` }}>
              <th style={{ ...headerStyle('impressions'), cursor: 'default', color: tc.text.muted }}>URL</th>
              <th style={{ ...headerStyle('impressions'), cursor: 'default', color: tc.text.muted }}>Query</th>
              <th style={headerStyle('impressions')} onClick={() => handleSort('impressions')}>Impressions {sortKey === 'impressions' ? (sortDir === 'desc' ? '\u25BC' : '\u25B2') : ''}</th>
              <th style={headerStyle('clicks')} onClick={() => handleSort('clicks')}>Clicks {sortKey === 'clicks' ? (sortDir === 'desc' ? '\u25BC' : '\u25B2') : ''}</th>
              <th style={headerStyle('ctr')} onClick={() => handleSort('ctr')}>CTR {sortKey === 'ctr' ? (sortDir === 'desc' ? '\u25BC' : '\u25B2') : ''}</th>
              <th style={headerStyle('position')} onClick={() => handleSort('position')}>Position {sortKey === 'position' ? (sortDir === 'desc' ? '\u25BC' : '\u25B2') : ''}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0, 100).map((r, i) => (
              <tr key={`${r.url}-${r.query}-${i}`} style={{ borderBottom: `1px solid ${tc.border.subtle}` }} data-testid={`row-page-perf-${i}`}>
                <td style={{ ...cellStyle, fontWeight: fontWeight.medium, color: tc.text.primary, maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.url}>{r.url}</td>
                <td style={{ ...cellStyle, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.query}>{r.query}</td>
                <td style={cellStyle}>{r.impressions.toLocaleString()}</td>
                <td style={cellStyle}>{r.clicks.toLocaleString()}</td>
                <td style={cellStyle}>{(r.ctr * 100).toFixed(2)}%</td>
                <td style={cellStyle}>
                  <span style={{
                    display: 'inline-block',
                    padding: `${space['0.5']} ${space['2']}`,
                    borderRadius: radius.full,
                    fontSize: fontSize.sm,
                    fontWeight: fontWeight.medium,
                    backgroundColor: r.position <= 10 ? `${violet[500]}15` : r.position <= 20 ? `${violet[400]}15` : 'transparent',
                    color: r.position <= 10 ? violet[600] : tc.text.secondary,
                  }}>
                    {r.position.toFixed(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sorted.length > 100 && (
        <p style={{ marginTop: space['3'], fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>
          Showing 100 of {sorted.length.toLocaleString()} results. Use the filter to narrow down.
        </p>
      )}
    </div>
  );
}

export default function PagePerformancePage() {
  return (
    <DashboardGuard dashboard="seo" fallback={<AccessDenied />}>
      <PagePerformanceContent />
    </DashboardGuard>
  );
}
