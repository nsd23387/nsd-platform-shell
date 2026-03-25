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
        <DashboardCard title="Engine Opportunities" value={loading ? undefined : String(kpis?.total_opportunities ?? 0)} subtitle="Scored and ranked" loading={loading} error={error} />
        <DashboardCard title="Topic Clusters" value={loading ? undefined : String(kpis?.total_clusters ?? 0)} subtitle="Unique keyword themes" loading={loading} error={error} />
        <DashboardCard title="High Urgency" value={loading ? undefined : String(kpis?.high_urgency ?? 0)} subtitle="Immediate action needed" loading={loading} error={error} variant={(kpis?.high_urgency ?? 0) > 0 ? 'warning' : 'default'} />
        <DashboardCard title="Indexed Pages" value={loading ? undefined : String(kpis?.indexed_pages ?? 0)} subtitle="Pages in site index" loading={loading} error={error} />
      </DashboardGrid>

      <DashboardGrid columns={4}>
        <DashboardCard title="Pending Manual Review" value={loading ? undefined : String(kpis?.awaiting_approval ?? 0)} subtitle="Needs human approval" loading={loading} error={error} variant={(kpis?.awaiting_approval ?? 0) > 0 ? 'warning' : 'default'} />
        <DashboardCard title="Auto-Approved (Today)" value={loading ? undefined : String(kpis?.auto_approved_today ?? 0)} subtitle="High-confidence auto tier" loading={loading} error={error} />
        <DashboardCard title="Execution Queue" value={loading ? undefined : String(kpis?.approved ?? 0)} subtitle="Approved, awaiting apply" loading={loading} error={error} />
        <DashboardCard title="Published" value={loading ? undefined : String(kpis?.published ?? 0)} subtitle="Live on WordPress" loading={loading} error={error} />
      </DashboardGrid>

      <DashboardGrid columns={4}>
        <DashboardCard title="Internal Links" value={loading ? undefined : String(kpis?.internal_link_recs ?? 0)} subtitle="Linking suggestions" loading={loading} error={error} />
        <DashboardCard title="Ahrefs Keywords" value={loading ? undefined : String(kpis?.ahrefs_keywords_tracked ?? 0)} subtitle="Competitive gap tracked" loading={loading} error={error} />
        <DashboardCard title="Content Artifacts" value={loading ? undefined : String(kpis?.content_artifacts ?? 0)} subtitle="Generated briefs" loading={loading} error={error} />
        <DashboardCard title="Execution Total" value={loading ? undefined : String(kpis?.execution_candidates_total ?? 0)} subtitle="All-time candidates" loading={loading} error={error} />
      </DashboardGrid>

      {/* Pipeline Status & Kill Switch panels */}
      {!loading && !error && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: space['4'], marginTop: space['6'] }}>
          <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, padding: space['4'] }}>
            <h3 style={{ fontFamily: fontFamily.display, fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['3'] }}>
              Nightly Pipeline
            </h3>
            {[
              { label: 'Cluster Generation', time: '03:00 UTC' },
              { label: 'Revalidation Sweep', time: '03:30 UTC' },
              { label: 'Measurement Loop', time: '04:00 UTC' },
            ].map((job) => (
              <div key={job.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${space['1.5']} 0`, borderBottom: `1px solid ${tc.border.subtle}` }}>
                <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.secondary }}>{job.label}</span>
                <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.placeholder }}>
                  {kpis?.last_pipeline_run_at
                    ? `Last: ${new Date(kpis.last_pipeline_run_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                    : `Scheduled ${job.time}`}
                </span>
              </div>
            ))}
          </div>

          <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, padding: space['4'] }}>
            <h3 style={{ fontFamily: fontFamily.display, fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['3'] }}>
              Auto-Approve Status
            </h3>
            {(() => {
              const envOn = kpis?.seo_auto_execute_env ?? false;
              const dbOn = kpis?.auto_approve_enabled ?? false;
              const cap = kpis?.auto_approve_daily_cap ?? 25;
              const used = kpis?.auto_approved_today ?? 0;
              const minScore = kpis?.auto_approve_min_score ?? 7.0;
              const rows = [
                { label: 'SEO_AUTO_EXECUTE_ENABLED', value: envOn ? 'ON' : 'OFF', color: envOn ? '#065f46' : '#991b1b', bg: envOn ? '#d1fae5' : '#fee2e2' },
                { label: 'auto_approve_enabled (DB)', value: dbOn ? 'ON' : 'OFF', color: dbOn ? '#065f46' : '#991b1b', bg: dbOn ? '#d1fae5' : '#fee2e2' },
                { label: 'Daily Cap', value: `${used}/${cap} used today`, color: tc.text.secondary, bg: 'transparent' },
                { label: 'Min Score Threshold', value: String(minScore), color: tc.text.secondary, bg: 'transparent' },
              ];
              return rows.map((row) => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${space['1.5']} 0`, borderBottom: `1px solid ${tc.border.subtle}` }}>
                  <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.secondary }}>{row.label}</span>
                  <span style={{
                    fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium,
                    color: row.color,
                    backgroundColor: row.bg,
                    padding: row.bg !== 'transparent' ? `${space['0.5']} ${space['2']}` : '0',
                    borderRadius: row.bg !== 'transparent' ? radius.full : '0',
                  }}>
                    {row.value}
                  </span>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

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
                            {Number(r.position || 0).toFixed(1)}
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
                        <td style={{ ...cellStyle, fontWeight: fontWeight.medium, color: tc.text.primary, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.url}>{(r.url || '').replace('https://neonsignsdepot.com', '')}</td>
                        <td style={cellStyle}>{r.primary_keyword}</td>
                        <td style={cellStyle}>
                          <span style={{
                            display: 'inline-block', padding: `${space['0.5']} ${space['2']}`,
                            borderRadius: radius.full, fontSize: fontSize.sm,
                            backgroundColor: `${indigo[500]}15`, color: indigo[500],
                          }}>
                            {(r.optimization_type || '').replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ ...cellStyle, maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.recommended_title}>{r.recommended_title}</td>
                        <td style={cellStyle}>{Number(r.priority_score || 0).toFixed(0)}</td>
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
                        <td style={cellStyle}>${Number(r.cpc || 0).toFixed(2)}</td>
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
                            {Number(r.seo_priority_score || 0).toFixed(1)}
                          </span>
                        </td>
                        <td style={cellStyle}>{Number(r.total_impressions || 0).toLocaleString()}</td>
                        <td style={cellStyle}>{Number(r.avg_position || 0).toFixed(1)}</td>
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
