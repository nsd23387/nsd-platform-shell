/**
 * SEO Intelligence - Recommendation Detail Page
 * 
 * Admin UI for reviewing a single SEO recommendation in detail.
 * Consumes GET /api/seo/recommendations/:id API.
 * 
 * ============================================================
 * NON-GOALS (Governance)
 * ============================================================
 * - This UI does NOT deploy changes
 * - This UI does NOT modify site content
 * - All implementation occurs externally (e.g., website repo via PR)
 * - No inline editing of proposed values
 * - No diff modification allowed
 * ============================================================
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  background,
  text,
  border,
  semantic,
  violet,
} from '../../../../design/tokens/colors';
import {
  fontFamily,
  fontSize,
  fontWeight,
} from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import type { SeoRecommendation, RiskLevel, RecommendationStatus } from '../../../../lib/seo/types';
import {
  formatRecommendationType,
  formatRecommendationStatus,
  formatRiskLevel,
  formatIntentTarget,
  formatPageType,
  formatConfidence,
  formatConfidenceFactorName,
  formatDate,
  formatDateRange,
  formatEvidenceSource,
  formatAllowedChange,
  formatRollbackComplexity,
} from '../../../../lib/seo/formatters';
import { extractRecommendationDiff, type SeoRecommendationDiff } from '../../../../lib/seo/ui-contracts';
import { SEO_ROUTES } from '../../../../lib/seo/constants';
import { ApprovalActionsPanel } from '../../components/ApprovalActionsPanel';

// ============================================
// Types
// ============================================

interface PageProps {
  params: {
    recommendationId: string;
  };
}

// ============================================
// Component
// ============================================

export default function RecommendationDetailPage({ params }: PageProps) {
  const { recommendationId } = params;

  // State
  const [recommendation, setRecommendation] = useState<SeoRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch recommendation
  useEffect(() => {
    async function fetchRecommendation() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/seo/recommendations/${recommendationId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Recommendation not found');
          }
          throw new Error(`Failed to fetch recommendation: ${response.status}`);
        }

        const data: SeoRecommendation = await response.json();
        setRecommendation(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchRecommendation();
  }, [recommendationId]);

  // Handle approval action success
  const handleApprovalSuccess = (updatedRec: SeoRecommendation) => {
    setRecommendation(updatedRec);
  };

  // Extract diff if recommendation is loaded
  const diff = recommendation ? extractRecommendationDiff(recommendation) : null;

  return (
    <div style={containerStyles}>
      {/* Breadcrumb */}
      <nav style={breadcrumbStyles}>
        <a href={SEO_ROUTES.RECOMMENDATIONS} style={breadcrumbLinkStyles}>
          Recommendations
        </a>
        <span style={breadcrumbSepStyles}>/</span>
        <span style={breadcrumbCurrentStyles}>
          {loading ? 'Loading...' : (recommendation?.type ? formatRecommendationType(recommendation.type) : 'Not Found')}
        </span>
      </nav>

      {/* Loading State */}
      {loading && (
        <div style={loadingStyles}>
          <div style={spinnerStyles} />
          <span>Loading recommendation...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={errorStyles}>
          <span style={errorIconStyles}>⚠️</span>
          <h3 style={errorTitleStyles}>Error</h3>
          <p>{error}</p>
          <a href={SEO_ROUTES.RECOMMENDATIONS} style={backLinkStyles}>
            ← Back to Recommendations
          </a>
        </div>
      )}

      {/* Main Content */}
      {!loading && !error && recommendation && (
        <>
          {/* Header */}
          <div style={headerStyles}>
            <div style={headerLeftStyles}>
              <h1 style={h1Styles}>{formatRecommendationType(recommendation.type)}</h1>
              <div style={headerMetaStyles}>
                <StatusBadge status={recommendation.status} />
                <RiskBadge level={recommendation.risk.level} />
                <span style={urlStyles}>{recommendation.scope.url}</span>
              </div>
            </div>
            <div style={headerRightStyles}>
              <ConfidenceDisplay 
                score={recommendation.confidence.score}
                explanation={recommendation.confidence.explanation}
              />
            </div>
          </div>

          {/* Two Column Layout */}
          <div style={twoColumnStyles}>
            {/* Left Column: Details */}
            <div style={leftColumnStyles}>
              {/* Scope Section */}
              <Section title="Scope">
                <InfoRow label="Page URL" value={recommendation.scope.url} mono />
                <InfoRow label="Page Type" value={formatPageType(recommendation.scope.page_type)} />
                <InfoRow label="Intent Target" value={formatIntentTarget(recommendation.scope.intent_target)} />
                <InfoRow 
                  label="Allowed Changes" 
                  value={recommendation.scope.allowed_changes.map(c => formatAllowedChange(c)).join(', ')} 
                />
              </Section>

              {/* Evidence Section */}
              <Section title="Evidence">
                <div style={evidenceSummaryStyles}>
                  {recommendation.evidence.summary}
                </div>
                <InfoRow 
                  label="Time Window" 
                  value={formatDateRange(
                    recommendation.evidence.time_window.start_date,
                    recommendation.evidence.time_window.end_date
                  )} 
                />
                <InfoRow 
                  label="Signals" 
                  value={`${recommendation.evidence.signals.length} data points`} 
                />
                {recommendation.evidence.signals.length > 0 && (
                  <div style={signalsListStyles}>
                    {recommendation.evidence.signals.slice(0, 5).map((signal, idx) => (
                      <div key={idx} style={signalItemStyles}>
                        <span style={signalSourceStyles}>{formatEvidenceSource(signal.source)}</span>
                        <span style={signalMetricStyles}>{signal.metric}</span>
                        <span style={signalValueStyles}>{String(signal.current_value)}</span>
                      </div>
                    ))}
                    {recommendation.evidence.signals.length > 5 && (
                      <div style={moreSignalsStyles}>
                        +{recommendation.evidence.signals.length - 5} more signals
                      </div>
                    )}
                  </div>
                )}
              </Section>

              {/* Confidence Breakdown */}
              <Section title="Confidence Factors">
                <div style={factorsListStyles}>
                  {recommendation.confidence.factors.map((factor, idx) => (
                    <div key={idx} style={factorItemStyles}>
                      <span style={factorNameStyles}>
                        {formatConfidenceFactorName(factor.name)}
                      </span>
                      <div style={factorBarContainerStyles}>
                        <div 
                          style={{
                            ...factorBarStyles,
                            width: `${factor.value * 100}%`,
                          }}
                        />
                      </div>
                      <span style={factorValueStyles}>
                        {Math.round(factor.value * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Expected Impact */}
              <Section title="Expected Impact">
                {recommendation.expected_impact.seo_metrics && (
                  <>
                    {recommendation.expected_impact.seo_metrics.ctr_lift_percent && (
                      <InfoRow label="CTR Lift" value={recommendation.expected_impact.seo_metrics.ctr_lift_percent} />
                    )}
                    {recommendation.expected_impact.seo_metrics.ranking_change_estimate && (
                      <InfoRow label="Ranking Change" value={recommendation.expected_impact.seo_metrics.ranking_change_estimate} />
                    )}
                  </>
                )}
                {recommendation.expected_impact.conversion_metrics && (
                  <>
                    {recommendation.expected_impact.conversion_metrics.quote_start_lift && (
                      <InfoRow label="Quote Start Lift" value={recommendation.expected_impact.conversion_metrics.quote_start_lift} />
                    )}
                  </>
                )}
                {recommendation.expected_impact.revenue_metrics && (
                  <>
                    {recommendation.expected_impact.revenue_metrics.monthly_revenue_estimate && (
                      <InfoRow label="Monthly Revenue Est." value={recommendation.expected_impact.revenue_metrics.monthly_revenue_estimate} />
                    )}
                  </>
                )}
              </Section>

              {/* Risk Assessment */}
              <Section title="Risk Assessment">
                <RiskBadge level={recommendation.risk.level} large />
                <div style={riskReasonsStyles}>
                  {recommendation.risk.reasons.map((reason, idx) => (
                    <div key={idx} style={riskReasonStyles}>• {reason}</div>
                  ))}
                </div>
                <InfoRow 
                  label="Rollback Complexity" 
                  value={formatRollbackComplexity(recommendation.risk.rollback_complexity)} 
                />
              </Section>
            </div>

            {/* Right Column: Diff + Actions */}
            <div style={rightColumnStyles}>
              {/* Diff View */}
              {diff && <DiffView diff={diff} />}

              {/* Rationale */}
              <Section title="Rationale">
                <div style={rationaleStyles}>
                  {recommendation.proposed_state.rationale}
                </div>
              </Section>

              {/* Approval Actions */}
              <Section title="Actions">
                <ApprovalActionsPanel
                  recommendationId={recommendation.id}
                  currentStatus={recommendation.status}
                  onSuccess={handleApprovalSuccess}
                />
              </Section>

              {/* Metadata */}
              <Section title="Metadata">
                <InfoRow label="Created" value={formatDate(recommendation.created_at)} />
                <InfoRow label="Updated" value={formatDate(recommendation.updated_at)} />
                <InfoRow label="Model Version" value={recommendation.metadata.model_version} />
                {recommendation.approval && (
                  <>
                    <InfoRow label="Decided By" value={recommendation.approval.decided_by} />
                    <InfoRow label="Decided At" value={formatDate(recommendation.approval.decided_at)} />
                  </>
                )}
              </Section>
            </div>
          </div>

          {/* Governance Notice */}
          <div style={governanceNoticeStyles}>
            <strong>Review Only</strong> — Approving this recommendation does not deploy changes.
            Implementation occurs via separate PR to website repository.
          </div>
        </>
      )}
    </div>
  );
}

// ============================================
// Sub-Components
// ============================================

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={sectionStyles}>
      <h3 style={sectionTitleStyles}>{title}</h3>
      <div style={sectionContentStyles}>{children}</div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={infoRowStyles}>
      <span style={infoLabelStyles}>{label}</span>
      <span style={{ ...infoValueStyles, ...(mono ? { fontFamily: fontFamily.mono, fontSize: fontSize.xs } : {}) }}>
        {value}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: RecommendationStatus }) {
  const style = getStatusStyle(status);
  return (
    <span style={{ ...statusBadgeStyles, ...style }}>
      {formatRecommendationStatus(status)}
    </span>
  );
}

