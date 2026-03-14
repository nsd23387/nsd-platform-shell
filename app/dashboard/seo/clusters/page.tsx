'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { getClusters, getClusterMembers } from '../../../../lib/seoApi';
import type { SeoCluster, SeoClusterDetail } from '../../../../lib/seoApi';
import { ClusterDetailDrawer } from '../components/ClusterDetailDrawer';

function ClustersContent() {
  const tc = useThemeColors();
  const [clusters, setClusters] = useState<SeoCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<SeoClusterDetail | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getClusters()
      .then((data) => { if (!cancelled) { setClusters(data); setLoading(false); } })
      .catch((err) => { if (!cancelled) { setError(err.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  const handleRowClick = useCallback(async (clusterId: string) => {
    setDrawerLoading(true);
    try {
      const detail = await getClusterMembers(clusterId);
      setSelectedCluster(detail);
    } catch (err: any) {
      setSelectedCluster(null);
    }
    setDrawerLoading(false);
  }, []);

  const [sortCol, setSortCol] = useState<string>('total_impressions');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  const sorted = [...clusters].sort((a, b) => {
    const av = (a as any)[sortCol] ?? 0;
    const bv = (b as any)[sortCol] ?? 0;
    return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
  });

  const thStyle = (col: string): React.CSSProperties => ({
    padding: `${space['3']} ${space['4']}`,
    textAlign: 'left' as const,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: sortCol === col ? tc.text.primary : tc.text.muted,
    cursor: 'pointer',
    userSelect: 'none' as const,
  });

  const tdStyle: React.CSSProperties = {
    padding: `${space['3']} ${space['4']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: tc.text.secondary,
  };

  return (
    <div>
      <div style={{ marginBottom: space['6'] }}>
        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, marginBottom: space['2'] }}>
          SEO Intelligence / Analysis
        </p>
        <h1
          style={{ fontFamily: fontFamily.display, fontSize: fontSize['2xl'], fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['1'], lineHeight: lineHeight.snug }}
          data-testid="text-clusters-title"
        >
          Keyword Clusters
        </h1>
        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.lg, color: tc.text.muted }}>
          Grouped keyword themes from Search Console data. Click a row to view members.
        </p>
      </div>

      {loading && (
        <div style={{ padding: space['8'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body }}>
          Loading clusters...
        </div>
      )}

      {error && (
        <div style={{ padding: space['6'], backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, color: tc.text.primary, fontFamily: fontFamily.body }}>
          Failed to load clusters: {error}
        </div>
      )}

      {!loading && !error && (
        <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${tc.border.default}` }}>
                <th style={thStyle('cluster_topic')} onClick={() => handleSort('cluster_topic')} data-testid="th-sort-cluster-topic">Cluster Topic {sortCol === 'cluster_topic' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                <th style={thStyle('keyword_count')} onClick={() => handleSort('keyword_count')} data-testid="th-sort-keyword-count">Keywords {sortCol === 'keyword_count' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                <th style={thStyle('total_impressions')} onClick={() => handleSort('total_impressions')} data-testid="th-sort-impressions">Impressions {sortCol === 'total_impressions' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                <th style={thStyle('avg_position')} onClick={() => handleSort('avg_position')} data-testid="th-sort-avg-position">Avg Position {sortCol === 'avg_position' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                <th style={thStyle('avg_ctr')} onClick={() => handleSort('avg_ctr')} data-testid="th-sort-ctr">CTR {sortCol === 'avg_ctr' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                <th style={{ ...thStyle(''), cursor: 'default' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => handleRowClick(c.id)}
                  style={{ borderBottom: `1px solid ${tc.border.subtle}`, cursor: 'pointer', transition: 'background-color 150ms' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = tc.background.hover; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                  data-testid={`row-cluster-${c.id}`}
                >
                  <td style={{ ...tdStyle, fontWeight: fontWeight.medium, color: tc.text.primary }}>{c.cluster_topic}</td>
                  <td style={tdStyle}>{c.keyword_count}</td>
                  <td style={tdStyle}>{c.total_impressions.toLocaleString()}</td>
                  <td style={tdStyle}>{c.avg_position.toFixed(1)}</td>
                  <td style={tdStyle}>{c.avg_ctr.toFixed(1)}%</td>
                  <td style={tdStyle}>
                    <span style={{ color: tc.text.muted, fontSize: fontSize.sm }}>View details</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(selectedCluster || drawerLoading) && (
        <ClusterDetailDrawer
          cluster={selectedCluster}
          loading={drawerLoading}
          onClose={() => setSelectedCluster(null)}
        />
      )}
    </div>
  );
}

export default function SeoClustersPage() {
  return (
    <DashboardGuard dashboard="seo" fallback={<AccessDenied />}>
      <ClustersContent />
    </DashboardGuard>
  );
}
