'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { violet, magenta } from '../../../../design/tokens/colors';
import { getClusterOpportunities } from '../../../../lib/seoApi';
import type { SeoOpportunity } from '../../../../lib/seoApi';

const OPPORTUNITY_LABELS: Record<string, string> = {
  optimize_existing_page: 'Optimize Page',
  create_new_page: 'New Page',
  expand_content: 'Expand Content',
};

const OPPORTUNITY_COLORS: Record<string, { bg: string; text: string }> = {
  optimize_existing_page: { bg: '#e8e0f0', text: '#5b2d8e' },
  create_new_page: { bg: '#dbeafe', text: '#1e40af' },
  expand_content: { bg: '#fef3c7', text: '#92400e' },
};

function OpportunitiesContent() {
  const tc = useThemeColors();
  const [opportunities, setOpportunities] = useState<SeoOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getClusterOpportunities()
      .then((data) => { if (!cancelled) { setOpportunities(data); setLoading(false); } })
      .catch((err) => { if (!cancelled) { setError(err.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

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
          data-testid="text-opportunities-title"
        >
          Cluster Opportunities
        </h1>
        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.lg, color: tc.text.muted }}>
          Actionable gaps identified from cluster analysis. Each opportunity links to a recommendation.
        </p>
      </div>

      {loading && (
        <div style={{ padding: space['8'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body }}>
          Loading opportunities...
        </div>
      )}

      {error && (
        <div style={{ padding: space['6'], backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, color: tc.text.primary, fontFamily: fontFamily.body }}>
          Failed to load opportunities: {error}
        </div>
      )}

      {!loading && !error && (
        <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${tc.border.default}` }}>
                {['Cluster Topic', 'Type', 'Impressions', 'Avg Position', 'Suggested Action', ''].map((h) => (
                  <th key={h} style={{ ...tdStyle, fontWeight: fontWeight.medium, color: tc.text.muted, textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {opportunities.map((opp) => {
                const colors = OPPORTUNITY_COLORS[opp.opportunity_type] || { bg: tc.background.muted, text: tc.text.secondary };
                return (
                  <tr key={opp.id} style={{ borderBottom: `1px solid ${tc.border.subtle}` }} data-testid={`row-opportunity-${opp.id}`}>
                    <td style={{ ...tdStyle, fontWeight: fontWeight.medium, color: tc.text.primary }}>{opp.cluster_topic}</td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: `${space['0.5']} ${space['2']}`,
                          borderRadius: radius.DEFAULT,
                          backgroundColor: colors.bg,
                          color: colors.text,
                          fontSize: fontSize.sm,
                          fontWeight: fontWeight.medium,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {OPPORTUNITY_LABELS[opp.opportunity_type] || opp.opportunity_type}
                      </span>
                    </td>
                    <td style={tdStyle}>{opp.total_impressions.toLocaleString()}</td>
                    <td style={tdStyle}>{opp.avg_position.toFixed(1)}</td>
                    <td style={{ ...tdStyle, maxWidth: '300px' }}>{opp.suggested_action}</td>
                    <td style={tdStyle}>
                      <Link
                        href="/dashboard/seo/recommendations"
                        style={{
                          fontFamily: fontFamily.body,
                          fontSize: fontSize.sm,
                          fontWeight: fontWeight.medium,
                          color: violet[500],
                          textDecoration: 'none',
                        }}
                        data-testid={`link-view-recommendation-${opp.id}`}
                      >
                        View Recommendation
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {opportunities.length === 0 && (
            <div style={{ padding: space['8'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body }}>
              No opportunities found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SeoOpportunitiesPage() {
  return (
    <DashboardGuard dashboard="seo" fallback={<AccessDenied />}>
      <OpportunitiesContent />
    </DashboardGuard>
  );
}
