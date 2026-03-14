'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { getRecommendations, approveRecommendation, rejectRecommendation, submitFeedback } from '../../../../lib/seoApi';
import type { SeoRecommendation } from '../../../../lib/seoApi';
import { RecommendationPanel } from '../components/RecommendationPanel';
import { RecommendationFeedbackModal } from '../components/RecommendationFeedbackModal';

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending_review: { bg: '#fef3c7', text: '#92400e', label: 'Pending' },
  approved: { bg: '#d1fae5', text: '#065f46', label: 'Approved' },
  rejected: { bg: '#fee2e2', text: '#991b1b', label: 'Rejected' },
};

function RecommendationsContent() {
  const tc = useThemeColors();
  const [recommendations, setRecommendations] = useState<SeoRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SeoRecommendation | null>(null);
  const [feedbackTarget, setFeedbackTarget] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadData = useCallback(async () => {
    try {
      const data = await getRecommendations();
      setRecommendations(data);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleApprove = useCallback(async (id: string) => {
    setActionLoading(true);
    try {
      await approveRecommendation(id);
      setSelected(null);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
    setActionLoading(false);
  }, [loadData]);

  const handleReject = useCallback(async (id: string) => {
    setActionLoading(true);
    try {
      await rejectRecommendation(id);
      setSelected(null);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
    setActionLoading(false);
  }, [loadData]);

  const handleFeedbackSubmit = useCallback(async (id: string, feedbackText: string) => {
    setActionLoading(true);
    try {
      await submitFeedback(id, feedbackText);
      setFeedbackTarget(null);
      setSelected(null);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
    setActionLoading(false);
  }, [loadData]);

  const filtered = statusFilter === 'all'
    ? recommendations
    : recommendations.filter((r) => r.status === statusFilter);

  const tdStyle: React.CSSProperties = {
    padding: `${space['3']} ${space['4']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: tc.text.secondary,
  };

  const filterBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: `${space['1.5']} ${space['3']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    fontWeight: active ? fontWeight.medium : fontWeight.normal,
    color: active ? tc.text.primary : tc.text.muted,
    backgroundColor: active ? tc.background.muted : 'transparent',
    border: `1px solid ${active ? tc.border.default : 'transparent'}`,
    borderRadius: radius.md,
    cursor: 'pointer',
  });

  return (
    <div>
      <div style={{ marginBottom: space['6'] }}>
        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, marginBottom: space['2'] }}>
          SEO Intelligence / Decisions
        </p>
        <h1
          style={{ fontFamily: fontFamily.display, fontSize: fontSize['2xl'], fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['1'], lineHeight: lineHeight.snug }}
          data-testid="text-recommendations-title"
        >
          SEO Recommendations
        </h1>
        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.lg, color: tc.text.muted }}>
          Review, approve, or reject SEO recommendations from cluster analysis.
        </p>
      </div>

      <div style={{ display: 'flex', gap: space['2'], marginBottom: space['4'] }}>
        {[
          { key: 'all', label: 'All' },
          { key: 'pending_review', label: 'Pending' },
          { key: 'approved', label: 'Approved' },
          { key: 'rejected', label: 'Rejected' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            style={filterBtnStyle(statusFilter === f.key)}
            data-testid={`button-filter-${f.key}`}
          >
            {f.label}
            {f.key !== 'all' && ` (${recommendations.filter((r) => r.status === f.key).length})`}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ padding: space['8'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body }}>
          Loading recommendations...
        </div>
      )}

      {error && (
        <div style={{ padding: space['6'], backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, color: tc.text.primary, fontFamily: fontFamily.body, marginBottom: space['4'] }}>
          Error: {error}
        </div>
      )}

      {!loading && !error && (
        <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${tc.border.default}` }}>
                {['Cluster Topic', 'Primary Keyword', 'Action', 'URL', 'Status', 'Created'].map((h) => (
                  <th key={h} style={{ ...tdStyle, fontWeight: fontWeight.medium, color: tc.text.muted, textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((rec) => {
                const st = STATUS_STYLES[rec.status] || STATUS_STYLES.pending_review;
                return (
                  <tr
                    key={rec.id}
                    onClick={() => setSelected(rec)}
                    style={{ borderBottom: `1px solid ${tc.border.subtle}`, cursor: 'pointer', transition: 'background-color 150ms' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = tc.background.hover; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                    data-testid={`row-recommendation-${rec.id}`}
                  >
                    <td style={{ ...tdStyle, fontWeight: fontWeight.medium, color: tc.text.primary }}>{rec.cluster_topic}</td>
                    <td style={tdStyle}>{rec.primary_keyword}</td>
                    <td style={{ ...tdStyle, maxWidth: '200px' }}>{rec.recommended_action}</td>
                    <td style={{ ...tdStyle, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rec.recommended_url}</td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: `${space['0.5']} ${space['2']}`,
                          borderRadius: radius.DEFAULT,
                          backgroundColor: st.bg,
                          color: st.text,
                          fontSize: fontSize.sm,
                          fontWeight: fontWeight.medium,
                        }}
                        data-testid={`badge-status-${rec.id}`}
                      >
                        {st.label}
                      </span>
                    </td>
                    <td style={tdStyle}>{new Date(rec.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div style={{ padding: space['8'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body }}>
              No recommendations match the current filter.
            </div>
          )}
        </div>
      )}

      {selected && (
        <RecommendationPanel
          recommendation={selected}
          onClose={() => setSelected(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          onFeedback={(id) => { setFeedbackTarget(id); }}
          actionLoading={actionLoading}
        />
      )}

      {feedbackTarget && (
        <RecommendationFeedbackModal
          recommendationId={feedbackTarget}
          onSubmit={handleFeedbackSubmit}
          onClose={() => setFeedbackTarget(null)}
          loading={actionLoading}
        />
      )}
    </div>
  );
}

export default function SeoRecommendationsPage() {
  return (
    <DashboardGuard dashboard="seo" fallback={<AccessDenied />}>
      <RecommendationsContent />
    </DashboardGuard>
  );
}
