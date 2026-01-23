/**
 * CampaignOutcomeSummary Component
 * 
 * POST-EXECUTION ONLY:
 * Lightweight outcome summary card that appears after execution ends.
 * 
 * PRINCIPLES:
 * - Only renders after execution completes
 * - Narrative summary, not a dashboard
 * - Plain-English descriptions
 * - Neutral tone unless truly exceptional
 * 
 * CONTENT (when available):
 * - Organizations observed
 * - Contacts discovered
 * - Leads promoted
 * - Conversion rate
 * - Primary blocking or termination reason (if applicable)
 */

'use client';

import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY, NSD_SHADOWS } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import { getOutcomeDisplay } from '../../lib/status-copy';

interface OutcomeMetrics {
  organizations: number;
  contacts: number;
  leads: number;
  emailsSent: number;
  opens?: number;
  replies?: number;
}

interface CampaignOutcomeSummaryProps {
  /** Whether execution has completed */
  hasExecutionCompleted: boolean;
  /** Outcome type from backend */
  outcomeType?: string;
  /** Termination reason (if stopped/failed) */
  terminationReason?: string;
  /** Metrics from execution */
  metrics: OutcomeMetrics;
  /** Execution duration in seconds */
  durationSeconds?: number;
  /** Timestamp when execution completed */
  completedAt?: string;
}

/**
 * Format duration for display
 */
function formatDuration(seconds?: number): string | null {
  if (!seconds || seconds <= 0) return null;
  if (seconds < 60) return `${seconds} seconds`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    return `${mins} minute${mins !== 1 ? 's' : ''}`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

/**
 * Calculate conversion rate
 */
function calculateConversionRate(metrics: OutcomeMetrics): number | null {
  if (metrics.organizations === 0) return null;
  return (metrics.leads / metrics.organizations) * 100;
}

function MetricBlock({ 
  label, 
  value, 
  subValue,
}: { 
  label: string; 
  value: string | number;
  subValue?: string;
}) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '16px 12px',
    }}>
      <div style={{
        fontSize: '28px',
        fontWeight: 700,
        color: NSD_COLORS.text.primary,
        fontFamily: NSD_TYPOGRAPHY.fontDisplay,
        marginBottom: '6px',
        letterSpacing: '-0.02em',
      }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div style={{
        fontSize: '11px',
        fontWeight: 600,
        color: NSD_COLORS.text.muted,
        textTransform: 'uppercase',
        letterSpacing: '0.75px',
      }}>
        {label}
      </div>
      {subValue && (
        <div style={{
          fontSize: '11px',
          color: NSD_COLORS.text.muted,
          marginTop: '4px',
          opacity: 0.8,
        }}>
          {subValue}
        </div>
      )}
    </div>
  );
}

