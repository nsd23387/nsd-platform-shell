'use client';

import React from 'react';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { magenta, violet } from '../../../../design/tokens/colors';
import { Icon } from '../../../../design/components/Icon';
import { useBootstrap } from '../../../../contexts/BootstrapContext';
import type { SeoRecommendation } from '../../../../lib/seoApi';

interface RecommendationPanelProps {
  recommendation: SeoRecommendation;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onFeedback: (id: string) => void;
  actionLoading?: boolean;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending_review: { bg: '#fef3c7', text: '#92400e', label: 'Pending Review' },
  approved: { bg: '#d1fae5', text: '#065f46', label: 'Approved' },
  rejected: { bg: '#fee2e2', text: '#991b1b', label: 'Rejected' },
};

export function RecommendationPanel({ recommendation, onClose, onApprove, onReject, onFeedback, actionLoading }: RecommendationPanelProps) {
  const tc = useThemeColors();
  const { hasPermission } = useBootstrap();
  const canApprove = hasPermission('seo:approve');
  const isPending = recommendation.status === 'pending_review';
  const status = STATUS_STYLES[recommendation.status] || STATUS_STYLES.pending_review;

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 1000,
    display: 'flex',
    justifyContent: 'flex-end',
  };

  const panelStyle: React.CSSProperties = {
    width: '520px',
    maxWidth: '100vw',
    backgroundColor: tc.background.surface,
    height: '100%',
    overflow: 'auto',
    borderLeft: `1px solid ${tc.border.default}`,
    padding: space['6'],
  };

  const fieldLabel: React.CSSProperties = {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: tc.text.muted,
    marginBottom: space['1'],
  };

  const fieldValue: React.CSSProperties = {
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    color: tc.text.primary,
    marginBottom: space['4'],
  };

  return (
    <div style={overlayStyle} onClick={onClose} data-testid="panel-recommendation-detail">
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: space['6'] }}>
          <h2 style={{ fontFamily: fontFamily.display, fontSize: fontSize.xl, fontWeight: fontWeight.semibold, color: tc.text.primary, lineHeight: lineHeight.snug }}>
            Recommendation Detail
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: tc.text.muted, padding: space['1'] }}
            data-testid="button-close-recommendation-panel"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: space['3'], marginBottom: space['6'] }}>
          <span
            style={{
              display: 'inline-block',
              padding: `${space['0.5']} ${space['2.5']}`,
              borderRadius: radius.DEFAULT,
              backgroundColor: status.bg,
              color: status.text,
              fontSize: fontSize.sm,
              fontWeight: fontWeight.medium,
            }}
            data-testid="badge-recommendation-status"
          >
            {status.label}
          </span>
        </div>

        <div style={{ marginBottom: space['6'] }}>
          <p style={fieldLabel}>Cluster Topic</p>
          <p style={fieldValue} data-testid="text-rec-cluster-topic">{recommendation.cluster_topic}</p>

          <p style={fieldLabel}>Primary Keyword</p>
          <p style={fieldValue} data-testid="text-rec-primary-keyword">{recommendation.primary_keyword}</p>

          {recommendation.recommended_title && (
            <>
              <p style={fieldLabel}>Recommended Title</p>
              <p style={{ ...fieldValue, fontWeight: fontWeight.medium }} data-testid="text-rec-title">{recommendation.recommended_title}</p>
            </>
          )}

          {recommendation.recommended_meta_description && (
            <>
              <p style={fieldLabel}>Recommended Meta Description</p>
              <p style={{ ...fieldValue, backgroundColor: tc.background.muted, padding: space['3'], borderRadius: radius.md }} data-testid="text-rec-meta-desc">
                {recommendation.recommended_meta_description}
              </p>
            </>
          )}

          <p style={fieldLabel}>Target URL</p>
          <p style={fieldValue} data-testid="text-rec-target-url">{recommendation.target_url || recommendation.recommended_url || 'Not specified'}</p>

          <p style={fieldLabel}>Opportunity Type</p>
          <p style={fieldValue}>{recommendation.opportunity_type?.replace(/_/g, ' ') || 'N/A'}</p>

          {recommendation.estimated_impact && (
            <>
              <p style={fieldLabel}>Estimated Impact</p>
              <p style={{ ...fieldValue, fontWeight: fontWeight.medium, color: violet[600] }} data-testid="text-rec-impact">{recommendation.estimated_impact}</p>
            </>
          )}

          <p style={fieldLabel}>Recommended Action</p>
          <p style={fieldValue}>{recommendation.recommended_action}</p>

          <p style={fieldLabel}>Created</p>
          <p style={fieldValue}>{new Date(recommendation.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
        </div>

        {canApprove && (
          <div style={{ display: 'flex', gap: space['3'], paddingTop: space['4'], borderTop: `1px solid ${tc.border.default}` }}>
            <button
              onClick={() => onApprove(recommendation.id)}
              disabled={!isPending || actionLoading}
              style={{
                flex: 1,
                padding: `${space['2.5']} ${space['4']}`,
                backgroundColor: isPending ? violet[500] : tc.background.muted,
                color: isPending ? '#ffffff' : tc.text.muted,
                border: 'none',
                borderRadius: radius.md,
                fontFamily: fontFamily.body,
                fontSize: fontSize.sm,
                fontWeight: fontWeight.medium,
                cursor: isPending && !actionLoading ? 'pointer' : 'not-allowed',
                opacity: isPending ? 1 : 0.5,
              }}
              data-testid="button-approve-recommendation"
            >
              {actionLoading ? 'Processing...' : 'Approve'}
            </button>
            <button
              onClick={() => onReject(recommendation.id)}
              disabled={!isPending || actionLoading}
              style={{
                flex: 1,
                padding: `${space['2.5']} ${space['4']}`,
                backgroundColor: isPending ? tc.background.surface : tc.background.muted,
                color: isPending ? tc.text.primary : tc.text.muted,
                border: `1px solid ${isPending ? tc.border.default : tc.border.subtle}`,
                borderRadius: radius.md,
                fontFamily: fontFamily.body,
                fontSize: fontSize.sm,
                fontWeight: fontWeight.medium,
                cursor: isPending && !actionLoading ? 'pointer' : 'not-allowed',
                opacity: isPending ? 1 : 0.5,
              }}
              data-testid="button-reject-recommendation"
            >
              Reject
            </button>
            <button
              onClick={() => onFeedback(recommendation.id)}
              disabled={actionLoading}
              style={{
                padding: `${space['2.5']} ${space['4']}`,
                backgroundColor: tc.background.surface,
                color: tc.text.secondary,
                border: `1px solid ${tc.border.default}`,
                borderRadius: radius.md,
                fontFamily: fontFamily.body,
                fontSize: fontSize.sm,
                fontWeight: fontWeight.medium,
                cursor: actionLoading ? 'not-allowed' : 'pointer',
              }}
              data-testid="button-feedback-recommendation"
            >
              Feedback
            </button>
          </div>
        )}

        {!canApprove && (
          <div
            style={{
              padding: space['4'],
              backgroundColor: tc.background.muted,
              borderRadius: radius.md,
              fontFamily: fontFamily.body,
              fontSize: fontSize.sm,
              color: tc.text.muted,
              textAlign: 'center',
            }}
          >
            You do not have permission to approve or reject recommendations.
          </div>
        )}
      </div>
    </div>
  );
}
