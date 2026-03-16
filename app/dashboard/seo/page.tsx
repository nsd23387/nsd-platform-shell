'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardGuard } from '../../../hooks/useRBAC';
import { AccessDenied, DashboardCard } from '../../../components/dashboard';
import { DashboardGrid } from '../../../components/dashboard/DashboardGrid';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../design/tokens/typography';
import { space, radius } from '../../../design/tokens/spacing';
import { violet, indigo, magenta } from '../../../design/tokens/colors';
import { getSeoOverviewKpis, getPagePerformance, getPageOptimizations, getCompetitiveKeywordGap, getClusterPriorities } from '../../../lib/seoApi';
import type { SeoOverviewKpis, PageQueryPerformance, PageOptimizationRec, AhrefsKeywordGap, ClusterPriority } from '../../../lib/seoApi';

function SeoOverviewContent() {
  const tc = useThemeColors();
  const [kpis, setKpis] = useState<SeoOverviewKpis | null>(null);
  const [topPages, setTopPages] = useState<PageQueryPerformance[]>([]);
  const [pageOpts, setPageOpts] = useState<PageOptimizationRec[]>([]);
  const [kwGap, setKwGap] = useState<AhrefsKeywordGap[]>([]);
  const [priorities, setPriorities] = useState<ClusterPriority[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [k, tp, po, kg, cp] = await Promise.all([
          getSeoOverviewKpis(),
          getPagePerformance('impressions', 5),
          getPageOptimizations(),
          getCompetitiveKeywordGap(),
          getClusterPriorities(5),
        ]);
        if (!cancelled) {
          setKpis(k); setTopPages(tp); setPageOpts(po); setKwGap(kg); setPriorities(cp);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!cancelled) { setError(err instanceof Error ? err.message : 'Unknown error'); setLoading(false); }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const headerStyle = { padding: `${space['3']} ${space['4']}`, textAlign: 'left' as const, fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: tc.text.muted };
  const cellStyle = { padding: `${space['3']} ${space['4']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.secondary };

  const sectionTitle = (title: string, href: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: space['4'] }}>
      <h2 style={{ fontFamily: fontFamily.display, fontSize: fontSize.xl, fontWeight: fontWeight.semibold, color: tc.text.secondary }}>
        {title}
      </h2>
      <Link href={href} style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: violet[500], textDecoration: 'none' }}>
        View all
      </Link>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: space['6'] }}>
        <h1 style={{ fontFamily: fontFamily.display, fontSize: fontSize['2xl'], fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['1'], lineHeight: lineHeight.snug }} data-testid="text-seo-overview-title">
          SEO Command Center
        </h1>
        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.lg, color: tc.text.muted, lineHeight: lineHeight.normal }}>
          Cluster analysis, competitive intelligence, page optimization, and content pipeline.
        </p>
      </div>

      <DashboardGrid columns={4}>
        <DashboardCard title="Keyword Clusters" value={loading ? undefined : String(kpis?.total_clusters ?? 0)} subtitle="Grouped keyword themes" loading={loading} error={error} />
        <DashboardCard title="Indexed Pages" value={loading ? undefined : String(kpis?.indexed_pages ?? 0)} subtitle="Pages in site index" loading={loading} error={error} />
        <DashboardCard title="Page Opt. Recs" value={loading ? undefined : String(kpis?.page_optimization_recs ?? 0)} subtitle="Title/meta suggestions" loading={loading} error={error} />
        <DashboardCard title="Ahrefs Keywords" value={loading ? undefined : String(kpis?.ahrefs_keywords_tracked ?? 0)} subtitle="Competitive gap tracked" loading={loading} error={error} />
      </DashboardGrid>

      <DashboardGrid columns={4}>
        <DashboardCard title="Opportunities" value={loading ? undefined : String(kpis?.total_opportunities ?? 0)} subtitle="Actionable gaps" loading={loading} error={error} />
        <DashboardCard title="Pending Review" value={loading ? undefined : String(kpis?.recommendations_pending ?? 0)} subtitle="Awaiting approval" loading={loading} error={error} variant={(kpis?.recommendations_pending ?? 0) > 0 ? 'warning' : 'default'} />
        <DashboardCard title="Internal Links" value={loading ? undefined : String(kpis?.internal_link_recs ?? 0)} subtitle="Linking suggestions" loading={loading} error={error} />
        <DashboardCard title="Content Artifacts" value={loading ? undefined : String(kpis?.content_artifacts ?? 0)} subtitle="Generated briefs" loading={loading} error={error} />
      </DashboardGrid>

      {!loading && !error && (
        <>
          {topPages.length > 0 && (
            <div style={{ marginTop: space['8'] }}>
              {sectionTitle('Top Page-Query Performance', '/dashboard/seo/pages')}
              <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${tc.border.default}` }}>
                      {['URL', 'Query', 'Impressions', 'Clicks', 'Position'].map(h => (
                        <th key={h} style={headerStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topPages.map((r, i) => (
                      <tr key={`${r.url}-${r.query}-${i}`} style={{ borderBottom: `1px solid ${tc.border.subtle}` }} data-testid={`row-top-page-${i}`}>
                        <td style={{ ...cellStyle, fontWeight: fontWeight.medium, color: tc.text.primary, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.url}>{r.url}</td>
                        <td style={{ ...cellStyle, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.query}>{r.query}</td>
                        <td style={cellStyle}>{r.impressions.toLocaleString()}</td>
                        <td style={cellStyle}>{r.clicks.toLocaleString()}</td>
                        <td style={cellStyle}>
                          <span style={{
                            display: 'inline-block', padding: `${space['0.5']} ${space['2']}`,
                            borderRadius: radius.full, fontSize: fontSize.sm, fontWeight: fontWeight.medium,
                            backgroundColor: r.position <= 10 ? `${violet[500]}15` : 'transparent',
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
            </div>
          )}

          {pageOpts.length > 0 && (
            <div style={{ marginTop: space['8'] }}>
              {sectionTitle('Pending Page Optimizations', '/dashboard/seo/recommendations')}
              <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${tc.border.default}` }}>
                      {['URL', 'Primary Keyword', 'Type', 'Recommended Title', 'Priority'].map(h => (
                        <th key={h} style={headerStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageOpts.slice(0, 5).map((r, i) => (
                      <tr key={r.id} style={{ borderBottom: `1px solid ${tc.border.subtle}` }} data-testid={`row-page-opt-${i}`}>
                        <td style={{ ...cellStyle, fontWeight: fontWeight.medium, color: tc.text.primary, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.url}>{r.url.replace('https://neonsignsdepot.com', '')}</td>
                        <td style={cellStyle}>{r.primary_keyword}</td>
                        <td style={cellStyle}>
                          <span style={{
                            display: 'inline-block', padding: `${space['0.5']} ${space['2']}`,
                            borderRadius: radius.full, fontSize: fontSize.sm,
                            backgroundColor: `${indigo[500]}15`, color: indigo[500],
                          }}>
                            {r.optimization_type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ ...cellStyle, maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.recommended_title}>{r.recommended_title}</td>
                        <td style={cellStyle}>{r.priority_score.toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {kwGap.length > 0 && (
            <div style={{ marginTop: space['8'] }}>
              {sectionTitle('Top Competitive Keyword Gaps', '/dashboard/seo/competitive')}
              <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${tc.border.default}` }}>
                      {['Keyword', 'Competitor', 'Volume', 'KD', 'CPC'].map(h => (
                        <th key={h} style={headerStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {kwGap.slice(0, 5).map((r, i) => (
                      <tr key={`${r.keyword}-${r.competitor_domain}-${i}`} style={{ borderBottom: `1px solid ${tc.border.subtle}` }} data-testid={`row-kw-gap-${i}`}>
                        <td style={{ ...cellStyle, fontWeight: fontWeight.medium, color: tc.text.primary }}>{r.keyword}</td>
                        <td style={cellStyle}>{r.competitor_domain}</td>
                        <td style={cellStyle}>{r.volume.toLocaleString()}</td>
                        <td style={cellStyle}>
                          <span style={{
                            display: 'inline-block', padding: `${space['0.5']} ${space['2']}`,
                            borderRadius: radius.full, fontSize: fontSize.sm, fontWeight: fontWeight.medium,
                            backgroundColor: r.keyword_difficulty >= 70 ? `${magenta[500]}15` : r.keyword_difficulty >= 40 ? `${indigo[500]}15` : `${violet[500]}15`,
                            color: r.keyword_difficulty >= 70 ? magenta[500] : r.keyword_difficulty >= 40 ? indigo[500] : violet[500],
                          }}>
                            {r.keyword_difficulty}
                          </span>
                        </td>
                        <td style={cellStyle}>${r.cpc.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {priorities.length > 0 && (
            <div style={{ marginTop: space['8'] }}>
              {sectionTitle('Top Priority Clusters', '/dashboard/seo/clusters')}
              <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${tc.border.default}` }}>
                      {['Cluster', 'Priority Score', 'Impressions', 'Avg Position', 'Keywords'].map(h => (
                        <th key={h} style={headerStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {priorities.map((r, i) => (
                      <tr key={r.cluster_id} style={{ borderBottom: `1px solid ${tc.border.subtle}` }} data-testid={`row-priority-${i}`}>
                        <td style={{ ...cellStyle, fontWeight: fontWeight.medium, color: tc.text.primary }}>{r.cluster_keyword}</td>
                        <td style={cellStyle}>
                          <span style={{
                            display: 'inline-block', padding: `${space['0.5']} ${space['2']}`,
                            borderRadius: radius.full, fontSize: fontSize.sm, fontWeight: fontWeight.medium,
                            backgroundColor: r.seo_priority_score >= 100 ? `${violet[500]}15` : 'transparent',
                            color: r.seo_priority_score >= 100 ? violet[600] : tc.text.secondary,
                          }}>
                            {r.seo_priority_score.toFixed(1)}
                          </span>
                        </td>
                        <td style={cellStyle}>{r.total_impressions.toLocaleString()}</td>
                        <td style={cellStyle}>{r.avg_position.toFixed(1)}</td>
                        <td style={cellStyle}>{r.keyword_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function SeoOverviewPage() {
  return (
    <DashboardGuard dashboard="seo" fallback={<AccessDenied />}>
      <SeoOverviewContent />
    </DashboardGuard>
  );
}
