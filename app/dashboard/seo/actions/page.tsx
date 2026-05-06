'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { violet } from '../../../../design/tokens/colors';
import { getSeoActions, approveSeoAction, rejectSeoAction } from '../../../../lib/seoApi';

// =============================================================================
// Types
// =============================================================================

interface SeoAction {
  id: string;
  created_at: string;
  target_url: string;
  mutation_type: string;
  target_field: string | null;
  current_value: string | null;
  proposed_value: string | null;
  proposed_reason: string | null;
  source: string;
  source_keyword: string | null;
  gsc_impressions: number | null;
  gsc_clicks: number | null;
  gsc_position: number | null;
  gsc_ctr: number | null;
  agent_review_score: number | null;
  agent_review_notes: string | null;
  agent_reviewed_at: string | null;
  agent_model: string | null;
  human_decision: string | null;
  human_notes: string | null;
  status: string;
  executed_at: string | null;
  applied_value: string | null;
  snapshot_value: string | null;
  execution_error: string | null;
  outcome_label: string | null;
  outcome_position_delta: number | null;
  outcome_impressions_delta: number | null;
}

type TabFilter = 'needs_review' | 'approved' | 'published' | 'measured' | 'all';

// =============================================================================
// Helpers
// =============================================================================

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  proposed: { bg: '#FEF3C7', text: '#92400e' },
  reviewed: { bg: '#DBEAFE', text: '#1E40AF' },
  approved: { bg: '#D1FAE5', text: '#065F46' },
  executing: { bg: '#E0E7FF', text: '#3730A3' },
  published: { bg: '#D1FAE5', text: '#065F46' },
  measuring: { bg: '#F3E8FF', text: '#6B21A8' },
  failed: { bg: '#FEE2E2', text: '#991B1B' },
  rejected: { bg: '#F5F5F5', text: '#525252' },
  rolled_back: { bg: '#FEE2E2', text: '#991B1B' },
};

function mutationLabel(type: string): string {
  switch (type) {
    case 'meta_description': return 'Meta description';
    case 'title_tag': return 'Title tag';
    case 'focus_keyword': return 'Focus keyword';
    case 'internal_link': return 'Internal link';
    case 'schema_markup': return 'Schema markup';
    case 'new_blog_post': return 'New blog post';
    default: return type.replace(/_/g, ' ');
  }
}