function RiskBadge({ level, large }: { level: RiskLevel; large?: boolean }) {
  const style = getRiskStyle(level);
  return (
    <span style={{ 
      ...riskBadgeStyles, 
      ...style,
      ...(large ? { fontSize: fontSize.sm, padding: `${space['2']} ${space['4']}` } : {}),
    }}>
      {formatRiskLevel(level)}
    </span>
  );
}

function ConfidenceDisplay({ score, explanation }: { score: number; explanation: string }) {
  const color = score >= 0.85 ? semantic.success.dark 
    : score >= 0.5 ? semantic.info.dark 
    : semantic.warning.dark;
  const bg = score >= 0.85 ? semantic.success.light 
    : score >= 0.5 ? semantic.info.light 
    : semantic.warning.light;

  return (
    <div style={{ ...confidenceDisplayStyles, backgroundColor: bg, borderColor: color }}>
      <div style={{ ...confidenceScoreStyles, color }}>{formatConfidence(score)}</div>
      <div style={confidenceLabelStyles}>Confidence</div>
    </div>
  );
}

function DiffView({ diff }: { diff: SeoRecommendationDiff }) {
  return (
    <Section title="Proposed Changes">
      {/* Title Diff */}
      {(diff.current.title || diff.proposed.title) && (
        <DiffRow 
          label="Title"
          current={diff.current.title}
          proposed={diff.proposed.title}
          charDiff={diff.char_diff?.title_diff}
        />
      )}

      {/* Description Diff */}
      {(diff.current.description || diff.proposed.description) && (
        <DiffRow 
          label="Meta Description"
          current={diff.current.description}
          proposed={diff.proposed.description}
          charDiff={diff.char_diff?.description_diff}
        />
      )}

      {/* H1 Diff */}
      {(diff.current.h1 || diff.proposed.h1) && (
        <DiffRow 
          label="H1"
          current={diff.current.h1}
          proposed={diff.proposed.h1}
        />
      )}

      {/* No changes to show */}
      {!diff.current.title && !diff.proposed.title && 
       !diff.current.description && !diff.proposed.description &&
       !diff.current.h1 && !diff.proposed.h1 && (
        <div style={noDiffStyles}>
          No metadata changes in this recommendation.
          Check scope for allowed change types.
        </div>
      )}
    </Section>
  );
}