export function CampaignOutcomeSummary({
  hasExecutionCompleted,
  outcomeType,
  terminationReason,
  metrics,
  durationSeconds,
  completedAt,
}: CampaignOutcomeSummaryProps) {
  // DO NOT RENDER unless execution has completed
  if (!hasExecutionCompleted) {
    return null;
  }

  const outcomeDisplay = getOutcomeDisplay(outcomeType);
  const conversionRate = calculateConversionRate(metrics);
  const duration = formatDuration(durationSeconds);

  // Determine header styling based on outcome
  const getHeaderConfig = () => {
    if (!outcomeDisplay) {
      return {
        bg: NSD_COLORS.semantic.positive.bg,
        text: NSD_COLORS.semantic.positive.text,
        icon: 'check' as const,
      };
    }
    switch (outcomeDisplay.tone) {
      case 'attention':
        return {
          bg: NSD_COLORS.semantic.attention.bg,
          text: NSD_COLORS.semantic.attention.text,
          icon: 'warning' as const,
        };
      case 'critical':
        return {
          bg: NSD_COLORS.semantic.critical.bg,
          text: NSD_COLORS.semantic.critical.text,
          icon: 'warning' as const,
        };
      case 'neutral':
        return {
          bg: NSD_COLORS.semantic.info.bg,
          text: NSD_COLORS.semantic.info.text,
          icon: 'info' as const,
        };
      default:
        return {
          bg: NSD_COLORS.semantic.positive.bg,
          text: NSD_COLORS.semantic.positive.text,
          icon: 'check' as const,
        };
    }
  };

  const headerConfig = getHeaderConfig();

  return (
    <div style={{
      backgroundColor: NSD_COLORS.background,
      borderRadius: NSD_RADIUS.lg,
      border: `1px solid ${NSD_COLORS.border.default}`,
      marginBottom: '28px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      overflow: 'hidden',
    }}>
      {/* Header - Run Report feel */}
      <div style={{
        padding: '24px 28px',
        backgroundColor: headerConfig.bg,
        borderBottom: `1px solid ${headerConfig.text}15`,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '16px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px',
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: NSD_RADIUS.md,
              backgroundColor: 'rgba(255,255,255,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon name={headerConfig.icon} size={22} color={headerConfig.text} />
            </div>
            <div>
              <span style={{
                fontSize: '10px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.75px',
                color: headerConfig.text,
                opacity: 0.7,
              }}>
                Execution Outcome
              </span>
              <h3 style={{
                margin: '4px 0 0 0',
                fontSize: '20px',
                fontWeight: 700,
                color: headerConfig.text,
                fontFamily: NSD_TYPOGRAPHY.fontDisplay,
                letterSpacing: '-0.01em',
              }}>
                {outcomeDisplay?.label || 'Execution Complete'}
              </h3>
              <p style={{
                margin: '6px 0 0 0',
                fontSize: '14px',
                color: headerConfig.text,
                opacity: 0.85,
                lineHeight: 1.4,
              }}>
                {outcomeDisplay?.description || 'Campaign execution has finished.'}
              </p>
            </div>
          </div>
          {/* Duration badge in header */}
          {duration && (
            <div style={{
              padding: '6px 12px',
              backgroundColor: 'rgba(255,255,255,0.4)',
              borderRadius: NSD_RADIUS.full,
              flexShrink: 0,
            }}>
              <span style={{
                fontSize: '12px',
                fontWeight: 500,
                color: headerConfig.text,
              }}>
                {duration}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div style={{
        padding: '20px 24px',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
          borderBottom: `1px solid ${NSD_COLORS.border.light}`,
          paddingBottom: '16px',
          marginBottom: '16px',
        }}>
          <MetricBlock 
            label="Organizations" 
            value={metrics.organizations} 
          />
          <MetricBlock 
            label="Contacts" 
            value={metrics.contacts} 
          />
          <MetricBlock 
            label="Leads" 
            value={metrics.leads} 
          />
          <MetricBlock 
            label="Conversion" 
            value={conversionRate !== null ? `${conversionRate.toFixed(1)}%` : '—'} 
            subValue="org → lead"
          />
        </div>

        {/* Email metrics if available */}
        {metrics.emailsSent > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            borderBottom: `1px solid ${NSD_COLORS.border.light}`,
            paddingBottom: '16px',
            marginBottom: '16px',
          }}>
            <MetricBlock 
              label="Emails Sent" 
              value={metrics.emailsSent} 
            />
            <MetricBlock 
              label="Opens" 
              value={metrics.opens ?? 0} 
              subValue={metrics.emailsSent > 0 ? `${((metrics.opens ?? 0) / metrics.emailsSent * 100).toFixed(1)}% rate` : undefined}
            />
            <MetricBlock 
              label="Replies" 
              value={metrics.replies ?? 0} 
              subValue={metrics.emailsSent > 0 ? `${((metrics.replies ?? 0) / metrics.emailsSent * 100).toFixed(1)}% rate` : undefined}
            />
          </div>
        )}

        {/* Footer info */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{
            fontSize: '12px',
            color: NSD_COLORS.text.muted,
          }}>
            {duration && (
              <span>Duration: {duration}</span>
            )}
            {duration && completedAt && <span> • </span>}
            {completedAt && (
              <span>Completed: {new Date(completedAt).toLocaleString()}</span>
            )}
          </div>
        </div>

        {/* Termination reason if applicable */}
        {terminationReason && (
          <div style={{
            marginTop: '16px',
            padding: '12px 16px',
            backgroundColor: NSD_COLORS.semantic.muted.bg,
            borderRadius: NSD_RADIUS.md,
          }}>
            <p style={{
              margin: 0,
              fontSize: '13px',
              color: NSD_COLORS.text.secondary,
            }}>
              <strong>Note:</strong> {terminationReason}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default CampaignOutcomeSummary;
