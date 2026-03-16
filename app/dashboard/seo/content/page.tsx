'use client';

import React, { useEffect, useState } from 'react';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { DashboardGrid } from '../../../../components/dashboard/DashboardGrid';
import { DashboardCard } from '../../../../components/dashboard';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { violet, indigo, magenta } from '../../../../design/tokens/colors';
import { getContentPipelineData } from '../../../../lib/seoApi';
import type { ContentPipeline } from '../../../../lib/seoApi';

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    approved: violet[500],
    rejected: magenta[500],
    pending: indigo[500],
    draft: indigo[400],
  };
  const color = colorMap[status] || indigo[400];
  return (
    <span style={{
      display: 'inline-block', padding: `${space['0.5']} ${space['2']}`,
      borderRadius: radius.full, fontSize: fontSize.sm, fontWeight: fontWeight.medium,
      backgroundColor: `${color}15`, color, textTransform: 'capitalize',
    }}>
      {status}
    </span>
  );
}

function ContentPipelineContent() {
  const tc = useThemeColors();
  const [data, setData] = useState<ContentPipeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await getContentPipelineData();
        if (!cancelled) { setData(result); setLoading(false); }
      } catch (err: unknown) {
        if (!cancelled) { setError(err instanceof Error ? err.message : 'Unknown error'); setLoading(false); }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const cellStyle = { padding: `${space['3']} ${space['4']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.secondary };
  const headerStyle = { padding: `${space['3']} ${space['4']}`, textAlign: 'left' as const, fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: tc.text.muted };

  if (loading) return <div style={{ padding: space['8'], color: tc.text.muted, fontFamily: fontFamily.body }}>Loading content pipeline...</div>;
  if (error) return <div style={{ padding: space['8'], color: tc.semantic.danger.dark, fontFamily: fontFamily.body }}>Error: {error}</div>;
  if (!data) return null;

  return (
    <div>
      <div style={{ marginBottom: space['6'] }}>
        <h1 style={{ fontFamily: fontFamily.display, fontSize: fontSize['2xl'], fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['1'], lineHeight: lineHeight.snug }} data-testid="text-content-pipeline-title">
          Content Pipeline
        </h1>
        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.lg, color: tc.text.muted, lineHeight: lineHeight.normal }}>
          AI-generated content artifacts, generation candidates, and event log.
        </p>
      </div>

      <DashboardGrid columns={3}>
        <DashboardCard title="Content Artifacts" value={String(data.artifacts.length)} subtitle="Generated briefs and assets" />
        <DashboardCard title="Generation Candidates" value={String(data.candidates.length)} subtitle="Clusters eligible for generation" />
        <DashboardCard title="Generation Events" value={String(data.events.length)} subtitle="Pipeline activity log" />
      </DashboardGrid>

      {data.artifacts.length > 0 && (
        <div style={{ marginTop: space['8'] }}>
          <h2 style={{ fontFamily: fontFamily.display, fontSize: fontSize.xl, fontWeight: fontWeight.semibold, color: tc.text.secondary, marginBottom: space['4'] }}>
            Content Artifacts
          </h2>
          <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${tc.border.default}` }}>
                  {['Title', 'Type', 'Cluster', 'Status', 'Generator', 'Created'].map(h => (
                    <th key={h} style={headerStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.artifacts.map((a, i) => (
                  <tr key={a.id} style={{ borderBottom: `1px solid ${tc.border.subtle}` }} data-testid={`row-artifact-${i}`}>
                    <td style={{ ...cellStyle, fontWeight: fontWeight.medium, color: tc.text.primary }}>{a.title || '--'}</td>
                    <td style={cellStyle}>{a.artifact_type?.replace(/_/g, ' ')}</td>
                    <td style={cellStyle}>{a.cluster_topic || a.primary_keyword || '--'}</td>
                    <td style={cellStyle}><StatusBadge status={a.status} /></td>
                    <td style={cellStyle}>{a.generated_by?.replace(/_/g, ' ')}</td>
                    <td style={cellStyle}>{new Date(a.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.candidates.length > 0 && (
        <div style={{ marginTop: space['8'] }}>
          <h2 style={{ fontFamily: fontFamily.display, fontSize: fontSize.xl, fontWeight: fontWeight.semibold, color: tc.text.secondary, marginBottom: space['4'] }}>
            Generation Candidates
          </h2>
          <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, marginBottom: space['3'] }}>
            Clusters ranked by SEO priority score, eligible for AI content generation.
          </p>
          <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${tc.border.default}` }}>
                  {['Cluster Keyword', 'Priority Score', 'Impressions', 'Avg Position', 'Keywords'].map(h => (
                    <th key={h} style={headerStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.candidates.map((c, i) => (
                  <tr key={c.cluster_id} style={{ borderBottom: `1px solid ${tc.border.subtle}` }} data-testid={`row-candidate-${i}`}>
                    <td style={{ ...cellStyle, fontWeight: fontWeight.medium, color: tc.text.primary }}>{c.cluster_keyword}</td>
                    <td style={cellStyle}>
                      <span style={{
                        display: 'inline-block', padding: `${space['0.5']} ${space['2']}`,
                        borderRadius: radius.full, fontSize: fontSize.sm, fontWeight: fontWeight.medium,
                        backgroundColor: c.seo_priority_score >= 150 ? `${violet[500]}15` : 'transparent',
                        color: c.seo_priority_score >= 150 ? violet[600] : tc.text.secondary,
                      }}>
                        {c.seo_priority_score.toFixed(1)}
                      </span>
                    </td>
                    <td style={cellStyle}>{c.total_impressions.toLocaleString()}</td>
                    <td style={cellStyle}>{c.avg_position.toFixed(1)}</td>
                    <td style={cellStyle}>{c.keyword_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.events.length > 0 && (
        <div style={{ marginTop: space['8'] }}>
          <h2 style={{ fontFamily: fontFamily.display, fontSize: fontSize.xl, fontWeight: fontWeight.semibold, color: tc.text.secondary, marginBottom: space['4'] }}>
            Recent Generation Events
          </h2>
          <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${tc.border.default}` }}>
                  {['Event Type', 'Model', 'Generator', 'Date'].map(h => (
                    <th key={h} style={headerStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.events.map((e, i) => (
                  <tr key={e.id} style={{ borderBottom: `1px solid ${tc.border.subtle}` }} data-testid={`row-event-${i}`}>
                    <td style={{ ...cellStyle, fontWeight: fontWeight.medium, color: tc.text.primary }}>{e.event_type?.replace(/_/g, ' ')}</td>
                    <td style={cellStyle}>{e.model || '--'}</td>
                    <td style={cellStyle}>{e.generator_version || '--'}</td>
                    <td style={cellStyle}>{new Date(e.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ContentPipelinePage() {
  return (
    <DashboardGuard dashboard="seo" fallback={<AccessDenied />}>
      <ContentPipelineContent />
    </DashboardGuard>
  );
}