function DiffRow({ 
  label, 
  current, 
  proposed,
  charDiff,
}: { 
  label: string;
  current?: string;
  proposed?: string;
  charDiff?: number;
}) {
  return (
    <div style={diffRowStyles}>
      <div style={diffLabelStyles}>
        {label}
        {charDiff !== undefined && (
          <span style={charDiffStyles}>
            {charDiff > 0 ? `+${charDiff}` : charDiff} chars
          </span>
        )}
      </div>
      <div style={diffPanelsStyles}>
        <div style={diffCurrentStyles}>
          <div style={diffPanelHeaderStyles}>Current</div>
          <div style={diffPanelContentStyles}>
            {current || <em style={emptyValueStyles}>(empty)</em>}
          </div>
        </div>
        <div style={diffArrowStyles}>→</div>
        <div style={diffProposedStyles}>
          <div style={diffPanelHeaderStyles}>Proposed</div>
          <div style={diffPanelContentStyles}>
            {proposed || <em style={emptyValueStyles}>(empty)</em>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Style Helpers
// ============================================

function getStatusStyle(status: RecommendationStatus): React.CSSProperties {
  switch (status) {
    case 'approved':
      return { backgroundColor: semantic.success.light, color: semantic.success.dark };
    case 'rejected':
      return { backgroundColor: semantic.danger.light, color: semantic.danger.dark };
    case 'deferred':
      return { backgroundColor: semantic.warning.light, color: semantic.warning.dark };
    case 'implemented':
      return { backgroundColor: semantic.info.light, color: semantic.info.dark };
    case 'rolled_back':
      return { backgroundColor: semantic.danger.light, color: semantic.danger.dark };
    case 'pending':
    default:
      return { backgroundColor: background.muted, color: text.muted };
  }
}

function getRiskStyle(level: RiskLevel): React.CSSProperties {
  switch (level) {
    case 'high':
      return { backgroundColor: semantic.danger.light, color: semantic.danger.dark };
    case 'medium':
      return { backgroundColor: semantic.warning.light, color: semantic.warning.dark };
    case 'low':
    default:
      return { backgroundColor: semantic.success.light, color: semantic.success.dark };
  }
}

// ============================================
// Styles
// ============================================

const containerStyles: React.CSSProperties = {
  maxWidth: '1400px',
  margin: '0 auto',
};

const breadcrumbStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: space['2'],
  marginBottom: space['6'],
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
};

const breadcrumbLinkStyles: React.CSSProperties = {
  color: text.muted,
  textDecoration: 'none',
};

const breadcrumbSepStyles: React.CSSProperties = {
  color: text.muted,
};

const breadcrumbCurrentStyles: React.CSSProperties = {
  color: text.primary,
  fontWeight: fontWeight.medium,
};

const loadingStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: space['3'],
  padding: space['12'],
  color: text.muted,
  fontFamily: fontFamily.body,
  fontSize: fontSize.base,
};

const spinnerStyles: React.CSSProperties = {
  width: '24px',
  height: '24px',
  border: `3px solid ${border.default}`,
  borderTopColor: violet[500],
  borderRadius: '50%',
};

const errorStyles: React.CSSProperties = {
  padding: space['8'],
  backgroundColor: semantic.danger.light,
  borderRadius: radius.xl,
  textAlign: 'center',
  fontFamily: fontFamily.body,
  color: semantic.danger.dark,
};

const errorIconStyles: React.CSSProperties = {
  fontSize: '48px',
  display: 'block',
  marginBottom: space['4'],
};

const errorTitleStyles: React.CSSProperties = {
  fontSize: fontSize.lg,
  fontWeight: fontWeight.semibold,
  margin: 0,
};

const backLinkStyles: React.CSSProperties = {
  display: 'inline-block',
  marginTop: space['4'],
  color: semantic.danger.dark,
  textDecoration: 'none',
};

const headerStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: space['6'],
  gap: space['4'],
};

