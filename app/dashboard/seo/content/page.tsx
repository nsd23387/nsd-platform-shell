'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';

// =============================================================================
// Types
// =============================================================================

interface PageBrief {
  id: string;
  cluster_id: string | null;
  cluster_keyword: string | null;
  target_keyword: string;
  suggested_title: string | null;
  status: string;
  total_word_count_target: number;
  wp_draft_url: string | null;
  trigger_source: string | null;
  created_at: string;
}

interface CompetitorGap {
  id: string;
  competitor_url: string;
  gap_type: string;
  keyword: string | null;
  competitor_ranking_position: number | null;
  our_ranking_position: number | null;
  competitor_page_url: string | null;
  cluster_keyword: string | null;
  opportunity_score: number | null;
  status: string;
  discovered_at: string;
}

// =============================================================================
// Status Badges
// =============================================================================

const BRIEF_STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  draft: { bg: '#f5f5f5', text: '#525252' },
  ready: { bg: '#dbeafe', text: '#1e40af' },
  published: { bg: '#d1fae5', text: '#065f46' },
  rejected: { bg: '#fee2e2', text: '#991b1b' },
};

const GAP_TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  keyword: { bg: '#e0e7ff', text: '#3730a3' },
  content: { bg: '#fef3c7', text: '#92400e' },
};