function scoreColor(score: number | null): string {
  if (score == null) return '#6B7280';
  if (score >= 8) return '#065F46';
  if (score >= 5) return '#92400E';
  return '#991B1B';
}

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(ms / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// =============================================================================
// Action Card Component
// =============================================================================

function ActionCard({
  action, tc, onApprove, onReject, isLoading,
}: {
  action: SeoAction;
  tc: ReturnType<typeof useThemeColors>;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isLoading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const statusStyle = STATUS_COLORS[action.status] || STATUS_COLORS.proposed;
  const shortUrl = action.target_url.replace('https://neonsignsdepot.com', '').replace('https://www.neonsignsdepot.com', '');
  const canAct = ['proposed', 'reviewed'].includes(action.status);

  return (
    <div style={{
      backgroundColor: tc.background.surface,
      border: `1px solid ${tc.border.default}`,
      borderLeft: `3px solid ${action.agent_review_score != null && action.agent_review_score >= 7 ? '#10B981' : action.agent_review_score != null && action.agent_review_score < 4 ? '#EF4444' : '#F59E0B'}`,
      borderRadius: radius.lg,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div onClick={() => setExpanded(!expanded)} style={{ padding: space['4'], cursor: 'pointer' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: space['1'] }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: fontFamily.display, fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['0.5'] }}>
              {mutationLabel(action.mutation_type)} for {shortUrl || '/'}
            </div>
            <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.placeholder }}>
              {shortUrl}
            </div>
          </div>
          <div style={{ display: 'flex', gap: space['2'], alignItems: 'center' }}>
            {action.agent_review_score != null && (
              <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: scoreColor(action.agent_review_score) }}>
                {action.agent_review_score.toFixed(1)}/10
              </span>
            )}
            <span style={{ padding: `${space['0.5']} ${space['2']}`, borderRadius: radius.full, fontSize: '11px', fontWeight: fontWeight.medium, backgroundColor: statusStyle.bg, color: statusStyle.text }}>
              {action.status}
            </span>
          </div>
        </div>

        {/* Reason + metrics row */}
        <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.secondary, marginBottom: space['1'] }}>
          {action.proposed_reason || `Optimize ${action.mutation_type} for "${action.source_keyword || 'target keyword'}"`}
        </div>
        <div style={{ display: 'flex', gap: space['3'], fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>
          {action.gsc_impressions != null && <span>{action.gsc_impressions.toLocaleString()} imp</span>}
          {action.gsc_clicks != null && <span>{action.gsc_clicks} clicks</span>}
          {action.gsc_position != null && <span>pos {action.gsc_position.toFixed(1)}</span>}
          {action.source_keyword && <span>&ldquo;{action.source_keyword}&rdquo;</span>}
          <span>{timeAgo(action.created_at)}</span>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: `0 ${space['4']} ${space['4']}`, borderTop: `1px solid ${tc.border.default}` }}>
          {/* Agent review */}
          {action.agent_review_notes && (
            <div style={{ marginTop: space['3'], padding: space['3'], backgroundColor: tc.background.muted, borderRadius: radius.md, marginBottom: space['3'] }}>
              <div style={{ fontFamily: fontFamily.body, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: tc.text.muted, fontWeight: fontWeight.medium, marginBottom: space['1'] }}>
                Agent Review {action.agent_model && `(${action.agent_model})`}
              </div>
              <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.secondary, lineHeight: lineHeight.relaxed }}>
                <strong style={{ color: scoreColor(action.agent_review_score) }}>Score: {action.agent_review_score?.toFixed(1)}/10</strong>
                {' — '}{action.agent_review_notes}
              </div>
            </div>
          )}

          {/* Comparison table */}
          <div style={{ border: `1px solid ${tc.border.default}`, borderRadius: radius.md, overflow: 'hidden', marginBottom: space['3'] }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: tc.background.muted }}>
                  <th style={{ padding: `${space['2']} ${space['3']}`, textAlign: 'left', fontFamily: fontFamily.body, fontSize: '11px', fontWeight: fontWeight.medium, color: tc.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em', width: '50%' }}>Current (live)</th>
                  <th style={{ padding: `${space['2']} ${space['3']}`, textAlign: 'left', fontFamily: fontFamily.body, fontSize: '11px', fontWeight: fontWeight.medium, color: tc.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em', width: '50%' }}>Proposed</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: `${space['2.5']} ${space['3']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: action.current_value ? tc.text.secondary : '#991B1B', verticalAlign: 'top', borderRight: `1px solid ${tc.border.default}` }}>
                    {action.current_value || <em style={{ fontStyle: 'italic' }}>Not set</em>}
                  </td>
                  <td style={{ padding: `${space['2.5']} ${space['3']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.primary, fontWeight: fontWeight.medium, verticalAlign: 'top', borderLeft: '3px solid #10B981' }}>
                    {action.proposed_value || '—'}
                    {action.proposed_value && (
                      <div style={{ fontSize: '11px', color: tc.text.muted, marginTop: space['0.5'] }}>
                        {action.proposed_value.length} chars
                      </div>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Outcome (if measured) */}
          {action.outcome_label && (
            <div style={{ padding: space['3'], backgroundColor: action.outcome_label === 'positive' ? '#D1FAE5' : action.outcome_label === 'negative' ? '#FEE2E2' : '#F5F5F5', borderRadius: radius.md, marginBottom: space['3'] }}>
              <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: action.outcome_label === 'positive' ? '#065F46' : action.outcome_label === 'negative' ? '#991B1B' : '#525252' }}>
                Outcome: {action.outcome_label}
                {action.outcome_position_delta != null && ` | Position ${action.outcome_position_delta > 0 ? '+' : ''}${action.outcome_position_delta.toFixed(1)}`}
                {action.outcome_impressions_delta != null && ` | Impressions ${action.outcome_impressions_delta > 0 ? '+' : ''}${action.outcome_impressions_delta}`}
              </div>
            </div>
          )}

          {/* Execution error */}
          {action.execution_error && (
            <div style={{ padding: space['3'], backgroundColor: '#FEE2E2', borderRadius: radius.md, marginBottom: space['3'], fontFamily: fontFamily.body, fontSize: fontSize.sm, color: '#991B1B' }}>
              Error: {action.execution_error}
            </div>
          )}

          {/* Action buttons */}
          {canAct && (
            <div style={{ display: 'flex', gap: space['2'] }}>
              <button
                disabled={isLoading}
                onClick={() => onApprove(action.id)}
                style={{ flex: 1, padding: `${space['2.5']} ${space['4']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: '#fff', backgroundColor: '#059669', border: 'none', borderRadius: radius.md, cursor: isLoading ? 'wait' : 'pointer', opacity: isLoading ? 0.5 : 1 }}
              >
                Approve
              </button>
              <button
                disabled={isLoading}
                onClick={() => onReject(action.id)}
                style={{ padding: `${space['2.5']} ${space['4']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: '#991B1B', backgroundColor: '#FEE2E2', border: 'none', borderRadius: radius.md, cursor: isLoading ? 'wait' : 'pointer', opacity: isLoading ? 0.5 : 1 }}
              >
                Reject
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Page
// =============================================================================

function ActionsContent() {
  const tc = useThemeColors();
  const [actions, setActions] = useState<SeoAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabFilter>('needs_review');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const statusMap: Record<TabFilter, string> = {
    needs_review: 'proposed,reviewed',
    approved: 'approved,executing',
    published: 'published,measuring',
    measured: 'published',
    all: 'proposed,reviewed,approved,executing,published,measuring,failed,rejected,rolled_back',
  };

  const loadActions = useCallback(async () => {
    setLoading(true);
    try {
      let rows = await getSeoActions(statusMap[tab], 50) as SeoAction[];
      if (tab === 'measured') {
        rows = rows.filter((a: SeoAction) => a.outcome_label != null);
      }
      setActions(rows);
    } catch (err) {
      console.error('Failed to load actions:', err);
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => { loadActions(); }, [loadActions]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await approveSeoAction(id);
      loadActions();
    } catch (err) {
      console.error('Approve failed:', err);
    }
    setActionLoading(null);
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      await rejectSeoAction(id);
      loadActions();
    } catch (err) {
      console.error('Reject failed:', err);
    }
    setActionLoading(null);
  };

  // Counts by status
  const needsReviewCount = actions.filter(a => ['proposed', 'reviewed'].includes(a.status)).length;

  const tabStyle = (t: TabFilter) => ({
    padding: `${space['1.5']} ${space['3']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    fontWeight: tab === t ? fontWeight.semibold : fontWeight.normal,
    color: tab === t ? tc.text.primary : tc.text.muted,
    backgroundColor: tab === t ? tc.background.surface : 'transparent',
    border: tab === t ? `1px solid ${tc.border.default}` : '1px solid transparent',
    borderRadius: radius.md,
    cursor: 'pointer' as const,
  });

  return (
    <div>
      <div style={{ marginBottom: space['6'] }}>
        <h1 style={{ fontFamily: fontFamily.display, fontSize: fontSize['2xl'], fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['1'], lineHeight: lineHeight.snug }}>
          SEO Actions
        </h1>
        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, color: tc.text.muted }}>
          AI-reviewed SEO changes. Approve, reject, or let the agent auto-approve high-confidence actions.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: space['1'], marginBottom: space['4'] }}>
        <button style={tabStyle('needs_review')} onClick={() => setTab('needs_review')}>Needs Review</button>
        <button style={tabStyle('approved')} onClick={() => setTab('approved')}>Approved</button>
        <button style={tabStyle('published')} onClick={() => setTab('published')}>Published</button>
        <button style={tabStyle('measured')} onClick={() => setTab('measured')}>Measured</button>
        <button style={tabStyle('all')} onClick={() => setTab('all')}>All</button>
      </div>

      {loading && (
        <div style={{ padding: space['8'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body }}>
          Loading actions...
        </div>
      )}

      {!loading && actions.length === 0 && (
        <div style={{ padding: space['8'], backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, textAlign: 'center' }}>
          <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, fontWeight: fontWeight.medium, color: tc.text.secondary, marginBottom: space['2'] }}>
            {tab === 'needs_review' ? 'No actions need review' : `No ${tab} actions`}
          </div>
          <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>
            The SEO Agent Loop runs daily at 13:00 UTC. Actions appear here after detection and AI review.
          </div>
        </div>
      )}

      {!loading && actions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: space['3'] }}>
          {actions.map(action => (
            <ActionCard
              key={action.id}
              action={action}
              tc={tc}
              onApprove={handleApprove}
              onReject={handleReject}
              isLoading={actionLoading === action.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ActionsPage() {
  return (
    <DashboardGuard dashboard="seo" fallback={<AccessDenied />}>
      <ActionsContent />
    </DashboardGuard>
  );
}