const headerLeftStyles: React.CSSProperties = {
  flex: 1,
};

const headerRightStyles: React.CSSProperties = {};

const h1Styles: React.CSSProperties = {
  fontFamily: fontFamily.display,
  fontSize: fontSize['2xl'],
  fontWeight: fontWeight.bold,
  color: text.primary,
  margin: 0,
};

const headerMetaStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: space['3'],
  marginTop: space['3'],
  flexWrap: 'wrap',
};

const urlStyles: React.CSSProperties = {
  fontFamily: fontFamily.mono,
  fontSize: fontSize.sm,
  color: text.muted,
};

const statusBadgeStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.medium,
  padding: `${space['1']} ${space['3']}`,
  borderRadius: radius.full,
};

const riskBadgeStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.medium,
  padding: `${space['1']} ${space['3']}`,
  borderRadius: radius.md,
};

const confidenceDisplayStyles: React.CSSProperties = {
  padding: space['4'],
  borderRadius: radius.lg,
  border: '2px solid',
  textAlign: 'center',
  minWidth: '100px',
};

const confidenceScoreStyles: React.CSSProperties = {
  fontFamily: fontFamily.mono,
  fontSize: fontSize['2xl'],
  fontWeight: fontWeight.bold,
};

const confidenceLabelStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.xs,
  color: text.muted,
  marginTop: space['1'],
};

const twoColumnStyles: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: space['6'],
};

const leftColumnStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: space['4'],
};

const rightColumnStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: space['4'],
};

const sectionStyles: React.CSSProperties = {
  backgroundColor: background.surface,
  borderRadius: radius.xl,
  border: `1px solid ${border.default}`,
  padding: space['5'],
};

const sectionTitleStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semibold,
  color: text.primary,
  margin: 0,
  marginBottom: space['4'],
  paddingBottom: space['3'],
  borderBottom: `1px solid ${border.subtle}`,
};

const sectionContentStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: space['2'],
};

const infoRowStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: space['4'],
};

const infoLabelStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  color: text.muted,
  flexShrink: 0,
};

const infoValueStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  color: text.primary,
  textAlign: 'right',
  wordBreak: 'break-word',
};

const evidenceSummaryStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  color: text.secondary,
  lineHeight: 1.6,
  marginBottom: space['3'],
  padding: space['3'],
  backgroundColor: background.muted,
  borderRadius: radius.md,
};

const signalsListStyles: React.CSSProperties = {
  marginTop: space['3'],
  display: 'flex',
  flexDirection: 'column',
  gap: space['1'],
};

const signalItemStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: space['2'],
  fontSize: fontSize.xs,
  padding: space['2'],
  backgroundColor: background.muted,
  borderRadius: radius.sm,
};

const signalSourceStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontWeight: fontWeight.medium,
  color: text.muted,
  minWidth: '80px',
};

const signalMetricStyles: React.CSSProperties = {
  fontFamily: fontFamily.mono,
  color: text.secondary,
  flex: 1,
};

const signalValueStyles: React.CSSProperties = {
  fontFamily: fontFamily.mono,
  fontWeight: fontWeight.medium,
  color: text.primary,
};

const moreSignalsStyles: React.CSSProperties = {
  fontSize: fontSize.xs,
  color: text.muted,
  fontStyle: 'italic',
  textAlign: 'center',
  paddingTop: space['2'],
};

const factorsListStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: space['3'],
};

const factorItemStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: space['3'],
};

const factorNameStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.xs,
  color: text.secondary,
  minWidth: '140px',
};

const factorBarContainerStyles: React.CSSProperties = {
  flex: 1,
  height: '8px',
  backgroundColor: background.muted,
  borderRadius: radius.full,
  overflow: 'hidden',
};

const factorBarStyles: React.CSSProperties = {
  height: '100%',
  backgroundColor: violet[500],
  borderRadius: radius.full,
};

const factorValueStyles: React.CSSProperties = {
  fontFamily: fontFamily.mono,
  fontSize: fontSize.xs,
  color: text.muted,
  minWidth: '36px',
  textAlign: 'right',
};

const riskReasonsStyles: React.CSSProperties = {
  marginTop: space['3'],
  display: 'flex',
  flexDirection: 'column',
  gap: space['1'],
};

const riskReasonStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  color: text.secondary,
};

const rationaleStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  color: text.secondary,
  lineHeight: 1.6,
  whiteSpace: 'pre-wrap',
};

const diffRowStyles: React.CSSProperties = {
  marginBottom: space['4'],
};

const diffLabelStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semibold,
  color: text.primary,
  marginBottom: space['2'],
  display: 'flex',
  alignItems: 'center',
  gap: space['2'],
};

const charDiffStyles: React.CSSProperties = {
  fontFamily: fontFamily.mono,
  fontSize: fontSize.xs,
  color: text.muted,
  fontWeight: fontWeight.normal,
};

const diffPanelsStyles: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr auto 1fr',
  gap: space['2'],
  alignItems: 'stretch',
};

const diffCurrentStyles: React.CSSProperties = {
  backgroundColor: semantic.danger.light,
  borderRadius: radius.md,
  overflow: 'hidden',
};

const diffProposedStyles: React.CSSProperties = {
  backgroundColor: semantic.success.light,
  borderRadius: radius.md,
  overflow: 'hidden',
};

const diffArrowStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  color: text.muted,
  fontSize: fontSize.lg,
};

const diffPanelHeaderStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.semibold,
  padding: `${space['1']} ${space['2']}`,
  backgroundColor: 'rgba(0,0,0,0.05)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: text.muted,
};

const diffPanelContentStyles: React.CSSProperties = {
  fontFamily: fontFamily.mono,
  fontSize: fontSize.xs,
  padding: space['3'],
  lineHeight: 1.5,
  color: text.primary,
  minHeight: '60px',
};

const emptyValueStyles: React.CSSProperties = {
  color: text.muted,
};

const noDiffStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  color: text.muted,
  fontStyle: 'italic',
  padding: space['4'],
  backgroundColor: background.muted,
  borderRadius: radius.md,
  textAlign: 'center',
};

const governanceNoticeStyles: React.CSSProperties = {
  marginTop: space['8'],
  padding: space['4'],
  backgroundColor: semantic.info.light,
  borderRadius: radius.lg,
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  color: semantic.info.dark,
  textAlign: 'center',
};