function Badge({ label, colors }: { label: string; colors: { bg: string; text: string } }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: `${space['0.5']} ${space['2']}`,
      borderRadius: radius.full,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      backgroundColor: colors.bg,
      color: colors.text,
      fontFamily: fontFamily.body,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

// =============================================================================
// Content Pipeline Page
// =============================================================================

function ContentPipelineContent() {
  const tc = useThemeColors();
  const [briefs, setBriefs] = useState<PageBrief[]>([]);
  const [gaps, setGaps] = useState<CompetitorGap[]>([]);
  const [loadingBriefs, setLoadingBriefs] = useState(true);
  const [loadingGaps, setLoadingGaps] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBriefs = useCallback(() => {
    setLoadingBriefs(true);
    fetch('/api/proxy/seo/page-briefs')
      .then(r => r.json())
      .then(data => { setBriefs(data.data ?? []); setLoadingBriefs(false); })
      .catch(err => { setError(err.message); setLoadingBriefs(false); });
  }, []);

  const loadGaps = useCallback(() => {
    setLoadingGaps(true);
    fetch('/api/proxy/seo/competitor-gaps')
      .then(r => r.json())
      .then(data => { setGaps(data.data ?? []); setLoadingGaps(false); })
      .catch(err => { setError(err.message); setLoadingGaps(false); });
  }, []);

  useEffect(() => { loadBriefs(); loadGaps(); }, [loadBriefs, loadGaps]);

  const handleBriefAction = async (briefId: string, action: string) => {
    try {
      await fetch('/api/proxy/seo/page-briefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-status', briefId, status: action }),
      });
      loadBriefs();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to update brief:', err);
    }
  };

  const handleCreateBriefFromGap = async (gap: CompetitorGap) => {
    try {
      await fetch('/api/proxy/seo/page-briefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          targetKeyword: gap.keyword || gap.cluster_keyword || 'unknown',
          clusterId: gap.id, // TODO: Use actual cluster_id from gap
          triggerSource: 'manual',
        }),
      });
      loadBriefs();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to create brief from gap:', err);
    }
  };

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
          SEO Intelligence / Optimization
        </p>
        <h1
          style={{ fontFamily: fontFamily.display, fontSize: fontSize['2xl'], fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['1'], lineHeight: lineHeight.snug }}
          data-testid="text-content-pipeline-title"
        >
          Content Pipeline
        </h1>
        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.lg, color: tc.text.muted }}>
          Page briefs for content creation and competitor gap analysis.
        </p>
      </div>

      {error && (
        <div style={{ padding: space['4'], backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, color: '#991b1b', fontFamily: fontFamily.body, marginBottom: space['4'] }}>
          Error: {error}
        </div>
      )}

      {/* Page Briefs Section */}
      <div style={{ marginBottom: space['8'] }}>
        <h2 style={{ fontFamily: fontFamily.display, fontSize: fontSize.xl, fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['4'] }}>
          Page Briefs
        </h2>

        {loadingBriefs && (
          <div style={{ padding: space['8'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body }}>
            Loading briefs...
          </div>
        )}

        {!loadingBriefs && briefs.length === 0 && (
          <div style={{ padding: space['8'], backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, textAlign: 'center' }}>
            <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, fontWeight: fontWeight.medium, color: tc.text.secondary, marginBottom: space['2'] }}>
              No page briefs yet
            </p>
            <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>
              Briefs are auto-generated from cluster opportunities or created manually from competitor gaps.
            </p>
          </div>
        )}

        {!loadingBriefs && briefs.length > 0 && (
          <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${tc.border.default}` }}>
                  {['Target Keyword', 'Cluster', 'Status', 'Words', 'WP Draft', 'Created', 'Actions'].map(h => (
                    <th key={h} style={{ ...tdStyle, fontWeight: fontWeight.medium, color: tc.text.muted, textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {briefs.map(brief => (
                  <tr key={brief.id} style={{ borderBottom: `1px solid ${tc.border.subtle}` }} data-testid={`row-brief-${brief.id}`}>
                    <td style={{ ...tdStyle, fontWeight: fontWeight.medium, color: tc.text.primary }}>{brief.target_keyword}</td>
                    <td style={tdStyle}>{brief.cluster_keyword || '—'}</td>
                    <td style={tdStyle}><Badge label={brief.status} colors={BRIEF_STATUS_STYLES[brief.status] || BRIEF_STATUS_STYLES.draft} /></td>
                    <td style={tdStyle}>{brief.total_word_count_target}</td>
                    <td style={tdStyle}>
                      {brief.wp_draft_url
                        ? <a href={brief.wp_draft_url} target="_blank" rel="noopener noreferrer" style={{ color: '#3730a3', textDecoration: 'underline' }}>View Draft</a>
                        : '—'}
                    </td>
                    <td style={tdStyle}>{new Date(brief.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                    <td style={tdStyle}>
                      {brief.status === 'draft' && (
                        <button
                          onClick={() => handleBriefAction(brief.id, 'ready')}
                          style={{
                            padding: `${space['0.5']} ${space['2']}`,
                            fontFamily: fontFamily.body, fontSize: '11px', fontWeight: fontWeight.medium,
                            color: '#1e40af', backgroundColor: '#dbeafe',
                            border: 'none', borderRadius: radius.md, cursor: 'pointer',
                          }}
                        >
                          Mark Ready
                        </button>
                      )}
                      {brief.status === 'ready' && (
                        <button
                          onClick={() => handleBriefAction(brief.id, 'published')}
                          style={{
                            padding: `${space['0.5']} ${space['2']}`,
                            fontFamily: fontFamily.body, fontSize: '11px', fontWeight: fontWeight.medium,
                            color: '#065f46', backgroundColor: '#d1fae5',
                            border: 'none', borderRadius: radius.md, cursor: 'pointer',
                          }}
                        >
                          Push to WP
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Competitor Gaps Section */}
      <div>
        <h2 style={{ fontFamily: fontFamily.display, fontSize: fontSize.xl, fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['4'] }}>
          Competitor Gaps
        </h2>

        {loadingGaps && (
          <div style={{ padding: space['8'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body }}>
            Loading gaps...
          </div>
        )}

        {!loadingGaps && gaps.length === 0 && (
          <div style={{ padding: space['8'], backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, textAlign: 'center' }}>
            <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, fontWeight: fontWeight.medium, color: tc.text.secondary, marginBottom: space['2'] }}>
              No competitor gaps detected yet
            </p>
            <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>
              Gap detection runs daily at 05:00 UTC using Ahrefs keyword data.
            </p>
          </div>
        )}

        {!loadingGaps && gaps.length > 0 && (
          <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${tc.border.default}` }}>
                  {['Type', 'Competitor', 'Keyword / Page', 'Their Pos', 'Our Pos', 'Score', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ ...tdStyle, fontWeight: fontWeight.medium, color: tc.text.muted, textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gaps.map(gap => (
                  <tr key={gap.id} style={{ borderBottom: `1px solid ${tc.border.subtle}` }} data-testid={`row-gap-${gap.id}`}>
                    <td style={tdStyle}><Badge label={gap.gap_type} colors={GAP_TYPE_STYLES[gap.gap_type] || GAP_TYPE_STYLES.keyword} /></td>
                    <td style={tdStyle}>{gap.competitor_url}</td>
                    <td style={{ ...tdStyle, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {gap.keyword || gap.cluster_keyword || '—'}
                    </td>
                    <td style={tdStyle}>{gap.competitor_ranking_position ?? '—'}</td>
                    <td style={tdStyle}>{gap.our_ranking_position ?? <span style={{ color: '#991b1b' }}>Not ranking</span>}</td>
                    <td style={tdStyle}>{gap.opportunity_score != null ? Number(gap.opportunity_score).toFixed(2) : '—'}</td>
                    <td style={tdStyle}><Badge label={gap.status} colors={gap.status === 'new' ? { bg: '#dbeafe', text: '#1e40af' } : { bg: '#f5f5f5', text: '#525252' }} /></td>
                    <td style={tdStyle}>
                      {gap.status === 'new' && (
                        <div style={{ display: 'flex', gap: space['1'] }}>
                          <button
                            onClick={() => handleCreateBriefFromGap(gap)}
                            style={{
                              padding: `${space['0.5']} ${space['2']}`,
                              fontFamily: fontFamily.body, fontSize: '11px', fontWeight: fontWeight.medium,
                              color: '#065f46', backgroundColor: '#d1fae5',
                              border: 'none', borderRadius: radius.md, cursor: 'pointer',
                            }}
                          >
                            Create Brief
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
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
