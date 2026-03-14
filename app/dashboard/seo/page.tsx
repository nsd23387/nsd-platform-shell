'use client';

import React, { useEffect, useState } from 'react';
import { DashboardGuard } from '../../../hooks/useRBAC';
import { AccessDenied, DashboardCard } from '../../../components/dashboard';
import { DashboardGrid } from '../../../components/dashboard/DashboardGrid';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../design/tokens/typography';
import { space, radius } from '../../../design/tokens/spacing';
import { getClusters, getClusterOpportunities, getRecommendations } from '../../../lib/seoApi';
import type { SeoCluster, SeoOpportunity, SeoRecommendation } from '../../../lib/seoApi';

function SeoOverviewContent() {
  const tc = useThemeColors();
  const [clusters, setClusters] = useState<SeoCluster[]>([]);
  const [opportunities, setOpportunities] = useState<SeoOpportunity[]>([]);
  const [recommendations, setRecommendations] = useState<SeoRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [c, o, r] = await Promise.all([
          getClusters(),
          getClusterOpportunities(),
          getRecommendations(),
        ]);
        if (!cancelled) {
          setClusters(c);
          setOpportunities(o);
          setRecommendations(r);
          setLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const pendingCount = recommendations.filter((r) => r.status === 'pending_review').length;
  const approvedCount = recommendations.filter((r) => r.status === 'approved').length;

  return (
    <div>
      <div style={{ marginBottom: space['6'] }}>
        <h1
          style={{
            fontFamily: fontFamily.display,
            fontSize: fontSize['2xl'],
            fontWeight: fontWeight.semibold,
            color: tc.text.primary,
            marginBottom: space['1'],
            lineHeight: lineHeight.snug,
          }}
          data-testid="text-seo-overview-title"
        >
          SEO Intelligence
        </h1>
        <p
          style={{
            fontFamily: fontFamily.body,
            fontSize: fontSize.lg,
            color: tc.text.muted,
            lineHeight: lineHeight.normal,
          }}
        >
          Keyword cluster analysis, opportunities, and recommendation workflow.
        </p>
      </div>

      <DashboardGrid columns={4}>
        <DashboardCard
          title="Total Clusters"
          value={loading ? undefined : String(clusters.length)}
          subtitle="Keyword groups identified"
          loading={loading}
          error={error}
        />
        <DashboardCard
          title="Opportunities"
          value={loading ? undefined : String(opportunities.length)}
          subtitle="Actionable cluster gaps"
          loading={loading}
          error={error}
        />
        <DashboardCard
          title="Pending Review"
          value={loading ? undefined : String(pendingCount)}
          subtitle="Awaiting approval"
          loading={loading}
          error={error}
          variant={pendingCount > 0 ? 'warning' : 'default'}
        />
        <DashboardCard
          title="Approved"
          value={loading ? undefined : String(approvedCount)}
          subtitle="Ready for execution"
          loading={loading}
          error={error}
          variant={approvedCount > 0 ? 'success' : 'default'}
        />
      </DashboardGrid>

      {!loading && !error && clusters.length > 0 && (
        <div style={{ marginTop: space['8'] }}>
          <h2
            style={{
              fontFamily: fontFamily.display,
              fontSize: fontSize.xl,
              fontWeight: fontWeight.semibold,
              color: tc.text.secondary,
              marginBottom: space['4'],
            }}
          >
            Top Clusters by Impressions
          </h2>
          <div
            style={{
              backgroundColor: tc.background.surface,
              border: `1px solid ${tc.border.default}`,
              borderRadius: radius.lg,
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${tc.border.default}` }}>
                  {['Cluster Topic', 'Keywords', 'Impressions', 'Avg Position', 'CTR'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: `${space['3']} ${space['4']}`,
                        textAlign: 'left',
                        fontFamily: fontFamily.body,
                        fontSize: fontSize.sm,
                        fontWeight: fontWeight.medium,
                        color: tc.text.muted,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clusters.slice(0, 5).map((c) => (
                  <tr
                    key={c.id}
                    style={{ borderBottom: `1px solid ${tc.border.subtle}` }}
                    data-testid={`row-cluster-${c.id}`}
                  >
                    <td style={{ padding: `${space['3']} ${space['4']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: tc.text.primary }}>{c.cluster_topic}</td>
                    <td style={{ padding: `${space['3']} ${space['4']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.secondary }}>{c.keyword_count}</td>
                    <td style={{ padding: `${space['3']} ${space['4']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.secondary }}>{c.total_impressions.toLocaleString()}</td>
                    <td style={{ padding: `${space['3']} ${space['4']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.secondary }}>{c.avg_position.toFixed(1)}</td>
                    <td style={{ padding: `${space['3']} ${space['4']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.secondary }}>{c.avg_ctr.toFixed(1)}%</td>
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

export default function SeoOverviewPage() {
  return (
    <DashboardGuard dashboard="seo" fallback={<AccessDenied />}>
      <SeoOverviewContent />
    </DashboardGuard>
  );
}
